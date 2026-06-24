#include <Arduino.h>
class DRV8825
{
private:
    unsigned short _step_pin;
    unsigned short _dir_pin;
    unsigned short _enable_pin;

    long _position;
    bool _direction;
    long _steps_per_revolution;
    bool _enabled;
    bool _invert_dir;

    bool _current_state = LOW;

    unsigned long _step_delay = 1000;
    unsigned long _last_step_time = 0;

public:
    void set_speed(long rpm);
    void update();
    DRV8825(unsigned short step_pin, unsigned short dir_pin, unsigned short enable_pin, long steps_per_revolution, bool invert_dir=false);
    void set_direction(bool direction);
    bool get_direction();
    long get_position();
    void set_enabled(bool enabled);
    bool get_enabled();
};