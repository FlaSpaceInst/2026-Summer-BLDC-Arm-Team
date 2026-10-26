"""Staged RE-RASSOR arm command protocol and safe ROS publisher coordinator.

This module has no hardware dependencies. It publishes commands; it cannot
confirm delivery by a serial forwarder or verify that a motor has stopped.
"""

import math
import threading
import time


# Byte values originate from the uploaded BLDC team's commands.h interface.
# The base uses a separate wheel/stepper Arduino; the deployed wheel sketch
# does not yet implement the base stepper bytes.
BYTES = {
    'plate_joint_action': {'POSITIVE': 0x0C, 'NEGATIVE': 0x0D, 'STOP': 0x0E},
    'shoulder_joint_action': {'POSITIVE': 0x0F, 'NEGATIVE': 0x10, 'STOP': 0x11},
    'forearm_joint_action': {'POSITIVE': 0x12, 'NEGATIVE': 0x13, 'STOP': 0x14},
    'end_effector_action': {'POSITIVE': 0x09, 'NEGATIVE': 0x0A, 'STOP': 0x0B},
}
ARM_ALL_STOP = 0x18
BASE_STOP = 0x0E
WHEEL_STOP = (0.0, 0.0)
BASE_FIELD = 'plate_joint_action'
ARM_FIELDS = tuple(BYTES)


class ArmInputError(ValueError):
    """Reject malformed commands before publishing to ROS."""


class ArmInterlockError(RuntimeError):
    """Movement is locked out following a watchdog timeout or ESTOP."""


class ArmRateLimitError(RuntimeError):
    """Movement commands arrived too quickly."""


def decode_arm_command(body):
    """Convert one joint action or exact four-joint STOP into destination bytes.

    Returns a tuple of (BLDC byte or None, base byte or None, is_movement).
    No implicit coercion or unknown fields are permitted.
    """
    if not isinstance(body, dict) or not body:
        raise ArmInputError('Expected a nonempty JSON object.')
    if set(body) == {'arm_all_stop'} and body['arm_all_stop'] is True:
        return ARM_ALL_STOP, BASE_STOP, False
    if set(body) == set(ARM_FIELDS) and all(body[k] == 'STOP' for k in ARM_FIELDS):
        return ARM_ALL_STOP, BASE_STOP, False
    if len(body) != 1:
        raise ArmInputError('Provide one joint action or an arm_all_stop request.')
    key, operation = next(iter(body.items()))
    if key not in BYTES or not isinstance(operation, str) or operation not in BYTES[key]:
        raise ArmInputError('Unknown joint or operation. Use POSITIVE, NEGATIVE, or STOP.')
    byte = BYTES[key][operation]
    if key == BASE_FIELD:
        return None, byte, operation != 'STOP'
    return byte, None, operation != 'STOP'


def is_arm_request(body):
    """Recognize arm-specific JSON without hijacking existing wheel requests."""
    return isinstance(body, dict) and any(k in body for k in (*ARM_FIELDS, 'arm_all_stop'))


class ArmCoordinator:
    """Publish two independent Arduino byte topics with an application watchdog.

    A ROS publish is NOT a hardware acknowledgement. Power-loss or process
    crash protection must be implemented on both microcontrollers too.
    """

    def __init__(self, bldc_publish, base_publish, wheel_stop_publish,
                 watchdog_ms=500, min_move_ms=100, now=None, timer_factory=None):
        if not isinstance(watchdog_ms, (int, float)) or not math.isfinite(watchdog_ms) or watchdog_ms <= 0:
            raise ValueError('watchdog_ms must be positive.')
        if not isinstance(min_move_ms, (int, float)) or not math.isfinite(min_move_ms) or min_move_ms < 0:
            raise ValueError('min_move_ms cannot be negative.')
        self.bldc_publish = bldc_publish
        self.base_publish = base_publish
        self.wheel_stop_publish = wheel_stop_publish
        self.watchdog_ms = watchdog_ms
        self.min_move_ms = min_move_ms
        self.now = now or time.monotonic
        self.timer_factory = timer_factory or threading.Timer
        self.lock = threading.RLock()
        self.timer = None
        self.generation = 0
        self.latched = False
        self.moving = set()
        self.last_movement_time = -float('inf')

    def _cancel_timer(self):
        self.generation += 1
        if self.timer is not None:
            self.timer.cancel()
            self.timer = None

    def _send_arm_stop(self):
        """Attempt both arm stops independently, even if one publish fails."""
        errors = []
        for publisher, byte in ((self.bldc_publish, ARM_ALL_STOP), (self.base_publish, BASE_STOP)):
            try:
                publisher(byte)
            except Exception as error:
                errors.append(error)
        if errors:
            raise RuntimeError('One or more ROS stop publications failed.') from errors[0]

    def _watchdog_callback(self, generation):
        with self.lock:
            if generation != self.generation or not self.moving:
                return
            self.latched = True
            self.moving.clear()
            self._cancel_timer()
            try:
                self._send_arm_stop()
            except RuntimeError:
                # Remain latched even if ROS publication fails.
                pass

    def _arm_watchdog(self):
        self._cancel_timer()
        if not self.moving:
            return
        generation = self.generation
        self.timer = self.timer_factory(self.watchdog_ms / 1000.0,
                                        lambda: self._watchdog_callback(generation))
        self.timer.start()

    def command(self, body):
        """Publish one validated command; return publication receipt only."""
        bldc_byte, base_byte, is_move = decode_arm_command(body)
        with self.lock:
            # Any explicit arm STOP should still be possible while latched.
            if self.latched and is_move:
                raise ArmInterlockError('Arm motion locked after ESTOP/watchdog. Do not rearm remotely.')
            now = self.now()
            if is_move and (now - self.last_movement_time) * 1000.0 < self.min_move_ms:
                raise ArmRateLimitError('Arm movement command rate limit exceeded.')
            # Track only the actual stopped or moving joint, not a guessed hardware state.
            try:
                if bldc_byte == ARM_ALL_STOP and base_byte == BASE_STOP:
                    self._cancel_timer()
                    self.moving.clear()
                    self._send_arm_stop()
                else:
                    key = next(iter(body))
                    if bldc_byte is not None:
                        self.bldc_publish(bldc_byte)
                    if base_byte is not None:
                        self.base_publish(base_byte)
                    if is_move:
                        self.moving.add(key)
                        self.last_movement_time = now
                    else:
                        self.moving.discard(key)
                    self._arm_watchdog()
            except Exception:
                self.latched = True
                self._cancel_timer()
                self.moving.clear()
                try:
                    self._send_arm_stop()
                except RuntimeError:
                    pass
                raise
            return {'published': True, 'hardware_acknowledged': False, 'latched': self.latched}

    def emergency_stop(self):
        """Latch control, issue independent arm stops and a wheel STOP message."""
        with self.lock:
            self.latched = True
            self._cancel_timer()
            self.moving.clear()
            errors = []
            try:
                self._send_arm_stop()
            except Exception as error:
                errors.append(error)
            try:
                self.wheel_stop_publish()
            except Exception as error:
                errors.append(error)
            if errors:
                raise RuntimeError('ESTOP publication incomplete.') from errors[0]
            return {'published': True, 'hardware_acknowledged': False, 'latched': True}

    def status(self):
        with self.lock:
            return {'latched': self.latched, 'moving_joint_count': len(self.moving),
                    'watchdog_ms': self.watchdog_ms,
                    'hardware_acknowledged': False}

    def close(self):
        with self.lock:
            self._cancel_timer()
