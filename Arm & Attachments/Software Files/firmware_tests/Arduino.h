#pragma once
#define LOW 0
#define HIGH 1
#define OUTPUT 1
#define DEC 10
void pinMode(int pin, int mode);
void digitalWrite(int pin, int value);
unsigned long micros();
struct SerialSimulator {
    void print(const char *) {}
    void println(unsigned long, int) {}
};
extern SerialSimulator Serial;
