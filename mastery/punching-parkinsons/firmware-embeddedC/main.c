#include "init.h"
#include "button.h"
#include "debug.h"
#include "piezo.h"
#include "target.h"
#include "flash.h"

#include "FatFs/ff.h"
#include "rtc.h"
#include "logger.h"
#include "rtc.h"
#include "sound.h"

#include "mode.h"
#include "unit_tests.h"
#include "init.h"

#include "random.h"
#include "task_manager.h"

#define ONE_SECOND 1000

int main()
{
	
	/* ****************  ability to sync clock from external ******* */
	
	// get time from USB ... PYTHON
			/*
	time.time() may provide worse precision than datetime.utcnow() on some platforms and python versions. 
	
time.time() may only give resolution to the second, the preferred approach for milliseconds is datetime.
	

from datetime import datetime
dt = datetime.now()
dt.microsecond
	
	http://www.php2python.com/wiki/function.microtime/


	DO A ROUND-ROBIN POLLING [PING] to estimate in microseconds transfer delay
	TAKE AN AVERAGE RESPONSE and add this microseconds transfer delay to final answer
	
	struct tm does not include microseconds ... 
	
	Can we update the SAMD21 register to the seconds/microseconds
	
	
	, STORE on EEPROM or internal FLASHING or SD CARD...
	
	internal FLASHING would make the most sense...


accuracy of setup and cost ... D21 ... https://www.avrfreaks.net/forum/samd21-rtc-mode0-count-value-freezes-rcont-rreq-set

https://askubuntu.com/questions/284224/autorun-a-script-after-i-plugged-or-unplugged-a-usb-device

	*/
	
	/*
	struct tm sys_time;
	sys_time.tm_year = 119;
	sys_time.tm_mon = 4;
	sys_time.tm_mday = 9;
	sys_time.tm_hour = 7;
	sys_time.tm_min = 34;
	sys_time.tm_sec = 29;
		// can I get more precise?  
	
	time_t sys_time_t = mktime(&sys_time);
	
	rtc_sync_time(sys_time_t);  // this can be called before init()
															// why isn't it being accessed for REG...
	*/
	
	
	system_init();

//	for(uint8_t i=0;i<NUMBER_SEQUENCES;i++)
//				{
//				sequence_setup(); 
//				//break;
//				}
//	set_random_seed( rtc_micros() );
//while(1)
//{
//		do_main_event_random(-1);
//		// do_main_event_random(0);
//			//return 0;
//}
		
	
//	sk6812_update_LEDstring(0xFF000000,4);
	while(1)
		{
			perform_next_task_in_queue(-1);
		}
		
		return 0;
}



