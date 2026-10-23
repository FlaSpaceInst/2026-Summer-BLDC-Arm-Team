#include "DRV8825.h"

DRV8825::DRV8825(unsigned short step_pin, unsigned short dir_pin, unsigned short enable_pin, long steps_per_revolution, bool invert_dir)
{
    _step_pin = step_pin;
    _dir_pin = dir_pin;
    _enable_pin = enable_pin;
    _steps_per_revolution = steps_per_revolution;
    _position = 0;
    _direction = true;
    _current_state = LOW;
    _invert_dir = invert_dir;
    // a good safe default (will be overwritten by set_speed)
    _step_delay = 2000;
    pinMode(_step_pin, OUTPUT);
    pinMode(_dir_pin, OUTPUT);
    pinMode(_enable_pin, OUTPUT);
    set_enabled(false);
    set_direction(true);
    // set_speed(60);
}
#define US_IN_SEC 1000000
#define US_IN_MIN 60000000
void DRV8825::set_speed(long rpm)
{
    // _step_delay is in us
    _step_delay = US_IN_MIN / (rpm * _steps_per_revolution);
    _step_delay *= (6.0 / 7);
    // _step_delay = 2000/32;
    Serial.print("step delay: ");
    Serial.println(_step_delay, DEC);
}

void DRV8825::update()
{
    long m = micros();
    if (m - _last_step_time >= _step_delay)
    {
        _last_step_time = m;
        if (_enabled)
        {
            digitalWrite(_step_pin, _current_state);
            if (_current_state == HIGH)
            {
                _current_state = LOW;
                if (_direction)
                {
                    _position++;
                }
                else
                {
                    _position--;
                }
            }else{
                _current_state = HIGH;
            }
        }
    }
}

void DRV8825::set_direction(bool direction)
{
    _direction = direction;
    digitalWrite(_dir_pin, !_direction ^ _invert_dir);
}

bool DRV8825::get_direction()
{
    return _direction;
}

long DRV8825::get_position()
{
    return _position;
}

void DRV8825::set_enabled(bool enabled)
{
    _enabled = enabled;
    digitalWrite(_enable_pin, !_enabled);
}

bool DRV8825::get_enabled()
{
    return _enabled;
}
