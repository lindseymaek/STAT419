

var PunchAlgorithm = 	
	{

	init: function(n=25, tol=0.5, vtol=0.03, extremeMAD = 0.10, triggerMAD = 0.005, initialVoltage = 1.65, RCconstant = 0.330, RCConstantMultiple = 4, lookAhead = 5, timeLimit = 0.01, minStrikeVal = 12)
		{		
		this.stackSize = n;
		this.slopeTolerance = tol; // absolute of slope/deriv is 0.5 => 0
		this.levelTolerance = vtol; // 3% of V_0
		this.extremeMAD = extremeMAD; // > 10% of median is extreme [fast strike]
		this.triggerMAD = triggerMAD; // > 0.5% of median is "not level"
		
		this.timeConstant = RCconstant; // current circuit has RC value
		this.timeMultiple = RCConstantMultiple;
		this.initialVoltage = initialVoltage; // a best guess ... 
		this.state = "";
		this.lookAheadAmount = lookAhead;
		this.timeLimit = timeLimit;
		this.minStrikeVal = minStrikeVal;
		
		this.debug = false;
		},
		
	loadSimulation: function ()
		{
		var myCSV = parseWaveFormCSV($("#dialog-import-CSV-textarea-loaded").val());       	
        myCSV = trimVoltage(myCSV,0.002);
        myCSV = prepareStackWithDerivatives(myCSV,24,1,0.66);
		
		this.myCSV = myCSV;
		},
		
	initVars: function()
		{
		console.log("initVars");
		this.punches = [];   // array of objects ...
		this.tStack = [];    // time stack
		this.vStack = [];    // voltage stack
		this.mStack = [];    // slope stack
		this.v0 = 0;   // initial strike voltage stack
		this.t0 = 0;   // initial strike time stack 
		this.vf = 0;   // peak strike voltage stack
		this.tf = 0;   // peak strike time stack
		this.lookAheadCount = -1;
		this.slopePrevious = 0;
		this.previousV = 0;
		this.previousT = 0;
		this.timeoutStart = 0;
		this.slope = 0;
		this.slopeBoolean = false;
		this.slopeSign = 0;
		this.deltaSlope = 0;
		this.stats = {};
		this.currentT = 0;
		this.currentV = 0;
		this.len = 0;
		this.percentMAD = 0;
		this.VlvlMax = this.initialVoltage * (1 + this.levelTolerance);
		this.VlvlMin = this.initialVoltage * (1 - this.levelTolerance);
		this.seekMinOrMax = 0;
		this.substrike = {}; //empty object for strikes that occur during recovery
		},
	
	setDebug: function(level)
	{
	switch(level)
		{
		case true:
			this.debug = 1;
		break;
		case false:
			this.debug = 0;
		break;
		default:
			level = parseInt(Math.round(parseFloat(level)));
			if(level < 0) { this.debug = 0; } 
			if(level > 9) { this.debug = 9; }
		}
		
		// we could do levels of verbosity ... 0 is none, 1 is minimal, 9 is extreme
	},
	
	printDebug: function(j)
	{
	
	var printMore = false;
	if(this.percentMAD > this.triggerMAD)
		{
		console.log("MAD is not level!");
		printMore = true;
		}
	if(this.percentMAD > this.extremeMAD)
		{
		console.log("MAD is extreme!");
		printMore = true;
		}
	if(printMore)
		{
		console.log("############################ " + j + "	############################");
		console.log("Current T: "+this.currentT);
		console.log("Current V: "+this.currentV);
		console.log("Current State: "+this.state);
		console.log("++++++++++++++++++++++++++++ " + this.percentMAD + "	++++++++++++++++++++++++++++");
		
		if(this.debug > 8)
			{
			console.log(this);
			}
		}
	
	
	},
	
	seekSimulation: function()
	{
		this.initVars();
		console.log("seekSimulation");

		for(var j = 0; j < this.myCSV["trim"].length; j++)
		{
			var v = this.myCSV["trim"][j];
			this.currentT = v[0];
			this.currentV = v[1];
			
			j++;  // tyler: why are you incrementing this?
			// if you want to do fill stack, maybe access this.myCSV["trim"] in function fillStack
			this.len = this.fillStack(j);
			if(this.len < this.stackSize)
			{
				this.updateCurrentPrevious();
				continue;
			}
			
			this.slope = computeM(this.tStack[0], this.tStack[this.len-1], this.vStack[0], this.vStack[this.len-1], 0);
			this.slopeBoolean = (Math.abs(this.slope) >= this.slopeTolerance) ? true: false;
			this.slopeSign = Math.sign(this.slope);
			this.deltaSlope = this.slope - this.slopePrevious;
			
			this.stats = computeOrderedStatistics(this.vStack);
			this.percentMAD = parseFloat(this.stats["MAD"]) / parseFloat(this.stats["median"]);  // tyler: is this the same units as the tolerances?  note the parseFloat in case it is weired ... 
			
			if(this.debug)
				{
				this.printDebug(j);
				}
			
			switch(this.state)
			{
				case "":
					//Assume state is always starting at a level voltage
					if(this.len == this.stackSize)
					{
						this.state = "seek";
					}
					break;
				
				case "level":
				
					var isLevel = this.checkIfLevel();
					
					if(isLevel)
					{
						this.state = "seek";
					}
					
				case "seek":
					
					var ifChange = this.checkIfChanging();
			
					if(ifChange)
						{
							this.state = "end-seek";
						}
					break;
					
					
				case "end-seek":
				
					var isCloseToPeak = this.checkifCloseToPeak();
					
					if (isCloseToPeak)
					{
						this.state = "find-extreme";
					}
					break;
			
					
				case "find-extreme":
					var extremeFound = this.checkIfExtremeFound();
					
					if(extremeFound)
					{
						this.state = "result";
						this.lookAheadCount = -1;
						this.timeoutStart = this.tf;
					}
					break;
					
				case "result":
					var result = this.checkType();
					this.punches.push( {"result": result, "t_0": this.t0, "t_f": this.tf, "V_0": this.v0, "V_f": this.vf, "recovery_strike?": false } );     

					this.state = "return-to-level";
					
					break;
					
				case "return-to-level":
				
					var isOverTime = this.isTimeout();
					var isReturned = this.checkIfReturned();
					var isStrike = this.checkIfStrikeWhileRecovering();
					
					if((isOverTime || isLevel) && !isStrike)
					{
						this.state = "level";
					}
					
					break;
			}
					
			this.updateCurrentPrevious();			
		}
	},
		
	updateCurrentPrevious: function()
	{
		this.slopePrevious = this.slope;
		this.previousV = this.currentV;
		this.previousT = this.currentT;
	},		
			
			
	fillStack: function(index)
	{
		if(this.tStack.length <= this.stackSize)
		{
			this.tStack.push(this.currentT);
			this.vStack.push(this.currentV); // this was a bug
		}
		else
		{
			this.tStack.shift();
			this.vStack.shift();
			this.tStack.push(this.currentT);
			this.vStack.push(this.currentV); // this was a bug
		}
		return this.tStack.length;
	},
		
	checkIfLevel: function()
	{
		if(this.vStack[this.vStack.length - 1] < this.VlvlMax 
			&& this.vStack[this.vStack.length - 1] > this.VlvlMin 
			&& this.percentMAD < this.triggerMAD)
		{
			return true;
		}
		return false;
	},
		
	checkIfChanging: function()
	{
		if(this.percentMAD > this.triggerMAD && this.slope != 0 && this.slopeBoolean)
		{
			this.v0 = this.currentV;
			this.t0 = this.currentT;
			this.seekMinOrMax = this.slopeSign;
			return true;
		}
		return false;
	}, 
		
	checkifCloseToPeak: function()
	{
		if(this.percentMAD < this.triggerMAD || this.percentMAD > this.extremeMAD)
		{
			return true;
		}
		return false;
		
	},
	
	checkIfExtremeFound: function()
	{
		if(this.lookAheadCount == -1)
		{
			this.vf = this.currentV ;
			this.tf = this.currentT;
			this.lookAheadCount++;  
			return false;
		}
		else
		{
			var isMoreExtreme;
			switch(this.seekMinOrMax)
			{
				case -1:
						isMoreExtreme = this.currentV < this.vf;
					break;
					
				case 1:
						isMoreExtreme = this.currentV > this.vf;
					break;
			}
			if(isMoreExtreme)
			{
				this.vf = this.currentV;
				this.tf = this.currentT;
				this.lookAheadCount = 0;
				return false;
			}
			this.lookAheadCount++;
			if(this.lookAheadCount == this.lookAheadAmount)
			{
				return true;
			}	
		}
	},
		
	checkType: function()
	{
		var types = ["press", "release", "strike"];
		
		var deltaT = this.tf - this.t0;
		var deltaV = Math.abs(this.vf - this.v0);
		var overallSlope = deltaV / deltaT;
		
		if(overallSlope < this.minStrikeVal && this.seekMinOrMax == -1)
		{
			return "release";
		}
		else if(overallSlope < this.minStrikeVal && this.seekMinOrMax == 1)
		{
			return "press";
		}
		else if(overallSlope > this.minStrikeVal && this.seekMinOrMax == 1)	
		{
			return "strike";
		}
		else
		{
			return "falseflag";
		}
		
		
	},
		
	isTimeout: function()
	{
		var time = this.tStack[this.tStack.length - 1];
		if( (time - this.timeoutStart) > (this.timeMultiple * this.timeConstant) )
		{
			return true;
		}
		return false;
	},
	
	checkIfReturned: function()
	{
		if(this.vStack[this.vStack.length - 1] < (this.v0 * (1 + this.levelTolerance))
			&& this.vStack[this.vStack.length - 1] > (this.v0 * (1 - this.levelTolerance)) )
			{
				return true;
			}
		return false;
	},
	
	checkIfStrikeWhileRecovering: function()
	{
		if(this.percentMAD > this.extremeMAD)
		{
			var parentStrike = this;
			//check if object is {} (ECMA5+)
			//https://stackoverflow.com/questions/679915/how-do-i-test-for-an-empty-javascript-object
			if (Object.keys(this.substrike).length === 0 && this.substrike.constructor === Object)
			{
				//copy method from one object to another
				//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind
				this.substrike = 
				{
					t0 : parentStrike.currentT,
					v0 : parentStrike.currentV,
					currentT : parentStrike.currentT,
					currentV : parentStrike.currentV,
					tf : 0,
					vf : 0,
					lookAheadCount : -1,
					seekMinOrMax : 1,
					minStrikeVal : parentStrike.minStrikeVal,
					checkIfExtremeFound : parentStrike.checkIfExtremeFound.bind(this),
					checkType : parentStrike.checkType.bind(this),
					checkIfReturned : parentStrike.checkIfReturned.bind(this)
				};
			}
			else
			{
				this.substrike.currentT = this.currentT;
				this.substrike.currentV = this.currentV;
				var isFoundSubExtreme = this.substrike.checkIfExtremeFound();
				if(isFoundSubExtreme)
				{
					var result = this.substrike.checkType();
					this.punches.push( {"result": result, "t_0": this.substrike.t0, "t_f": this.substrike.tf, "V_0": this.substrike.v0, "V_f": this.substrike.vf, "recovery_strike?": true } );
					var isOver = this.substrike.checkIfReturned();
					if(isOver)
					{
						this.substrike = {};
						return false;
					}
				}
			}
			return true;
		}
		return false;
		
	},
	
	getResults: function()
		{
			return this.punches;
		}
	
	};
	
	




	
	

	
	
	



function streamingPunchAlgorithm(myCSV,n=25,tol=0.5)
    {
    // n=25, number of elements in stack
    // tol = 0.5, derivative minimum absolute value
    console.log("      ++++++++++++++++++++++++++++++++++++++++++++++++++++      ");
    console.log("      +++++++++++++      " + n + "      ++++++++++++++++++      ");
    console.log("      +++++++++++++      " + tol + "      ++++++++++++++++++      ");
    console.log("      ++++++++++++++++++++++++++++++++++++++++++++++++++++      ");
    var punches = [];   // array of objects ...
    
    var tStack = [];    // time stack
    var vStack = [];    // voltage stack
    var mStack = [];    // slope stack
    
    var vStackLength;
    
    var currentT;       // current in stack
    var currentV;
    
    var firstT;         // first in stack
    var firstV;  
    
    
    
    
    
    
    
    
    

    var zCount = 0;         // how many consecutive dslopes are zero 
    var zThreshold = 5;     // how many consecutive zeroes to be classified as "true zero"
    
    var mCount = 0;         // how many consecutive dslopes are nonzero (moving) 
    var mThreshold = 5;     // how many consecutive nonzeroes to be classified as "true move"
    
    
    var lCount = 0;
    var lThreshold = 5;     // how many values passed actual MAX/MIN should I keep looking before I decide...
    
    
    var state = "";  // level, press, release, strike    
    var seekingMin = false;
    var seekingMax = false;
            
    var t_0 = 0;
    var t_t = 0;
    
    var V_0 = 0;
    var V_t = 0;
    
    var tc = 0.330;  // expected recovery is 3x this ... about one second based on RC circuit ...
    
    var stats;
    var msd;
    var range;
    var IQR;
    var MAD;
    
    
    var deltaV;
    var signV;
    
    var dslope;
    var signSlopeD;


    var aslope; 
    var signSlopeA;
    
    
    var i = 0;    
    $.each( myCSV["trim"], function( k, v ) {
            i++;
            
            currentT = v[0];
            currentV = v[1];
            console.log(" ##################      " + i + "      ##################      " + currentT);
            
            if(i == 1)
                {
                firstT = currentT;  
                firstV = currentV;
                
                t_0 = currentT;
                V_0 = currentV;
                }
                
            deltaV = currentV - V_0;
            signV = Math.sign(deltaV);
            
            //console.log("vStack");
            //console.log(vStack);
                
            console.log("add to stack");
            tStack.push(currentT);   
            vStack.push(currentV);    
            
            if(vStack.length >= n)
                {
                
                //console.log("tStack");
                //console.log(tStack);   
                //console.log("vStack");
                //console.log(vStack);  
                    console.log("-->  First T: " + firstT + " ---> Current T: " + currentT);
                    console.log("-->  First V: " + firstV + " ---> Current V: " + currentV);
                    
                stats = computeOrderedStatistics(vStack);    
                msd = computeMeanSD(vStack);    
                dslope = computeM(firstT,currentT,firstV,currentV,tol);  // compute "muted" slope as derivative
                    signSlopeD = Math.sign(dslope);
                aslope = computeM(firstT,currentT,firstV,currentV,0);    // compute "actual" slope as derivative
                    signSlopeA = Math.sign(aslope);
                    
                    console.log("-->  Slope D: " + dslope + " ---> Slope A: " + aslope);
                    console.log(msd);
                    console.log(stats);
                    
                    
                 // range as a percent of median    > 3%        ?
                 // MAD as a percent of median      > 1/2%      ?
                 // IQR as a percent of median      > 1%        ?
                 
                 range  = Math.round(100*1000  *stats["range"])    /1000;
                 MAD    = Math.round(100*1000  *stats["MAD"])      /1000;
                 IQR    = Math.round(100*1000  *stats["IQR"])      /1000;
                 
                 console.log("===>  Range % ( > 3): " + ((range > 3) ? range : "") + " ===> MAD % ( > 0.5): " + ((MAD > 0.5) ? MAD : "") + " ===> IQR % ( > 1): " + ((IQR > 1) ? IQR : "")      );
                    
                    
                    
                    
                    
                    
                    
                    
                    
                    
                    
                    
                    
                    
                    
                    
                    
                    
                    
                    
                    
                    
                    
                // drop from front ... and update "first"    
                firstT = tStack.shift();  
                firstV = vStack.shift();  
                    console.log("-->  First V: " + firstV + " ---> Current V: " + currentV);
                console.log("remove from stack");
                //console.log("vStack");
                //console.log(vStack);  
                }
                
            
            });
            
            
    return punches;        
    }
    
    
    
    