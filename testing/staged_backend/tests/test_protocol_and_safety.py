"""Deterministic safety and protocol tests, without importing ROS or Flask."""
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'controller/source'))
sys.path.insert(0, str(ROOT / 'forwarders'))

from ezrassor_controller_server.arm_integration import (
    ArmCoordinator, ArmInputError, ArmInterlockError, ArmRateLimitError,
    ARM_ALL_STOP, BASE_STOP, BYTES, decode_arm_command, is_arm_request,
)
from byte_serial import BLDC_ALLOWED, BASE_ALLOWED, SerialByteWriter


class Clock:
    def __init__(self):
        self.current = 10.0

    def __call__(self):
        return self.current


class Timer:
    def __init__(self, interval, callback):
        self.interval = interval
        self.callback = callback
        self.started = False
        self.cancelled = False

    def start(self):
        self.started = True

    def cancel(self):
        self.cancelled = True

    def fire(self):
        self.callback()


@pytest.fixture
def coordinator():
    events = []
    timers = []
    clock = Clock()

    def timer_factory(interval, callback):
        timer = Timer(interval, callback)
        timers.append(timer)
        return timer

    ctrl = ArmCoordinator(
        lambda byte: events.append(('bldc', byte)),
        lambda byte: events.append(('base', byte)),
        lambda: events.append(('wheels', 0)),
        now=clock, timer_factory=timer_factory,
    )
    return ctrl, events, timers, clock


@pytest.mark.parametrize('field', BYTES)
@pytest.mark.parametrize('operation', ['POSITIVE', 'NEGATIVE', 'STOP'])
def test_every_joint_operation_maps_to_correct_destination(field, operation):
    bldc, base, movement = decode_arm_command({field: operation})
    expected = BYTES[field][operation]
    if field == 'plate_joint_action':
        assert bldc is None and base == expected
    else:
        assert bldc == expected and base is None
    assert movement is (operation != 'STOP')


@pytest.mark.parametrize('payload', [
    {'arm_all_stop': True},
    {k: 'STOP' for k in BYTES},
])
def test_all_stop_exact_format(payload):
    assert decode_arm_command(payload) == (ARM_ALL_STOP, BASE_STOP, False)


@pytest.mark.parametrize('bad', [
    None, [], '', {}, {'x': 'STOP'}, {'arm_all_stop': False},
    {'plate_joint_action': 'FORWARD'}, {'forearm_joint_action': None},
    {'shoulder_joint_action': 1}, {'end_effector_action': 'positive'},
    {'plate_joint_action': 'POSITIVE', 'shoulder_joint_action': 'NEGATIVE'},
    {'arm_all_stop': True, 'wheel_action': {}},
    {'plate_joint_action': 'STOP', 'shoulder_joint_action': 'STOP'},
    {**{k: 'STOP' for k in BYTES}, 'extra': True},
])
def test_invalid_payload_is_rejected_before_ros_publish(bad):
    with pytest.raises(ArmInputError):
        decode_arm_command(bad)


def test_arm_routing_does_not_consume_legacy_wheel_requests():
    assert not is_arm_request({'wheel_action': {'linear_x': 1, 'angular_z': 0}})
    assert is_arm_request({'shoulder_joint_action': 'STOP'})


def test_movement_creates_watchdog_and_joint_stop_cancels_it(coordinator):
    ctrl, events, timers, clock = coordinator
    assert ctrl.command({'plate_joint_action': 'POSITIVE'})['published']
    assert events == [('base', 0x0C)]
    assert timers[-1].started and timers[-1].interval == 0.5
    clock.current += 0.2
    ctrl.command({'plate_joint_action': 'STOP'})
    assert timers[-1].cancelled
    assert ctrl.status()['moving_joint_count'] == 0
    assert events[-1] == ('base', BASE_STOP)


def test_watchdog_sends_both_stops_and_latches(coordinator):
    ctrl, events, timers, clock = coordinator
    ctrl.command({'shoulder_joint_action': 'POSITIVE'})
    timers[-1].fire()
    assert events[-2:] == [('bldc', ARM_ALL_STOP), ('base', BASE_STOP)]
    assert ctrl.status()['latched']
    with pytest.raises(ArmInterlockError):
        ctrl.command({'forearm_joint_action': 'POSITIVE'})
    ctrl.command({'arm_all_stop': True})
    assert events[-2:] == [('bldc', ARM_ALL_STOP), ('base', BASE_STOP)]


def test_stale_cancelled_timer_cannot_override_newer_timer(coordinator):
    ctrl, events, timers, clock = coordinator
    ctrl.command({'shoulder_joint_action': 'POSITIVE'})
    old = timers[-1]
    clock.current += .2
    ctrl.command({'shoulder_joint_action': 'POSITIVE'})
    assert old.cancelled
    old.fire()
    assert not ctrl.status()['latched']
    assert events == [('bldc', 0x0F), ('bldc', 0x0F)]
    timers[-1].fire()
    assert ctrl.status()['latched']


def test_rate_limit_does_not_block_stop(coordinator):
    ctrl, events, timers, clock = coordinator
    ctrl.command({'plate_joint_action': 'POSITIVE'})
    with pytest.raises(ArmRateLimitError):
        ctrl.command({'forearm_joint_action': 'POSITIVE'})
    ctrl.command({'plate_joint_action': 'STOP'})
    assert events == [('base', 0x0C), ('base', 0x0E)]


def test_emergency_stop_stops_both_arm_paths_and_wheels(coordinator):
    ctrl, events, timers, clock = coordinator
    ctrl.command({'plate_joint_action': 'NEGATIVE'})
    reply = ctrl.emergency_stop()
    assert reply == {'published': True, 'hardware_acknowledged': False, 'latched': True}
    assert events[-3:] == [('bldc', 0x18), ('base', 0x0E), ('wheels', 0)]
    with pytest.raises(ArmInterlockError):
        ctrl.command({'end_effector_action': 'POSITIVE'})


def test_partial_stop_publish_failure_attempts_remaining_destinations():
    sent = []

    def bad_publish(_):
        raise OSError('offline')

    ctrl = ArmCoordinator(bad_publish, lambda b: sent.append(('base', b)),
                          lambda: sent.append(('wheels', 0)))
    with pytest.raises(RuntimeError):
        ctrl.emergency_stop()
    assert sent == [('base', BASE_STOP), ('wheels', 0)]
    assert ctrl.status()['latched']


def test_command_publish_failure_latches_and_attempts_both_stop_paths():
    sent = []

    def fail_nonstop(byte):
        if byte != ARM_ALL_STOP:
            raise OSError('offline')
        sent.append(('bldc', byte))

    ctrl = ArmCoordinator(fail_nonstop, lambda b: sent.append(('base', b)), lambda: None)
    with pytest.raises(OSError):
        ctrl.command({'end_effector_action': 'POSITIVE'})
    assert sent == [('bldc', ARM_ALL_STOP), ('base', BASE_STOP)]
    assert ctrl.status()['latched']


class SerialPort:
    def __init__(self):
        self.is_open = True
        self.bytes = []
        self.count_override = None

    def write(self, packet):
        self.bytes.append(bytes(packet))
        if self.count_override is not None:
            return self.count_override
        return len(packet)


@pytest.mark.parametrize('port_type,allowed,disallowed', [
    ('bldc', BLDC_ALLOWED, BASE_ALLOWED),
    ('base', BASE_ALLOWED, BLDC_ALLOWED),
])
def test_serial_allowlist_and_ownership(port_type, allowed, disallowed):
    device = SerialPort()
    writer = SerialByteWriter(device, allowed)
    for byte in sorted(allowed):
        assert writer.write(byte) == byte
    count = len(device.bytes)
    for byte in disallowed:
        with pytest.raises(ValueError):
            writer.write(byte)
    for bad in (-1, 256, '14', 14.0, True):
        with pytest.raises(ValueError):
            writer.write(bad)
    assert len(device.bytes) == count


def test_serial_disconnected_and_partial_write():
    device = SerialPort()
    writer = SerialByteWriter(device, BLDC_ALLOWED)
    device.is_open = False
    with pytest.raises(ConnectionError):
        writer.write(0x18)
    device.is_open = True
    device.count_override = 0
    with pytest.raises(IOError):
        writer.write(0x18)
