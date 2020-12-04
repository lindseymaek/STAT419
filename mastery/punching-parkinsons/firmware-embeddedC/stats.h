#include <stdint.h>
#include <stdlib.h>
#include "fixed_point.h"
#include "array.h"

#ifndef _STATS_
#define _STATS_

#ifndef TYPE
#define TYPE fixedpt
#endif

uint32_t get_random_number(uint32_t min, uint32_t max);
uint32_t set_random_seed(uint32_t seed);

//Assume sorted array
TYPE median(TYPE array[], uint64_t size);

//Lower Quartile
//Assume sorted array
TYPE Q1(TYPE array[], uint64_t size);

//Upper Quartile
//Assume sorted array
TYPE Q3(TYPE array[], uint64_t size);

//Median average deviation
//median of differences between points and median
//Assume sorted array
TYPE MAD(TYPE array[], uint64_t size, TYPE median_val);

TYPE slope(TYPE y2, TYPE y1, TYPE x2, TYPE x1);

//Standard Deviation
// TYPE meanSD(ring_buffer *array, uint8_t size);
#endif