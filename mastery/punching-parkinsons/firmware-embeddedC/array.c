#include "array.h"

/*associate a ring buffer with a physical array */
void associate(ring_buffer* overlay, TYPE* buffer, uint64_t size)
{
	overlay->head = buffer;
	overlay->tail = buffer;
	overlay->start = buffer;
	overlay->end = buffer + (size - 1);
	overlay->fp = 0;
	overlay->length = 0;
	overlay->isFull = false;
}

/* shift out a value from the beginning of a ring buffer */
TYPE shift(ring_buffer* array)
{
	TYPE val;
	uint8_t i;
	if(array->length != 0)
	{
		val = *(array->head);
		array->head = (array->head == array->end) ? (array->head)++ : array->start;	
		(array->length)--;
		if(array->length == 0)
		{
			array->isFull = false;
		}
	}
	
	return val;
}

/* push a value onto the end of a ring buffer */
void push(ring_buffer* array, TYPE val)
{
	uint64_t max = array->end - array->start;		
	if(array->isFull)
	{
		shift(array);
	}
	array->tail = (array->tail == array->end) ? (array->tail)++ : array->start;	
	*(array->tail) = val;
	if(array->length == max)
	{
		array->isFull = true;
	}
}

/* Sort array in either increasing or decreasing order and store into another array */
void copy_sort(TYPE to_sort[], TYPE array[], uint8_t size, bool decreasingOrder)
{
	uint8_t i, j;
	TYPE val; 
	
	for (i = 0; i < size; i++)
	{
		to_sort[i] = array[i];
	}
	
	for(i = 1; i < size; i++)
	{
		val = to_sort[i];
		j = i - 1;
		
		if(decreasingOrder)
		{
			while( j >= 0 && to_sort[j] > val)
			{
				to_sort[j+1] = to_sort[j];
				j = j - 1;
			}
		}
		else
		{
			while( j >= 0 && to_sort[j] < val)
			{
				to_sort[j+1] = to_sort[j];
				j = j - 1;
			}
		}
		to_sort[j+1] = val;
	}
}

/*Get extrema from array pointed at by ring_buffer (assuming full/initialized array) */
TYPE get_extreme(ring_buffer *queue, bool look_for_min)
{
	TYPE extreme_val = *(queue->start);
	
	if(look_for_min)
	{
			for (TYPE *start = queue->start; start <= queue->end; start++)
			{
				extreme_val = (extreme_val < *start) ? extreme_val : *start;
			}
	}
	else
	{
			for (TYPE *start = queue->start; start <= queue->end; start++)
			{
				extreme_val = (extreme_val > *start) ? extreme_val : *start;
			}
	}
	
	return extreme_val;
}

/* Get index of a given value from array pointed at by ring_buffer. 
Returns first matching value, either from the beginning or end. UINT64_MAX is returned 
as a false value */
uint64_t get_index(ring_buffer *queue, TYPE value, bool reverse, bool *found)
{
	uint64_t index;
	
	if(queue->length == 0)
	{
		*found = false;
		return UINT64_MAX;
	}
	
	if(reverse)
	{
			index = queue->length - 1;
			TYPE *tail = queue->tail; 
			while(tail != queue->head || index != UINT64_MAX)
			{
				if(*(tail) == value)
				{
					*(found) = true;
					return index;
				}
				tail = (tail == queue->start) ? queue->end : tail--;
				index--;
			}
			*(found) = false;
			return index;
	}
	else
	{
		index = 0;
		TYPE *head = queue->head;
		while(head != queue->tail || index != UINT64_MAX)
		{
			if(*(head) == value)
			{
				*(found) = true;
				return index;
			}
			head = (head == queue->end) ? queue->start : head++;
			index++;
		}
		*(found) = false;
		return index;
	}
}

/* get a value from array pointed at by ring_buffer by indexing, 
similar to an actual array. Assumes values out of bounds refer to last element */
TYPE get(ring_buffer *queue, uint64_t index)
{
		if(index >= queue->length)
		{
			return *((queue->tail) - 1);
		}
		else if ( ((queue->head) + index) > queue->end )
		{
			return *((queue->tail) - ((queue->length) - index));
		}
		else
		{
			return *((queue->head) + index);
		}
}

/* set a value from array pointed at by ring_buffer by indexing, 
similar to an actual array. Assumes values out of bounds refer to last element */
void set(ring_buffer *queue, uint64_t index, TYPE value)
{
	if(index >= queue->length)
	{
		*((queue->tail) - 1) = value;
	}
	else if ( ((queue->head) + index) > queue->end )
	{
		*((queue->tail) - ((queue->length) - index)) = value;
	}
	else
	{
		*((queue->head) + index) = value;
	}
}

ring_buffer slice(ring_buffer *overlay, uint64_t start, uint64_t end)
{
	ring_buffer new_slice = {0,0,0,0,0,0,false};
	if(start >= overlay->length || end > overlay->length || start == end)
	{
		return new_slice;
	}
	
	new_slice.start = overlay->start;
	new_slice.end = overlay->end;
	new_slice.fp = 0;
	new_slice.length = end - start;
	new_slice.head = ((overlay->head + start) > overlay->end) ? overlay->tail - (overlay->length - start) : (overlay->head + start);
	new_slice.tail = ((overlay->tail - (overlay->length - end)) < overlay->start) ?  overlay->head + end : (overlay->tail - (overlay->length - end));
	
	return new_slice;
}

void reset_array(ring_buffer *overlay)
{
	for(overlay->fp = overlay->start; overlay->fp <= overlay->end; (overlay->fp)++ )
	{
		*(overlay->fp) = 0;
	}
	overlay->head = overlay->start;
	overlay->tail = overlay->start;
	overlay->length = 0;
	overlay->isFull = false;
}