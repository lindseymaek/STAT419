#include "stats.h"

/*  MONTE includes basic random */

uint32_t get_random_number(uint32_t min, uint32_t max)
	{
	return min + rand()%((max+1)-min);	
	}

uint32_t set_random_seed(uint32_t seed)
	{
	srand(seed);  // srand( rtc_micros() );
	}

//Assume sorted array
TYPE median(TYPE array[], uint64_t size)
{
	if(size % 2 == 0)
	{
		return fixedpt_div(array[size / 2] + array[(size / 2) - 1], 2);
	}
	else
	{
		return array[size / 2];
	}
}

//Lower Quartile
//Assume sorted array
TYPE Q1(TYPE array[], uint64_t size)
{
	TYPE subarray [size / 2];
	
	for(uint64_t i = 0; i < size / 2; i++)
	{
		subarray[i] = array[i];
	}
	
	return median(subarray, size / 2);

}

//Upper Quartile
//Assume sorted array
TYPE Q3(TYPE array[], uint64_t size)
{
	TYPE subarray [size/2];
	
	for(uint64_t i = (size / 2) + 1, j = 0; i < size; i++, j++)
	{
		subarray[j] = array[i];
	}
	
	return median(subarray, size / 2);
}

//Median average deviation
//median of differences between points and median
//Assume sorted array
TYPE MAD(TYPE array[], uint64_t size, TYPE median_val)
{
	TYPE MAD_array [size];
	
	for (uint64_t i = 0; i < size ; i++)
	{
		MAD_array[i] = abs(median_val - array[i]);
	}

	return median(MAD_array, size);
}

TYPE slope(TYPE y2, TYPE y1, TYPE x2, TYPE x1)
{
	return fixedpt_div(y2 - y1,x2 - x1);
}

/*
//Standard Deviation
fixedpt meanSD(TYPE array[], uint64_t size,, uint64_t size)
{
	int32_t sum = 0; 
	int64_t sum2 = 0;
	uint64_t i;
	
	if(size < 2)
	{
		return 0;
	}
	
	for (i = 0; i < size; i++)
	{
		sum += array[i];
		sum2 += array[i]*array[i]; 
	}
	
	return fixedpt_sqrt((sum2 - (sum * sum) / size ) / (size - 1) );
}
*/