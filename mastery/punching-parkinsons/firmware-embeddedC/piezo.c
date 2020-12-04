#include <time.h>
#include "FatFs/ff.h"
#include "rtc.h"

#include "printf.h"



#include "target.h"
#include "adc.h"
#include "lcd_2004.h"
#include "rtc.h"
#include "buzzer.h"
#include "usb_main.h"

#include "debug.h"
#include "color.h"
#include "sound.h"
#include "led_sk6812.h"

#include "fixed_point.h"
#include "piezo.h"

G_pin** SELECT;
G_pin** VOLTAGES;

static uint32_t true_number[5] = {1,2,8,4,7};
static uint32_t colors[3] = {0xff000000, 0x00ff0000, 0x0000ff00};
static uint8_t color_index = 0;

// word-wrap nazis:  http://www.onarm.com/forum/17377/

/*  MANUALLY SAMPLE and COMPUTE MEDIAN */

//static fixedpt sampling_stack[NUM_PUNCHPADS][NUM_VOLTAGES][ADC_SWITCHED_SAMPLE_NUM];
//static fixedpt sampling_stack_recent_value[NUM_PUNCHPADS][NUM_VOLTAGES]; 

uint8_t current_select = 0;												// current switch value  0...8
static uint8_t current_select_number_readings = 0;

static uint8_t current_vselect = 0;												// current voltage index  0...2

static uint16_t pz_readings_before_switch = PZ_READINGS_BEFORE_SWITCH;

#define PZ_READINGS_BEFORE_LCD			11 		// show values less often [modulus]



static uint16_t pz_readings_before_LCD = 0;
static uint16_t pz_v2_max = 0;  // high gain ...

static fixedpt pz_simple_v2_max = fixedpt_rconst(2.2);
				
	



/* STRIKE DYNAMICS */

static fixedpt pz_initial_voltage[NUM_PUNCHPADS][NUM_VOLTAGES] = {PZ_INITIAL_VOLTAGE,PZ_INITIAL_VOLTAGE,PZ_INITIAL_VOLTAGE};
static fixedpt pz_strike_voltage[NUM_PUNCHPADS][NUM_VOLTAGES] = {PZ_INITIAL_VOLTAGE,PZ_INITIAL_VOLTAGE,PZ_INITIAL_VOLTAGE};

// initial ... when first loading
static fixedpt pz_initial_voltage_tolerance[NUM_PUNCHPADS][NUM_VOLTAGES] = {fixedpt_rconst(0.05),fixedpt_rconst(0.05),fixedpt_rconst(0.05)};
// tolerance is percent, tol is for min and max
static fixedpt pz_initial_voltage_tol_min[NUM_PUNCHPADS][NUM_VOLTAGES]= {0,0,0};
static fixedpt pz_initial_voltage_tol_max[NUM_PUNCHPADS][NUM_VOLTAGES]= {0,0,0};
// strike ... when looping through strikes ... 
// if we discovered a potential 'strike" it has to be greater than this percentange
// delta_v / V_0

static fixedpt pz_strike_voltage_tolerance[NUM_PUNCHPADS][NUM_VOLTAGES] = {fixedpt_rconst(0.03),fixedpt_rconst(0.03),fixedpt_rconst(0.03)};
// tolerance is percent, tol is for min and max
static fixedpt pz_strike_voltage_tol_min[NUM_PUNCHPADS][NUM_VOLTAGES]= {0,0,0};
static fixedpt pz_strike_voltage_tol_max[NUM_PUNCHPADS][NUM_VOLTAGES]= {0,0,0};

static fixedpt pz_MAD_tolerance[NUM_PUNCHPADS][NUM_VOLTAGES] = {fixedpt_rconst(0.005),fixedpt_rconst(0.005),fixedpt_rconst(0.005)};
static fixedpt pz_small_MAD_tolerance[NUM_PUNCHPADS][NUM_VOLTAGES] = {fixedpt_rconst(0.03),fixedpt_rconst(0.03),fixedpt_rconst(0.03)};

static fixedpt pz_slope_tolerance[NUM_PUNCHPADS][NUM_VOLTAGES] = {fixedpt_rconst(0.75),fixedpt_rconst(0.75),fixedpt_rconst(0.75)};
static fixedpt pz_small_slope_tolerance[NUM_PUNCHPADS][NUM_VOLTAGES] = {fixedpt_rconst(4),fixedpt_rconst(4),fixedpt_rconst(4)};

static uint8_t pz_stack_size[NUM_PUNCHPADS][NUM_VOLTAGES] = {PZ_STACK_SIZE,PZ_STACK_SIZE,PZ_STACK_SIZE}; 
static uint8_t pz_small_stack_size[NUM_PUNCHPADS][NUM_VOLTAGES] = {PZ_SMALL_STACK_SIZE,PZ_SMALL_STACK_SIZE,PZ_SMALL_STACK_SIZE}; 


static uint8_t pz_current_state[NUM_PUNCHPADS][NUM_VOLTAGES] = {0,0,0}; 	
//static uint8_t pz_current_stacksize[NUM_PUNCHPADS][NUM_VOLTAGES] = {0,0,0};


static fixedpt pz_current_voltage[NUM_PUNCHPADS][NUM_VOLTAGES] = {PZ_INITIAL_VOLTAGE,PZ_INITIAL_VOLTAGE,PZ_INITIAL_VOLTAGE}; 	
static fixedpt pz_previous_voltage[NUM_PUNCHPADS][NUM_VOLTAGES] = {0,0,0}; 

static uint32_t pz_current_time_overflow_seconds[NUM_PUNCHPADS][NUM_VOLTAGES] = {0,0,0};   


static fixedpt pz_current_time[NUM_PUNCHPADS][NUM_VOLTAGES] = {0,0,0};   // using micros? 	
static fixedpt pz_previous_time[NUM_PUNCHPADS][NUM_VOLTAGES] = {0,0,0};  // we need to do a loop around every 2 minutes (127 seconds) because of overflow

//these is normal arrays 
static fixedpt pz_v[NUM_PUNCHPADS][NUM_VOLTAGES][PZ_STACK_SIZE]= {0,0,0};  
static fixedpt pz_t[NUM_PUNCHPADS][NUM_VOLTAGES][PZ_STACK_SIZE]= {0,0,0}; 

//these are ring_buffers of the normal arrays
static ring_buffer pz_vstack[NUM_PUNCHPADS][NUM_VOLTAGES];
static ring_buffer pz_tstack[NUM_PUNCHPADS][NUM_VOLTAGES];

//static fixedpt pz_small_vstack[NUM_PUNCHPADS][NUM_VOLTAGES][PZ_STACK_SIZE]= {0,0,0};  
//static fixedpt pz_small_tstack[NUM_PUNCHPADS][NUM_VOLTAGES][PZ_STACK_SIZE]= {0,0,0};

static fixedpt pz_slope[NUM_PUNCHPADS][NUM_VOLTAGES]= {0,0,0};
static fixedpt pz_small_slope[NUM_PUNCHPADS][NUM_VOLTAGES]= {0,0,0};

static int8_t pz_slope_sign[NUM_PUNCHPADS][NUM_VOLTAGES]= {0,0,0};				// -1 is negative, 1 is positive ?
static int8_t pz_small_slope_sign[NUM_PUNCHPADS][NUM_VOLTAGES]= {0,0,0};	// -1 is negative, 1 is positive ?

static fixedpt pz_median[NUM_PUNCHPADS][NUM_VOLTAGES]= {0,0,0};
static fixedpt pz_MAD[NUM_PUNCHPADS][NUM_VOLTAGES]= {0,0,0};
static fixedpt pz_small_median[NUM_PUNCHPADS][NUM_VOLTAGES]= {0,0,0};
static fixedpt pz_small_MAD[NUM_PUNCHPADS][NUM_VOLTAGES]= {0,0,0};

static bool pz_seek_min_or_max[NUM_PUNCHPADS][NUM_VOLTAGES]= {0,0,0};  // 0 is min, 1 is max ?
																																				// // max is 1, min is 0


static bool pz_is_current_voltage_in_range_of_initial_voltage[NUM_PUNCHPADS][NUM_VOLTAGES]= {0,0,0};
// old voltage is strike V_0 after a strike occurs, tolerance applied creates this boolean
static bool pz_is_current_voltage_in_range_of_strike_voltage[NUM_PUNCHPADS][NUM_VOLTAGES]= {0,0,0}; 

static bool pz_is_current_voltage_strike_test_basic[NUM_PUNCHPADS][NUM_VOLTAGES]= {0,0,0}; 
static bool pz_is_current_voltage_strike_test_fast[NUM_PUNCHPADS][NUM_VOLTAGES]= {0,0,0}; 

static fixedpt pz_t_0[NUM_PUNCHPADS][NUM_VOLTAGES]= {0,0,0};
static fixedpt pz_t_f[NUM_PUNCHPADS][NUM_VOLTAGES]= {0,0,0};

static fixedpt pz_V_0[NUM_PUNCHPADS][NUM_VOLTAGES]= {0,0,0};
static fixedpt pz_V_f[NUM_PUNCHPADS][NUM_VOLTAGES]= {0,0,0};

static fixedpt pz_current_max[NUM_PUNCHPADS][NUM_VOLTAGES]= {0,0,0};
static uint8_t pz_index_of_current_max[NUM_PUNCHPADS][NUM_VOLTAGES]= {0,0,0};

static fixedpt pz_current_min[NUM_PUNCHPADS][NUM_VOLTAGES]= {0,0,0};
static uint8_t pz_index_of_current_min[NUM_PUNCHPADS][NUM_VOLTAGES]= {0,0,0};

static fixedpt pz_extreme_v[NUM_PUNCHPADS][NUM_VOLTAGES]= {0,0,0};
static uint32_t pz_extreme_t[NUM_PUNCHPADS][NUM_VOLTAGES]= {0,0,0};

static uint32_t pz_look_ahead[NUM_PUNCHPADS][NUM_VOLTAGES]= {0,0,0};

static fixedpt pz_delta_t[NUM_PUNCHPADS][NUM_VOLTAGES]= {0,0,0};
static fixedpt pz_delta_v[NUM_PUNCHPADS][NUM_VOLTAGES]= {0,0,0};
static fixedpt pz_percent_v[NUM_PUNCHPADS][NUM_VOLTAGES]= {0,0,0};

static uint8_t select = 0;

//Temporary buffer used in sorting the vstack
static fixedpt pz_vsort[PZ_STACK_SIZE];

void piezo_init(G_pin** S,G_pin** V)
{
		// can we reset the "rtc_micros()" to force it to be 0 at "init" ... or at "first scan" ...
	SELECT = S;
	VOLTAGES = V;
	
	uint8_t s = 0;
	uint8_t v = 0;
	
	
	
	//assume ADC is already set up  // adc_init();
	for(v=0;v<NUM_VOLTAGES;v++)
			{
			adc_pin_init(VOLTAGES[v]);	
			}
	
	// maybe loop through each pin, grab 32 readings, and log raw values to a log ... (before taking median)
	for(s=0;s<NUM_PUNCHPADS;s++)
		{
			SELECT[s]->output();  // daniel added...
		// when we get raw voltage from ADC, let's get all 3 ???
		piezo_select(s, PZ_SWITCH_SETTLE_DELAY_MICROS); // this will switch to the pin and wait for voltage to settle...
			
		}
	for(v=0;v<NUM_VOLTAGES;v++)
		{
			for(s=0;s<NUM_PUNCHPADS;s++)
			{
				associate(&pz_vstack[s][v], pz_v[s][v], PZ_STACK_SIZE);
				associate(&pz_tstack[s][v], pz_t[s][v], PZ_STACK_SIZE);
			}
		
		}
		
		// sampling value is 12-bit ... can be oversampled and decimation to 16-bit with SAMPLING
		// SAMPLING TIME ... half cycles ... Chapter 13.3?
		/*
		static fixedpt sampling_stack[NUM_PUNCHPADS][NUM_VOLTAGES][ADC_SWITCHED_SAMPLE_NUM];
static fixedpt sampling_stack_recent_value[NUM_PUNCHPADS][NUM_VOLTAGES]; 

static uint8_t current_select = 0;												// current switch value  0...8
static uint8_t current_vselect = 0;												// current voltage index  0...2
		*/
	
		
		
		piezo_scan_init();
}


void piezo_select(uint8_t idx, uint32_t delay_micros)
	{
//		debug_puts(">PIEZO\r\n");
//		debug_puthex(idx,1);
//		debug_puts(">SELECT\r\n");
		
		/*
		setCursor(17,2); 
			//lcd_puts("-> SWITCHING ... ");
			lcd_put_hex(idx,1);
		*/
		
	uint8_t s = 0;
	uint8_t v = 0;	
	for(s=0;s<NUM_PUNCHPADS;s++)
		{
			if(s==idx)
				{
					SELECT[s]->set();
				}
			else
				{
					SELECT[s]->clr();
				}
		}
	rtc_delay_us(delay_micros);		
	}


fixedpt piezo_time()
	{
	uint8_t s = current_select;
	uint8_t v = current_vselect;
		
	timeval ptime = rtc_get_time();		
	uint8_t rtime = (PZ_FORCE_TIME_RESET + PZ_FORCE_TIME_ROLLBACK);	
		
		
		// how to roll-it-over ??? ... update all elements in stack ... 
		
		// if greater than 120  ... PZ_FORCE_TIME_RESET
		
		/*

		#define PZ_FORCE_TIME_RESET 120	// this is seconds, it is less than 127 (2^7), so can play in fixedpt
#define PZ_FORCE_TIME_ROLLBACK 2	// this is in seconds, we roll-back and update the tstack

		
		
		*/
		
		
		// pz_current_time_overflow_seconds[s][v]
		/*
		options->ani_current_timing =  options->ani_timings[options->ani_i];
	//ani_start
	options->ani_now = rtc_get_time();	
			uint32_t seconds = options->ani_now.secs - options->ani_start.secs;
			int32_t micros = options->ani_now.micros - options->ani_start.micros;
	options->ani_progress = 1000*seconds + micros / 1000;
		*/
		
	// myTime.secs may be overflowing so we will store the overflow elsewhere
	//	pz_current_time_overflow_seconds[s][v] = overflow
	// 127 seconds is allowed, so let's recycle early, at 120 seconds
	//	#define PZ_FORCE_TIME_RESET 120
	
	// cast remainder as fixedpt
		
	return (fixedpt) fixedpt_rconst(ptime.secs + ptime.micros/1000/1000);
	}

	// this in turn, updates the strike-voltate_tolerances ...
void piezo_update_voltage(uint8_t s, uint8_t v, fixedpt value)
	{
	pz_strike_voltage[s][v] = value;	
	piezo_update_voltage_tolerances(s,v);
	}
	
void piezo_update_voltage_tolerances(uint8_t s, uint8_t v)
	{
	pz_initial_voltage_tol_min[s][v] = 	pz_initial_voltage[s][v] * (1 -  pz_initial_voltage_tolerance[s][v]);
	pz_initial_voltage_tol_max[s][v] = 	pz_initial_voltage[s][v] * (1 +  pz_initial_voltage_tolerance[s][v]);
		
	pz_strike_voltage_tol_min[s][v] = 	pz_strike_voltage[s][v] * (1 -  pz_strike_voltage_tolerance[s][v]);
	pz_strike_voltage_tol_max[s][v] = 	pz_strike_voltage[s][v] * (1 +  pz_strike_voltage_tolerance[s][v]);
	}	
	
void piezo_scan_init()
	{
	// run once to set initial values from fixedpt
		
	uint8_t s = 0;
	uint8_t v = 0;
	
	for(s=0;s<NUM_PUNCHPADS;s++)
		{
		for(v=0;v<NUM_VOLTAGES;v++)
			{
			piezo_update_voltage_tolerances(s,v);
			// other updates?
			}
		}
		
		
	}
	
	
void piezo_log()
{
	FIL File[2];			/* File objects */  // why 2?
	
	
	
}

void piezo_simple_scan()
 {
	 pz_readings_before_LCD++;
	 
	 
	 
	  //current_select = 0;  // monte hard codes

	 
	 if(pz_readings_before_LCD > 2000) {pz_readings_before_LCD = 0;}
	 
	 
if(pz_readings_before_LCD % PZ_READINGS_BEFORE_LCD == 0)
{	
	/*
setCursor(0,1);  // c, r    setCursor(0,1);  // indent 1 pixel
		lcd_puts("S: ");
		lcd_put_hex(current_select,1);
		lcd_puts(" V: "); 
		lcd_put_hex(current_vselect,1);
		lcd_puts(" R: "); 		
		lcd_put_hex(current_select_number_readings,4);
	*/
//setCursor(3,1);	
//	lcd_put_hex(current_select,1);
//setCursor(8,1);	
//	lcd_put_hex(current_vselect,1);
//setCursor(13,1);	
//	lcd_put_hex(current_select_number_readings,4);
}	
	

	 
	 
	uint8_t v = 0;
	fixedpt myVoltage;
	fixedpt myTime;
	//for(v=0;v<NUM_VOLTAGES;v++)
	//for(v=0;v<1;v++)  // let's just look at first voltage for now... sub-voltages may be used for next-gen algorithm
	for(v=0;v<NUM_VOLTAGES;v++)
		{		
			v=2; // monte, high gain
			
			
if(pz_readings_before_LCD % PZ_READINGS_BEFORE_LCD == 0)
{				
// update v			
//setCursor(8,1);
//		lcd_put_hex(v,1);
}			

				
				
			current_vselect = v;
			//myTime = rtc_micros();  // 	this will overflow if fixedpt ... 
			myTime = piezo_time(); // this has seconds which can be stored separately...
			uint32_t voltage = adc_pin_read(VOLTAGES[v]);	
			//myVoltage = (fixedpt)  fixedpt_mul(PZ_MAX_VOLTAGE, fixedpt_xdiv( voltage , PZ_ADC_BITS) );
			myVoltage = (fixedpt)  fixedpt_mul(PZ_MAX_VOLTAGE, fixedpt_xdiv( voltage , PZ_ADC_MAX) );
				

//setCursor(0,2);  // c, r    setCursor(0,1);  // indent 1 pixel
		//lcd_puts("Time: ");				
		//lcd_put_hex(myTime,6);	

if(pz_readings_before_LCD % PZ_READINGS_BEFORE_LCD == 0)
{
// 20 chars ...   V0 V1 V2 ... 6 per
switch(v)
	{
	case 2:
//		setCursor(14,3); 
//		//setCursor(12,3);  // c, r    setCursor(0,1);  // indent 1 pixel	
//		//lcd_puts_n(fixedpt_cstr(myVoltage,-1),6);
//		//lcd_puts(fixedpt_cstr(myVoltage,-1));
//		lcd_put_hex(voltage,4);
	break;
	
	case 1:
//		setCursor(7,3); 
//		//setCursor(10,2);  // c, r    setCursor(0,1);  // indent 1 pixel	
//		//lcd_puts_n(fixedpt_cstr(myVoltage,-1),6);
//		//lcd_puts(fixedpt_cstr(myVoltage,-1));
//		lcd_put_hex(voltage,4);
	break;
	
	case 0:
		default:
//		setCursor(0,3); 
//		//setCursor(0,2);  // c, r    setCursor(0,1);  // indent 1 pixel	
//		//lcd_puts_n(fixedpt_cstr(myVoltage,-1),6);
//		//lcd_puts( fixedpt_cstr(myVoltage,-1) );
//		lcd_put_hex(voltage,4);
	break;
	}
}
				

if(myVoltage > pz_simple_v2_max)
{
	
	sk6812_update_LEDstring(_COLOR_YELLOW_WHITE,true_number[current_select]+1);
	rtc_delay_ms(300);
	sk6812_update_LEDstring(_COLOR_PINK_WHITE,true_number[current_select]+1);
	rtc_delay_ms(300);
	sk6812_update_LEDstring(_COLOR_BLACK,true_number[current_select]);
	
				//current_select = 1;
//debug_puts(">PIEZO_SIMPLE SCAN PUNCHPAD # ... [");
//	debug_puthex(current_select,1);
//debug_puts("-");
//	debug_puthex(current_vselect,1);
//debug_puts("] ... [");
//	//debug_puts(utoa(voltage));
//	debug_puthex(voltage,6);
//debug_puts("] --> [");				
//	debug_puts(fixedpt_cstr(myVoltage,-1));
//debug_puts("] ... \r\n");
}
				
			//piezo_strike_detection(myTime, myVoltage);
			//rtc_delay_ms(250);
			}
	
	current_select_number_readings++;
	//if(current_select_number_readings > pz_readings_before_switch)
	//if(1==0)
	//	{
		select++;
		if(select >= 5)
			{
			select = 0;
			}
		if(color_index >= 3)
			{
			color_index = 0;
			}
		piezo_select(true_number[current_select],PZ_SWITCH_SETTLE_DELAY_MICROS);
		sk6812_update_LEDstring(colors[color_index], true_number[select]);
		color_index++;
		//}	
	
 }
void piezo_scan()
	{
	// nested in while(1) in main ...
	// static uint8_t current_select = 0;	
	// PZ_READINGS_BEFORE_SWITCH
		
	// piezo_select(s, PZ_SWITCH_SETTLE_DELAY_MICROS);
	// static uint8_t current_select_number_readings = 0;
	uint8_t v = 0;
	fixedpt myVoltage;
	fixedpt myTime;
	for(v=0;v<NUM_VOLTAGES;v++)
	//for(v=0;v<1;v++)  // let's just look at first voltage for now... sub-voltages may be used for next-gen algorithm
			{		
			v=0; // high gain
			current_vselect = v;
			//myTime = rtc_micros();  // 	this will overflow if fixedpt ... 
			myTime = piezo_time(); // this has seconds which can be stored separately...
			myVoltage = (fixedpt)  fixedpt_mul(PZ_MAX_VOLTAGE, fixedpt_xdiv( adc_pin_read(VOLTAGES[v]) , PZ_ADC_BITS) );
				
			piezo_strike_detection(myTime, myVoltage);
			}
	current_select_number_readings++;
	if(current_select_number_readings > PZ_READINGS_BEFORE_SWITCH)
		{
		current_select++;
		if(current_select >= NUM_PUNCHPADS)
			{
			current_select = 0;
			}
		piezo_select(current_select,PZ_SWITCH_SETTLE_DELAY_MICROS);
		current_select_number_readings = 0;			
		}			
	}



void piezo_strike_detection(fixedpt myTime, fixedpt myVoltage)
{
	uint8_t s = current_select;
	uint8_t v = current_vselect;
	// we have a select_idx [s], voltage_idx [v] ... let's compute strike detection at this moment with the current voltage we just grabbed...
	// myTime has seconds and microseconds... 
			// we subract everything down to get this into a fixedpt frame 127.390784
			// pz_current_time_overflow_seconds
		
	
	pz_current_time[s][v]				= myTime;
	pz_current_voltage[s][v] 		=  myVoltage;
		
		
	/******* ALGORITHM GOES HERE *******/
	piezo_fill_stack();	
		// tyler make certain the stack is filled and shifted ...
		// this needs a shift operator, and update a current idx if head/tail is going on...	
	uint8_t len = pz_vstack[s][v].length;	
		
	if(len < 	PZ_STACK_SIZE)
		{
		// update previous values
		piezo_update_current_previous();
		}
	else
	{
			// we have data to continue computing ...
				// should fill_stack() also do small stack, or every iteration we populate it here?
				// create a "slice" method if we want to build every iteration ...
				// https://stackoverflow.com/questions/17763408/best-method-to-create-a-sub-array-from-an-array-in-c
				// https://www.embedded.fm/blog/2016/5/11/ew-arrays
				// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice
					// how is idx determined for first and last elements?
				// pz_v[s][v][idx]
				// pz_t[s][v][idx]
		pz_slope[s][v] = slope(get(&pz_vstack[s][v],pz_vstack[s][v].length-1),get(&pz_vstack[s][v],0),	\
													 get(&pz_tstack[s][v],pz_tstack[s][v].length-1),get(&pz_tstack[s][v],0));
		pz_slope_sign[s][v] = fixedpt_sign(pz_slope[s][v]);


		copy_sort(pz_v[s][v], pz_vsort, PZ_SMALL_STACK_SIZE, false);
		pz_median[s][v] = median(pz_vsort, PZ_SMALL_STACK_SIZE);
		pz_MAD[s][v] = MAD(pz_vsort, PZ_SMALL_STACK_SIZE, pz_median[s][v]);
		
		ring_buffer pz_small_vstack = slice(&pz_vstack[s][v],PZ_STACK_SIZE-PZ_SMALL_STACK_SIZE,PZ_STACK_SIZE);
		ring_buffer pz_small_tstack = slice(&pz_tstack[s][v],PZ_STACK_SIZE-PZ_SMALL_STACK_SIZE,PZ_STACK_SIZE);
		
		pz_small_slope[s][v] = slope(get(&pz_small_vstack,pz_small_vstack.length-1), get(&pz_small_vstack,0), \
																 get(&pz_small_tstack,pz_small_tstack.length-1), get(&pz_small_vstack,0));
		pz_small_slope_sign[s][v] = fixedpt_sign(pz_small_slope[s][v]);

			
		//pz_small_median[s][v] = median(	);
		//pz_small_MAD[s][v] = MAD(	);	
				
		pz_is_current_voltage_in_range_of_initial_voltage[s][v]= (pz_current_voltage[s][v] >= pz_initial_voltage_tol_min[s][v] && pz_current_voltage[s][v] <= pz_initial_voltage_tol_min[s][v]);
		pz_is_current_voltage_in_range_of_strike_voltage[s][v]= (pz_current_voltage[s][v] >= pz_strike_voltage_tol_min[s][v] && pz_current_voltage[s][v] <= pz_strike_voltage_tol_min[s][v]);
		pz_is_current_voltage_strike_test_basic[s][v] = (pz_MAD[s][v] >= pz_MAD_tolerance[s][v] && fixedpt_abs(pz_slope[s][v]) >=  pz_slope_tolerance[s][v] && fixedpt_abs(pz_small_slope[s][v]) >=  pz_small_slope_tolerance[s][v]);		
		pz_is_current_voltage_strike_test_fast[s][v] = (pz_MAD[s][v] >= pz_MAD_tolerance[s][v] && pz_slope[s][v] >=  pz_slope_tolerance[s][v] && pz_small_slope[s][v] >=  pz_small_slope_tolerance[s][v]);		
			
						
						
						
		switch(pz_current_state[s][v]) 
			{
			case STATE_DEFAULT :
						if(pz_is_current_voltage_in_range_of_initial_voltage[s][v])
							{
							pz_current_state[s][v] = STATE_IS_LEVEL;
							}
						piezo_check_fast_strike(s,v);
				 break;
			case STATE_IS_LEVEL :
						if(pz_is_current_voltage_strike_test_basic[s][v])
							{
							pz_current_state[s][v] = STATE_FIND_EXTREME;
							pz_seek_min_or_max[s][v] = piezo_boolean_sign(pz_slope_sign[s][v]); // max is 1, min is 0
							
							// let's use rewind to store the best value
							/*
							myStack.t_0 = myStack.tStack[myStack.tStack.length-this.strikeRewind];
							myStack.V_0 = myStack.vStack[myStack.tStack.length-this.strikeRewind];	
							*/
							pz_t_0[s][v] = get(&pz_tstack[s][v], PZ_STACK_SIZE/2);
							pz_V_0[s][v] = get(&pz_vstack[s][v], PZ_STACK_SIZE/2);
							

								
							piezo_update_voltage(s,v,	pz_V_0[s][v]);
							}
								piezo_check_fast_strike(s,v);
				
					 break;
			case STATE_FIND_EXTREME :
					// slope has changed direction ... and MAD slowed
					if(piezo_boolean_sign(pz_slope_sign[s][v]) != pz_seek_min_or_max[s][v] && pz_MAD[s][v] <= pz_MAD_tolerance[s][v])
						{
						pz_current_state[s][v] = STATE_EXTREME_IS_SLOWING;
						}
					// slope has changed direction ... and slope has slowed
					if(piezo_boolean_sign(pz_slope_sign[s][v]) != pz_seek_min_or_max[s][v] && fixedpt_abs(pz_slope[s][v]) <= pz_slope_tolerance[s][v] )
						{
						pz_current_state[s][v] = STATE_EXTREME_IS_SLOWING;
						}
					 
				 break;
			case STATE_EXTREME_IS_SLOWING :
					// do look-ahead and look back
			
								if(pz_seek_min_or_max[s][v] == 0)
									{
									// false is min
									/*
									var currentMAX = getMaxOfArray(myStack.vStack);
                              var idxMAX = getIndexFromArrayReverse(myStack.vStack, currentMAX);
                              var timeMAX = myStack.tStack[idxMAX];
											
                       
									pz_extreme_v[s][v]
									pz_extreme_t[s][v]
											
									pz_current_voltage[s][v]
										
									pz_current_max[s][v]
									pz_index_of_current_max[s][v]
											
									pz_current_min[s][v]
									pz_index_of_current_min[s][v]
											
                              myStack.extremeV = (myStack.currentV > currentMAX) ? myStack.currentV : currentMAX;
                              myStack.extremeT = (myStack.currentV > currentMAX) ? myStack.currentT : timeMAX;
									*/
									pz_current_min[s][v] = get_extreme(&pz_vstack[s][v], true);
									bool found_flag = false;
									pz_index_of_current_min[s][v] = get_index(&pz_vstack[s][v],pz_extreme_v[s][v], true, &found_flag);
									if(found_flag)
									{
										if(pz_current_min[s][v] < pz_extreme_v[s][v])
										{
											pz_extreme_v[s][v] = pz_current_min[s][v];
											pz_extreme_t[s][v] = get(&pz_tstack[s][v], pz_index_of_current_min[s][v]);
										}
									}
									
									}
									else 
										{
										// true is max
											/*
											var currentMIN = getMinOfArray(myStack.vStack);
                               var idxMIN = getIndexFromArrayReverse(myStack.vStack, currentMIN);
                               var timeMIN = myStack.tStack[idxMIN];
                                
                                
                               myStack.extremeV = (myStack.currentV < currentMIN) ? myStack.currentV : currentMIN;
                               myStack.extremeT = (myStack.currentV < currentMIN) ? myStack.currentT : timeMIN;
											*/
										pz_current_min[s][v] = get_extreme(&pz_vstack[s][v], true);
										bool found_flag = false;
										pz_index_of_current_min[s][v] = get_index(&pz_vstack[s][v],pz_extreme_v[s][v], true, &found_flag);
										if(found_flag)
										{
											if(pz_current_min[s][v] < pz_extreme_v[s][v])
											{
												pz_extreme_v[s][v] = pz_current_min[s][v];
												pz_extreme_t[s][v] = get(&pz_tstack[s][v], pz_index_of_current_min[s][v]);
											}
										}

										}
											
											
								pz_current_state[s][v] = STATE_EXTREME_FINAL_LOOK_AHEAD;	
								pz_look_ahead[s][v] = 0;
				 break;
			case STATE_EXTREME_FINAL_LOOK_AHEAD :
				 
							if(pz_seek_min_or_max[s][v] == 0)
									{
										

									// false is min
										/*
										 if(myStack.currentV < myStack.extremeV)
                                   {
                                   myStack.lookAheadCount = 0;
                                   myStack.extremeV = myStack.currentV;
                                   myStack.extremeT = myStack.currentT;
                                   this.state = "extreme-final-look-ahead"; 
										STATE_EXTREME_FINAL_LOOK_AHEAD ... has not changed ... do we need to update?
                                   }
                                   else
                                       {
                                       myStack.lookAheadCount++;
                                       }
										*/
										
										if(pz_current_voltage[s][v] < pz_extreme_v[s][v])
										{
											pz_look_ahead[s][v] = 0;
											pz_extreme_v[s][v] = pz_current_voltage[s][v];
											pz_extreme_t[s][v] = pz_current_time[s][v];
											pz_current_state[s][v] = STATE_EXTREME_FINAL_LOOK_AHEAD; 
										}
										else
										{
											pz_look_ahead[s][v]++;
										}
									
									}
							else 
									{
										// true is max
											/*
											if(myStack.currentV > myStack.extremeV)
                                   {
                                   myStack.lookAheadCount = 0;
                                   myStack.extremeV = myStack.currentV;
                                   myStack.extremeT = myStack.currentT;
                                   this.state = "extreme-final-look-ahead"; 
											
											pz_current_state[s][v] = STATE_EXTREME_HAS_BEEN_FOUND;
												STATE_EXTREME_FINAL_LOOK_AHEAD ... has not changed ... do we need to update?
												
												
                                   }
                                   else
                                       {
                                       myStack.lookAheadCount++;
                                       }
											*/
										if(pz_current_voltage[s][v] > pz_extreme_v[s][v])
										{
											pz_look_ahead[s][v] = 0;
											pz_extreme_v[s][v] = pz_current_voltage[s][v];
											pz_extreme_t[s][v] = pz_current_time[s][v];
											pz_current_state[s][v] = STATE_EXTREME_FINAL_LOOK_AHEAD; 
										}
										else
										{
											pz_look_ahead[s][v]++;
										}
									}
											
							if(pz_look_ahead[s][v] > PZ_LOOKAHEAD_NUMBER)
								{
								pz_current_state[s][v] = STATE_EXTREME_HAS_BEEN_FOUND;	
								}
				
				 break;
			case STATE_EXTREME_HAS_BEEN_FOUND :
					 
							/*
							myStack.t_f = myStack.extremeT;
                   myStack.V_f = myStack.extremeV; 
                    
                   this.recordPunchIfValid(myStack);                    
                    
                   myStack = this.initStack();  // piezo_reset_values(s,v)
                   this.state = "";
							*/
							pz_V_f[s][v] = pz_extreme_v[s][v];
							pz_t_f[s][v] = pz_extreme_t[s][v];
							piezo_record_punch_if_valid(s,v);
							piezo_reset_values(s,v);
							pz_current_state[s][v] = STATE_DEFAULT;
				 break;
				
				
			case STATE_FAST_STRIKE :
						if(piezo_boolean_sign(pz_small_slope_sign[s][v]) != pz_seek_min_or_max[s][v] && pz_small_slope_sign[s][v] <= fixedpt_mul(-1,pz_small_slope_tolerance[s][v]) )
							{
							/*
							myStack.t_f = myStack.tStack[myStack.tStack.length-this.strikeRewind-this.strikeRewind]; // we have to rewind twice to account for t_0 rewind ... 
										myStack.V_f = myStack.vStack[myStack.tStack.length-this.strikeRewind-this.strikeRewind];                 
										 
											
										this.recordPunchIfValid(myStack,true);                    
											
										myStack = this.initStack();  // piezo_reset_values(s,v)
							*/
								pz_t_f[s][v] = get(&pz_tstack[s][v], 0);
								pz_V_f[s][v] = get(&pz_vstack[s][v], 0);
								piezo_record_punch_if_valid(s,v);
								piezo_reset_values(s,v);
							pz_current_state[s][v] = STATE_DEFAULT;
							}
				 break;
				
			default :
				break;
				 // never occurs?
			}
			
				
		}
		
		
	// if punch, let's log, and take light colors on this device, and just add a shade of white in 00-FF range based on how hard the strike was.	
				
}

	
void piezo_record_punch_if_valid(uint8_t s,uint8_t v)
	{
		// let's compute a force, and light up LEDs ...
		
		/*
		myStack.deltaT = myStack.t_f - myStack.t_0;
                    myStack.deltaV = myStack.V_f - myStack.V_0;                    
                    myStack.percentV = myStack.deltaV / myStack.V_0;
                    
                    
      if(Math.abs(myStack.percentV) <= this.voltageTolerance)
                    //if(1==0)
                        {
                        console.log("BOGUS move with ["+myStack.percentV+"]");
                        }
                        else
                            {
                            var result = (myStack.seekMinOrMax == -1) ? "released" : "pressed"; 
                            if(isStrike) { result = "striked"; }
                            var record = {
                                                "result": result, 
                                                "t_0": myStack.t_0, 
                                                "t_f": myStack.t_f, 
                                                "V_0": myStack.V_0, 
                                                "V_f": myStack.V_f, 
                                                "deltaT": myStack.deltaT, 
                                                "deltaV": myStack.deltaV, 
                                                "percentV": myStack.percentV, 
                                                "whichStack": this.whichStack, 
                                                "j": myStack.j 
                                                }
                            this.punches.push( record ); 
                            console.log(result);
                            console.log(record);
                            }
			*/
			
			pz_delta_t[s][v] = pz_t_f[s][v] - pz_t_0[s][v];
			pz_delta_v[s][v] = pz_V_f[s][v] - pz_V_0[s][v];
			pz_percent_v[s][v] = fixedpt_div(pz_delta_v[s][v], pz_V_0[s][v]);
			if(pz_percent_v[s][v] <= pz_strike_voltage_tolerance[s][v])
			{
				/*
				//Where do punch results go?
				lcd_clear();
				setCursor(1,0);
				lcd_puts("v_0: ");
				lcd_puts(fixedpt_cstr(pz_V_0[s][v], -2));
				setCursor(1,1);
				lcd_puts("v_f: ");
				lcd_puts(fixedpt_cstr(pz_V_f[s][v], -2));
				setCursor(1,2);
				lcd_puts("delta t: ");
				lcd_puts(fixedpt_cstr(pz_delta_t[s][v], -2));
				setCursor(1,3);
				lcd_puts("percent v: ");
				lcd_puts(fixedpt_cstr(pz_percent_v[s][v], -2));
				noCursor();
				noBlink();
				*/
			}
	}
	
	
	
void piezo_reset_values(uint8_t s,uint8_t v)
	{
		// reset values back ... 
		// pz_v[s][v][PZ_STACK_SIZE] = 0;
		
		//Zeroes underlying array and resets ring_buffer
		reset_array(&pz_vstack[s][v]);
		reset_array(&pz_tstack[s][v]);
		
		pz_strike_voltage[s][v] = PZ_INITIAL_VOLTAGE;
		piezo_update_voltage(s,v, PZ_INITIAL_VOLTAGE);
		pz_current_state[s][v] = 0;
		//pz_current_stacksize[s][v] = 0;
		pz_current_voltage[s][v] = 0;
		pz_previous_voltage[s][v] = 0;
		pz_slope[s][v] = 0;
		pz_slope_sign[s][v] = 0;
		pz_small_slope[s][v] = 0;
		pz_small_slope_sign[s][v] = 0;
		pz_median[s][v] = 0;
		pz_small_median[s][v] = 0;
		pz_MAD[s][v] = 0;
		pz_small_MAD[s][v] = 0;
		pz_seek_min_or_max[s][v] = 0;
		pz_is_current_voltage_in_range_of_initial_voltage[s][v] = 0;
		pz_is_current_voltage_in_range_of_strike_voltage[s][v] = 0;
		pz_is_current_voltage_strike_test_basic[s][v]=0;
		pz_is_current_voltage_strike_test_fast[s][v]=0;

		pz_t_0[s][v]=0;
		pz_t_f[s][v]=0;
		pz_V_0[s][v]=0;
		pz_V_f[s][v]=0;

		pz_current_max[s][v]=0;
		pz_index_of_current_max[s][v]=0;
		pz_current_min[s][v]=0;
		pz_index_of_current_min[s][v]=0;

		pz_extreme_v[s][v] = 0;
		pz_extreme_t[s][v] = 0;

		pz_look_ahead[s][v] = 0;

		pz_delta_t[s][v] = 0;
		pz_delta_v[s][v] = 0;
		pz_percent_v[s][v] = 0;
		
	}
	
	
bool piezo_boolean_sign(fixedpt value)
	{
	return (value > 0) ? 1: 0;
	}		

	
void piezo_check_fast_strike(uint8_t s,uint8_t v)
	{
	if(pz_is_current_voltage_strike_test_fast[s][v])
		{
		pz_current_state[s][v] = STATE_FAST_STRIKE;		
		pz_seek_min_or_max[s][v] = piezo_boolean_sign(pz_slope_sign[s][v]);  // max is 1, min is 0
			
		// let's use rewind to store the best value
				/*
		myStack.t_0 = myStack.tStack[myStack.tStack.length-this.strikeRewind];
    myStack.V_0 = myStack.vStack[myStack.tStack.length-this.strikeRewind];	
				// if head/tail is going on, this may be funky
			pz_t_0[s][v] = pz_t[s][v][PZ_STACK_SIZE/2];
			pz_V_0[s][v] = pz_v[s][v][PZ_STACK_SIZE/2];
				*/
			pz_t_0[s][v] = get(&pz_tstack[s][v],PZ_STACK_SIZE/2);
			pz_t_0[s][v] = get(&pz_vstack[s][v],PZ_STACK_SIZE/2);
			
		}
		
	}
	
void piezo_fill_stack()
	{
	uint8_t s = current_select;
	uint8_t v = current_vselect;
	
	
//	uint8_t len = pz_current_stacksize[s][v].length;
//		
//	if(len <= PZ_STACK_SIZE)
//		{
//			/*
//			myStack.tStack.push(myStack.currentT);
//			myStack.vStack.push(myStack.currentV); 
//			
//			
//			static fixedpt pz_v[NUM_PUNCHPADS][NUM_VOLTAGES][PZ_STACK_SIZE]= {0,0,0};  
//			static fixedpt pz_t[NUM_PUNCHPADS][NUM_VOLTAGES][PZ_STACK_SIZE]= {0,0,0};
//			*/
//			
//			
//		
//		pz_current_stacksize[s][v]++;			
//		}
//		else
//			{
//				
//				/*
//			myStack.tStack.shift();
//			myStack.vStack.shift();
//			myStack.tStack.push(myStack.currentT);
//			myStack.vStack.push(myStack.currentV);
//			
//			
//			static fixedpt pz_v[NUM_PUNCHPADS][NUM_VOLTAGES][PZ_STACK_SIZE]= {0,0,0};  
//			static fixedpt pz_t[NUM_PUNCHPADS][NUM_VOLTAGES][PZ_STACK_SIZE]= {0,0,0};
//			*/
//				
//				
//			}
//		

	//no need to check length; push() automatically shifts if full
	push(&pz_vstack[s][v], pz_current_voltage[s][v]);
	push(&pz_tstack[s][v], pz_current_time[s][v]);
	}
	
void piezo_update_current_previous()
	{
	uint8_t s = current_select;
	uint8_t v = current_vselect;

	pz_previous_time[s][v] = pz_current_time[s][v];
	pz_previous_voltage[s][v] = pz_current_voltage[s][v];
	
	// do we need slope/ small_slope?	
	}


