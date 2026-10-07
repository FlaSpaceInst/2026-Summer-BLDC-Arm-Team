#include <Arduino.h>
#include "controlfoc.h"

// Conversion factor: 60 / (2 * PI) = 9.5492965855137
// Precomputed as a literal to avoid the division at runtime.
/*
converts radians per second to RPM
*/
float radstoRPM(float rads)
{
  // multiple by a static factor for performance
  return rads * (float)9.5492965855137;
}

float RPMtoRads(float rpm)
{
  // divide by a static factor for performance
  return rpm / (float)9.5492965855137;
}

/*
contains the input within the upper and lower bounds
note: for some reason constrain() is really slow
*/
int clamp(int input, int min, int max)
{
  return max(min(input, max), min); 
  // if(input < min)
  // {
  //   return min;
  // }
  // else if(input > max)
  // {
  //   return max;
  // }
  // return input;
}