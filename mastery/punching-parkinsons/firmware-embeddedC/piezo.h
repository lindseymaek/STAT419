#include "hal_gpio.h"
#include "target.h"
#include "fixed_point.h"
#include "array.h"
#include "stats.h"

/*
#define PUNCHPAD_UPDATE_MS 50
#define PUNCHPAD_MIN_TIMEOUT_MS 4000
#define PUNCHPAD_DATA_STREAM_MS 500
#define NUM_PUNCHPADS 9
*/

#ifndef _PIEZO_H_
#define _PIEZO_H_

#define PZ_MAX_VOLTAGE	fixedpt_rconst(3.3)
#define PZ_INITIAL_VOLTAGE	fixedpt_rconst(3.3 / 2)
#define PZ_STACK_SIZE 32
#define PZ_SMALL_STACK_SIZE 8
#define PZ_LOOKAHEAD_NUMBER 5

#define PZ_FORCE_TIME_RESET 120	// this is seconds, it is less than 127 (2^7), so can play in fixedpt
#define PZ_FORCE_TIME_ROLLBACK 2	// this is in seconds, we roll-back and update the tstack


#define PZ_LOG_INIT 1   		// let's log init, scan cycles
#define PZ_LOG_RAW 0				// let's log raw data
#define PZ_LOG_STRIKES 1		// let's log strike-data ... 

#define PZ_READINGS_BEFORE_SWITCH			5 		// read 2x, switch
#define PZ_ADC_BITS 16											// ??
#define PZ_ADC_MAX 65536										// to convert to fixedpt
#define PZ_SWITCH_SETTLE_DELAY_MICROS 30		// one microsecond is about 3 raw readings at maximum raw read ...
																						// 100 micros times 9 switches is about 1 millisecond lossed for switching																	

// we SAMPLE_16   in adc.c
// #define ADC_SAMPLING_RATE        ADC_AVGCTRL_SAMPLENUM_16

typedef enum {
    STATE_DEFAULT = 0,
    STATE_IS_LEVEL = 1,
    STATE_FIND_EXTREME = 2,
		STATE_EXTREME_IS_SLOWING = 3,
		STATE_EXTREME_FINAL_LOOK_AHEAD = 4,
		STATE_EXTREME_HAS_BEEN_FOUND = 5,
		STATE_FAST_STRIKE = 9
} strike_states;

extern uint8_t current_select;

void piezo_init(G_pin** S,G_pin** V);
void piezo_select(uint8_t idx, uint32_t delay_micros);

void piezo_update_voltage(uint8_t s, uint8_t v, fixedpt value);
void piezo_update_voltage_tolerances(uint8_t s, uint8_t v);
void piezo_scan_init(void);

void piezo_scan(void);
void piezo_simple_scan(void);
void piezo_log(void);

fixedpt piezo_time(void);

void piezo_strike_detection(fixedpt myTime, fixedpt myVoltage);
void piezo_check_fast_strike(uint8_t s,uint8_t v);
bool piezo_boolean_sign(fixedpt value);

void piezo_update_current_previous(void);
	
void piezo_fill_stack(void);

void piezo_record_punch_if_valid(uint8_t s,uint8_t v);
void piezo_reset_values(uint8_t s,uint8_t v);

#endif