#include <stdint.h>
#include <stdbool.h>
#include "fixed_point.h"

#ifndef _ARRAY_
#define _ARRAY_

#define TYPE fixedpt

typedef struct 
{ 
	TYPE *head;
	TYPE *tail;
	TYPE *start;
	TYPE *end;
	TYPE *fp;
	uint64_t length;  // this is "populated" length, memcpy has allocated a sizeof
	bool isFull;
} ring_buffer; 

void associate(ring_buffer *overlay, TYPE *buffer, uint64_t max);
TYPE shift(ring_buffer *queue); 
void push(ring_buffer *queue, TYPE val);
void copy_sort(TYPE to_sort[], TYPE array[], uint8_t size, bool decreasingOrder);
TYPE get_extreme(ring_buffer *queue, bool look_for_min);
uint64_t get_index(ring_buffer *queue, TYPE value, bool reverse, bool *found);
TYPE get(ring_buffer *queue, uint64_t index);
void set(ring_buffer *queue, uint64_t index, TYPE value);
ring_buffer slice(ring_buffer *overlay, uint64_t start, uint64_t end);
void reset_array(ring_buffer *overlay);

// get_max_of_array		// get_index_from_array_reverse (arr,value_searching);
// get_min_of_array		// find "most_recent" min or max
// reset array

// slice function ... 

/*
//generic version (WIP)
typedef struct 
{ 
	void* array; 
	uint64_t max; 
	uint64_t end;
	uint8_t elem_size; 	
	bool isEmpty; 
	
} ring_buffer; 

void associate(ring_buffer* overlay, void* buffer, uint64_t size, uint8_t elem_size); 
void shift(void* val, ring_buffer* queue); 
void push(ring_buffer* queue, int16_t val);
void copy_sort(int16_t sorted[], int16_t array[], uint8_t size);
// copy_reverse
*/

#endif