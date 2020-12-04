
function computeMedian(MedianArr,sorted=false)
    {
    // do a deep copy i.e without object reference
    var arr = JSON.parse(JSON.stringify(MedianArr));  // is the sort propagating?
    // https://stackoverflow.com/questions/9885821/copying-of-an-array-of-objects-to-another-array-without-object-reference-in-java
    // This did not work for me under Google Chrome 25.
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
    // The time and space complexity of the sort cannot be guaranteed as it is implementation dependent.      
    if(!sorted) { arr.sort(function(a,b){return a - b}); }
    var n = arr.length;
    var half = Math.ceil(n/2);
    var median = (n % 2 == 0) ? (arr[half] + arr[half-1])/2 : arr[half-1];
    
    return median;
    }
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
function computeOrderedStatistics(OrderedArr,sorted=false)
    {
    // do a deep copy i.e without object reference
    var arr = JSON.parse(JSON.stringify(OrderedArr));  // is the sort propagating?
    // https://stackoverflow.com/questions/9885821/copying-of-an-array-of-objects-to-another-array-without-object-reference-in-java
    // This did not work for me under Google Chrome 25.
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
    // The time and space complexity of the sort cannot be guaranteed as it is implementation dependent.
    var n = arr.length;
    if(n < 1) { return {"min": false, "max": false, "range": false, "median": false, "Q1": false, "Q3": false, "IQR": false, "MAD": false}; } 
    if(n < 2) { return {"min": arr[0], "max": arr[0], "range": 0, "median": arr[0], "Q1": arr[0], "Q3": arr[0], "IQR": 0,  "MAD": 0}; } 
    
    // one loop:  min, max, sorted, quartiles?
    if(!sorted) { arr.sort(function(a,b){return a - b}); }
    var half = Math.ceil(n/2);  
    var median = computeMedian(arr,true);
    var lower = arr.slice(0,half-1);                var Q1 = computeMedian(lower,true);
    var upper = arr.slice(-1*(lower.length));       var Q3 = computeMedian(upper,true);    
    
    return {"min": arr[0], "max": arr[n-1], "range": (arr[n-1] - arr[0]), "median": median, "Q1": Q1, "Q3": Q3, "IQR": Q3-Q1,  "MAD": computeMAD(arr,true)};
    }
    
function computeMAD(MadArr,sorted=false)
    {
    // do a deep copy i.e without object reference
    var arr = JSON.parse(JSON.stringify(MadArr));  // is the sort propagating?
    // https://stackoverflow.com/questions/9885821/copying-of-an-array-of-objects-to-another-array-without-object-reference-in-java
    // This did not work for me under Google Chrome 25.
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
    // The time and space complexity of the sort cannot be guaranteed as it is implementation dependent.        
    if(!sorted) { arr.sort(function(a,b){return a - b}); }
    var median = computeMedian(arr,true);
    var mad = arr.map( x => Math.abs(x - median) );    
    return computeMedian(mad);    
    }    
    /*
    computeOrderedStatistics([12, 13, 14, 17, 18, 21, 3, 5, 7, 8]);
    computeOrderedStatistics([12, 13, 14, 18, 21, 3, 5, 7, 8]);
    
    computeOrderedStatistics([1.69049, 1.72319, 1.72218, 1.72016, 1.72083, 1.70735, 1.73162, 1.72757, 1.72218, 1.7178, 1.7178, 1.72454, 1.72825, 1.73162, 1.72488, 1.72117, 1.71611, 1.72049, 1.72656, 1.73027, 1.72993, 1.72656, 1.72488, 1.70465, 1.70903]);
    
    
    computeMAD([1, 1, 2, 2, 4, 6, 9]);
    computeMAD([1, 1, 0, 0, 2, 4, 7]);
    */
    
    // https://mathjs.org/
    // https://unpkg.com/mathjs@5.7.0/dist/math.js ... how to package own functions into a module ...
    // has median and mad ...
    
    // Math.min() ... maybe make object Stats.function() with a collection of functions ...
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math
    // see gcd for [extending the Math.object]
    // see IE sucks for full compatiblity ... 
    // well organized, but horribly written ... write my own.
    // https://github.com/simple-statistics/simple-statistics/blob/master/src/mode.js
function computeMeanSD(MeanArr,method="unbiased")
    {
    // do a deep copy i.e without object reference
    var arr = JSON.parse(JSON.stringify(MeanArr));  // is the sort propagating?
    // https://stackoverflow.com/questions/9885821/copying-of-an-array-of-objects-to-another-array-without-object-reference-in-java
    // This did not work for me under Google Chrome 25.
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
    // The time and space complexity of the sort cannot be guaranteed as it is implementation dependent.      
    var n = arr.length;
    if(n < 1) { return {"mean": false, "sd": false}; } 
    if(n < 2) { return {"mean": arr[0], "sd": false}; }
    
    
    var sum = 0;
    var sum2 = 0;
    for(var i=0; i<n; i++)
        {
        sum += arr[i];  
        sum2 += arr[i]*arr[i];        
        }
    var mean = sum/n;
    var variance;
    // sample variance
    switch(method)
        {
        default:
        case "unbiased":
            variance = (sum2 - sum*sum/n)/(n-1);
        break;
        case "uncorrected":
            variance = (sum2 - sum*sum/n)/(n);
        break;
        case "biased":
            variance = (sum2 - sum*sum/n)/(n+1);
        break;
        }
    var sd = Math.sqrt(variance);
        // still possibly to have 0 for sd ... if all of the same value ...
    return {"mean": mean, "sd": sd};
    }
function computeAvg(arr)
    {
    var sum = 0;
    var n = arr.length;
    if(n < 1) { return 0; }
    for(var i=0; i<n; i++)
        {
        sum += arr[i];    
        }
    return sum/n;
    }
function computeM(x1,x2,y1,y2,tol=0.5)
    {
        // computeM(firstT,currentT,firstV,currentV,tol);
    //console.log("computeM");
    //console.log(arguments);
	
	//Undefined slope
	if ((x2-x1) == 0)
	{
		return 0;
	}
	
    var slope = (y2-y1) / (x2-x1);  
//console.log("slope: "+slope);    
    if(Math.abs(slope) < tol)
        {
        slope = 0;
        //console.log("slope: "+0);  
        }
    
    return slope;
    }
    
    
    // functions addPlotBand(), addPlotLine(), removePlotBand() or removePlotLine()
    
    /*
function computeSlopes(tStack,vStack,m=1,tol=0.5)
    {
    var n=tStack.length;
    var n2 = Math.floor(n/2);
    var slopes = [];
    // end points every time 
    slopes.push( computeM(tStack[0],tStack[n-1],vStack[0],vStack[n-1],tol) );
    if(m==1) { return slopes[0]; }
    
    for(var i=2;i<m;i++)
        {
        var c =  24*Math.exp(-Math.log(2) * i); // create segments from center
        slopes.push( computeM(tStack[0+c],tStack[n-1-c],vStack[0+c],vStack[n-1-c],tol) );
        }
    
    // e.g., 0...24 is n = 25
    
    // if m=1 ... 0, 24 determine slope
    // if m=2 ... 0, 24 ... and 
    return computeAvg(slopes);
    }
    
    
    
    Array.prototype.getFirstInArray = function() {return this[0];}
    Array.prototype.getLastInArray = function() {return this[this.length-1];}
    */
    