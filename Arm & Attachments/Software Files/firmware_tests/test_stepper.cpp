#include <cassert>
#include <iostream>
#include "DRV8825.h"

SerialSimulator Serial;
static unsigned long fakeMicros = 0;
static int stepPin = 2;
static int highPulses = 0;
void pinMode(int, int) {}
void digitalWrite(int pin, int value)
{
    if (pin == stepPin && value == HIGH) {
        highPulses++;
    }
}
unsigned long micros()
{
    fakeMicros += 10000;
    return fakeMicros;
}

int main()
{
    DRV8825 motor(2, 3, 4, 200);
    motor.set_enabled(true);
    motor.set_speed(0);
    for (int i = 0; i < 100; i++) {
        motor.update();
    }
    assert(highPulses == 0);
    motor.set_speed(40);
    for (int i = 0; i < 100; i++) {
        motor.update();
    }
    assert(highPulses > 0);
    motor.set_speed(0);
    int lastPulses = highPulses;
    for (int i = 0; i < 100; i++) {
        motor.update();
    }
    assert(highPulses == lastPulses);
    motor.set_speed(-5);
    for (int i = 0; i < 100; i++) {
        motor.update();
    }
    assert(highPulses == lastPulses);
    std::cout << "PASS: non-positive speed stops STEP pulses\n";
}
