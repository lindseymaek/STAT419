


function updateHighChartImportCSV(hid,myCSV)
    {
    console.log("updateHighChartImportCSV");
    var chart=$("#"+hid).highcharts(); 
    console.log(chart);
    
    if(typeof myCSV["rawdata"] != 'undefined')
        {
        chart.series[0].setData( myCSV["rawdata"], true, false, true);
        }
    if(typeof myCSV["derivative"] != 'undefined')
        {
        chart.series[1].setData( myCSV["derivative"], true, false, true);
        }
    if(typeof myCSV["trim"] != 'undefined')
        {
        chart.series[2].setData( myCSV["trim"], true, false, true);
        }
		
		
	//chart.series[3].setData( polygons, true, false, true);
	
    }


var bandColors = {"press": "#00FFFF", "release": "#0000FF", "falseflag": "#FCFFC5", "strike" : "#00FF00"};    
function updateHighChartPunches(hid,punches)
	{
	var polygons = [];
	console.log("updateHighChartPunches");
	var chart=$("#"+hid).highcharts();
	// let's delete series > 2
		for(var j=3;j<chart.series.length;j++)
			{
			chart.series[j].remove();
			}
	// let's add series for each polygon  
	for(var i=0;i<punches.length;i++)
		{
		var punch = punches[i];
			var result = punch.result;
			punch.deltaT = punch.t_f - punch.t_0;
			punch.deltaV = punch.V_f - punch.V_0;
		console.log(punch);
			var poly = [[punch.t_0,punch.V_0],[punch.t_f,punch.V_f],[punch.t_f,punch.V_0]];
			chart.addSeries({
							name: 'STRIKE-'+i,
                            type: 'polygon',
                            yAxis: 0,
							tooltip: 	{
										crosshairs: [true,true],
										useHTML: true,		
										shared: false,
										// http://jsfiddle.net/28qzg5gq/12/
										pointFormatter: function() {
											// need to customize
																var str= '<span style="font-weight: bold; font-size: 200%;">' + 'STRIKE-'+i + '</span><BR>';	
																str += '<span style="font-weight: bold;">Force (V):</span>'+punch.deltaV+'<BR>';	
																str += '<span style="font-weight: bold;">Time (T):</span>'+punch.deltaT+'<BR>';	
																  
																return str;
																},
										positioner: function() {
											// in pixel units, not plot values
																  return { x:50,y:50 };
																}
										},
							//color: Highcharts.Color(Highcharts.getOptions().colors[2]).setOpacity(0.5).get(),
							color: bandColors[result],
							enableMouseTracking: true,
                            showInLegend: false,							
                            data: poly
							

						});
						
						/*
						
										formatter: function() {
											console.log("formatter");
											console.log(this);
																var str = 'HELLO';
																return str;
															},
															
															*/
					// https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/tooltip/formatter-conditional-default/	
			//series.addPoint(poly);
			//polygons.push(poly);
		/*
		chart.xAxis[0].addPlotBand({
            from: punch.t_0,
            to: punch.t_f,
            color: bandColors[result],
            id: 'plot-band-'+i
			});
		*/
		console.log(result);
		console.log(poly);
		console.log(bandColors[result]);
		}
	console.log(polygons);
	//chart.series[3].setData( polygons, true, false, true);	
	// we have polygons ...

	return polygons;
	}    
    
function rtrim(str){
    return str.replace(/\s+$/, "");
}
function ltrim(str){
    return str.replace(/^\s+/, "");
}


// https://stat.ethz.ch/R-manual/R-devel/library/utils/html/read.table.html
// could include lots of other options
function parseWaveFormCSV(stringCSV,skip=9,colnames=["time","voltage"],sep=",",crlf="\n")
    {
    // we skip undefined and NaN values ...
    var lines = stringCSV.split(crlf);
    //console.log(lines);
    
    var idx = 0;
    var obj = {};
        obj["rawdata"] = []; // in x,y form for highcharts
        obj["rawindex"] = {}; // ability to reference as objects
        obj["rawtime"] = {}; // ability to reference as objects
        
    for(var i=0; i<lines.length; i++)
        {
        if(i>9)
            {
            var line = $.trim(lines[i]);
            //console.log("i: "+i+" --> "+line);
            if(line != "")
                {
                var good = true;
                var ldata = line.split(sep);
                
                var values = [];
                    for(var j=0; j<ldata.length; j++)
                        {
                        values[j] = parseFloat(ldata[j]);
                        if(isNaN(values[j])) 
                            {
                            good = false; 
                            }
                        }
               if(good)
                   {
                   // we have good data
                   var row = [];
                   obj["rawindex"][idx] = {};
                   var itime = values[0];  // first value must be "time" ... 
                   obj["rawtime"][itime] = {};
                   for(var j=0; j<ldata.length; j++)
                        {
                        var key = colnames[j];
                        var val = values[j];
                        row[j] = val;
                        obj["rawindex"][idx][key]=val;
                        obj["rawtime"][itime][key]=val;
                        }
                   obj["rawindex"][idx]["i"] = i;
                   obj["rawtime"][itime]["i"] = i;
                   obj["rawtime"][itime]["idx"] = idx;
                   obj["rawdata"][idx] = row;
                   idx++;
                   }
                }
            }
        }
    return obj;
    }

    




function trimVoltage(myCSV,tol=0.01)  // time tolerance 
    {
    var raw =  myCSV["rawdata"];
    // myCSV["trim"] = raw;  return myCSV;
    
    
    // this is behaving poorly?
    var trim = [];
    var idx = 0;
    var current = previous = delta = 0;  // time ...
    $.each( raw, function( k, v ) {
          //console.log( k + ": "); 
          //console.log( v );
          current = v[0];
          delta = Math.abs(current-previous);
          //console.log("delta: "+delta);
          if(delta > tol)
            {
            //console.log("added");
            trim[idx] = v;  
            idx++;
            previous=current;
            }
        });
    myCSV["trim"] = trim;
    return myCSV;
    }
    
    
    
    

    
    
    
    
    
    
    
    
                
function prepareStackWithDerivatives(myCSV,n=25,m=1,tol=0.5)    // n is the stack size  // m is how many sub-slopes // tolerance to consider slope to be non-zero ... 
    {
    // compute derivative when stack fills
    var trim =  myCSV["trim"];
    var tStack = [];    // time stack
    var vStack = [];    // voltage stack
    var derivative = []; // compute derivative manually at k, using v_k and v_(k-25)
    var derivativeFull = [];
    
    // compute other statistics on the current stack
    var range = [];
    var MAD = [];
    var IQR = [];
    var Medians = [];
    var Means = [];
    var SD = [];
    
    var currentT;
    var currentV;
    var firstT;
    var firstV;
    
    var i = 0;
    
    $.each( trim, function( k, v ) {
            i++;
            //console.log("############################################");
            //console.log( "["+i+"] " + k + ": " + v[0] + " , " + v[1] );
            
            //console.log("stack-lenght: "+vStack.length);
            //console.log(vStack);
            
            //console.log("add items");
            currentT = v[0];
            currentV = v[1];
            if(i == 1)
                {
                firstT = currentT;  
                firstV = currentV;
                }
                
                tStack.push(currentT);   // unshift
                vStack.push(currentV);
                
            if(vStack.length >= n)
                {
                 var stats = computeOrderedStatistics(vStack);
                    //range.push( [ currentT , stats["range"] ] );
                    //MAD.push( [ currentT , stats["MAD"] ] );
                    //IQR.push( [ currentT , stats["IQR"] ] );
                    //Medians.push( [ currentT , stats["median"] ] );
                    
                    
                    range.push( [ currentT , stats["range"]/stats["median"] ] );  // make a percent  3%?
                    MAD.push( [ currentT , stats["MAD"]/stats["median"] ] );   // make a percent  1/2%?
                    IQR.push( [ currentT , stats["IQR"]/stats["median"] ] );  // make a percent  1%?
                    Medians.push( [ currentT , stats["median"] ] );
                var msd = computeMeanSD(vStack);
                    Means.push( [ currentT , msd["mean"] ] );
                    SD.push( [ currentT , msd["sd"] ] );

                var dslope = computeM(firstT,currentT,firstV,currentV,tol);                
                derivative.push( [ currentT , dslope ] );
                
                var dslopeF = computeM(firstT,currentT,firstV,currentV,0);                
                derivativeFull.push( [ currentT , dslopeF ] );

                firstT = tStack.shift();  // let's drop the first element ... this will be off by one index, but so what...
                firstV = vStack.shift();
                }
            
            
            /*
            //console.log("stack-lenght: "+vStack.length);
            //console.log(vStack);
            
            if(vStack.length > n ) 
                {
                //console.log("stack-lenght: "+tStack.length);
                //console.log("trim stack");
                //console.log("drop items");
                var firstT = tStack.shift();   
                var firstV = vStack.shift();    
                //console.log("stack-lenght: "+tStack.length);
                
                //console.log("stack-lenght: "+vStack.length);
                //console.log(vStack);
                
                firstT = tStack[0];
                firstV = vStack[0];
                }

            
            
            
            if(vStack.length >= n)
                {
                
                
                //       debugger;
                
                
                
                
                
                
                //console.log(tStack);
                //console.log(vStack);
                
                
                var stats = computeOrderedStatistics(vStack);
                    range.push( [ currentT , stats["range"] ] );
                    MAD.push( [ currentT , stats["MAD"] ] );
                    IQR.push( [ currentT , stats["IQR"] ] );
                    Medians.push( [ currentT , stats["median"] ] );
                var msd = computeMeanSD(vStack);
                    Means.push( [ currentT , msd["mean"] ] );
                    SD.push( [ currentT , msd["sd"] ] );
                
                
                //var dslope = computeM(tStack[0],tStack[n-1],vStack[0],vStack[n-1],tol);
                //var dslope = computeM(tStack.getFirstInArray(),tStack.getLastInArray(),vStack.getFirstInArray(),vStack.getLastInArray(),tol);
                
                
                // vStack was getting confused ... WTF?
                // var dslope = computeM(tStack[0],currentT,vStack[0],currentV,tol);
                
                var dslope = computeM(firstT,currentT,firstV,currentV,tol);
                
                
                derivative.push( [ currentT , dslope ] );
                }
                
                */
                
                
                
                
            });
    
    
    myCSV["derivative"] = derivative;
    myCSV["derivativeFull"] = derivativeFull;
    myCSV["range"] = range;
    myCSV["MAD"] = MAD;
    myCSV["IQR"] = IQR;
    myCSV["Medians"] = Medians;
    myCSV["Means"] = Means;
    myCSV["SD"] = SD;
    return myCSV;
    }
    
    
    // Math.sign may not work in IE
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/sign
    
    if (!Math.sign) {
  Math.sign = function(x) {
    // If x is NaN, the result is NaN.
    // If x is -0, the result is -0.
    // If x is +0, the result is +0.
    // If x is negative and not -0, the result is -1.
    // If x is positive and not +0, the result is +1.
    return ((x > 0) - (x < 0)) || +x;
    // A more aesthetical persuado-representation is shown below
    //
    // ( (x > 0) ? 0 : 1 )  // if x is negative then negative one
    //          +           // else (because you cant be both - and +)
    // ( (x < 0) ? 0 : -1 ) // if x is positive then positive one
    //         ||           // if x is 0, -0, or NaN, or not a number,
    //         +x           // Then the result will be x, (or) if x is
    //                      // not a number, then x converts to number
  };
}


    
    // if non-zero is only one element, it is definitely noise at slope tol=0.5
function simulatePunch(myCSV)
    {
    var punches = [];
    var state = "";  // level, press, release, strike
    
    
    var t_0 = 0;
    var t_t = 0;
    
    var V_0 = 0;
    var V_t = 0;
    
    var tc = 0.330;  // expected recovery is 3x this ... about one second based on RC circuit ...
    
    // is this value and derivative tolerance related ... e.g., dtol = 2*tc ?????
    
    // time-constant (tc) with current resolution and derivative tolerance seems to have basically a zero slope ... 
    
    
    var i = 0;
    
    var vStack = [];  // voltage stack ... report false-flag ... if too few points ...
    var toleranceFalseFlag = 4;  // at least 4 elements to be considered a true spike, with derivative tolerance at 0.5
    
    
    
    
    var zStack = [];  // zero stack ... if we are trending, and we get a few zeroes, but the trend continues, let's ignore the zero...
    var skipZeroes = 6;  // once we have six zeroes in a row, it has really reached zero ... see time = -7.92 as false flag ... at 25 this was about 5, at 35 this was about 7
    
    /*
    t=-3 ... we have a big deltaV that is not registering on voltage ... no derivate ...
    
    do a local search for maximum ... if zero has occured, look forward 25 elements....
    */
    
    console.log(myCSV);
    
    $.each( myCSV["derivative"], function( k, v ) {
            i++;
            
            var time = v[0];
            var deriv = v[1];  // could we just store non-zero values ... the simulation ... real-life will have only one in memory at a time ... 
            
            var sign = Math.sign(deriv);
            var currentV = myCSV["rawtime"][time]["voltage"];            
            var vn = vStack.length;
            
            
            var deltaV = V_0 - currentV;
            var signV = Math.sign(deltaV);
            
            var seekingMin = false;
            var seekingMax = false;
            
            
            var range = myCSV["range"][k][1];
            var sd = myCSV["sd"][k][1];
            var MAD = myCSV["MAD"][k][1];
            var IQR = myCSV["IQR"][k][1];
    
            
            
            // more detailed value of derive ...
            var derivF = myCSV["derivativeFull"][k][1];
            var signF = Math.sign(derivF);
            
            
            // console.log( k + ": "); 
            // console.log( v );
            
            console.log(time + " <--------> " + "State: " + state + " ==> Time: " + time + " ==> Derivative: " + deriv + " ==> Sign: " + sign + " ==> Current Voltage: " + currentV);
            console.log(vStack);
            console.log("DerivativeF: " + derivF + " ==> SignF: " + signF);
            console.log("DeltaV: " + deltaV + " ==> SignV: " + signV);
            
            
             console.log("range: " + range + " ==> sd: " + sd + " ==> MAD: " + MAD + " ==> IQR: " + IQR);
            
           if(i==1)
                {
                // first value
                state = "level";
                t_0 = time;
                V_0 = myCSV["rawtime"][t_0]["voltage"];
                }       
            
            
           switch(state)
            {
            case "level":
                switch(sign)
                    {
                    case 0: // if level, let's just  V_0                        
                        vStack = [];
                        vStack.push(V_0);
                        zStack.push(t_0);                        
                        console.log("### LEVEL ### ... level - updating V_0 ... " + V_0);
                    break;
                    
                    case 1: // positive slope [press]
                        state = "press";
                        vStack.push(currentV);
                        zStack = [];
                        
                        console.log("--------------------------------------");
                        console.log("### LEVEL ### ... pressed [positive slope] - currentV ... " + currentV);
                    break;
                    
                    case -1: // negative slope [release]
                        state = "release";
                        vStack.push(currentV);
                        zStack = [];
                        console.log("--------------------------------------");
                        console.log("### LEVEL ### ... released [negative slope] - currentV ... " + currentV);
                    break;
                    }
                    
                    

            break; 


            case "press":  // positive slope [press] ... tc recovery should be complete after currentV - V_0 = 0ish ... ?
                switch(sign)
                    {
                    
                    case 1: 
                        // should be positive slope ... just update stack if needed
                        if(vn <= toleranceFalseFlag)
                           {                                 
                           vStack.push(currentV);
                           }
                        console.log("### PRESS ### ... still tracking press ... ");
                        zStack = [];
                    break;
                    
                    case -1: 
                            // if negative, like zero
                    case 0: // if back to zero, we are done with press state?
                            // if zero, but stack wasn't large enough, then maybe a false flag ...
                            
                            if(vn >= toleranceFalseFlag)
                                {
                                var result = "pressed";    
                                }
                                else
                                    {
                                    console.log("### PRESS ### ... false flag");  
                                    console.log("======================================");                                    
                                    // if zero, but stack wasn't large enough, then maybe a false flag ...
                                    var result = "falseflag";
                                    }  
                                    
                            state = "level";  
                            if(sign == -1) { state = "release"; zStack = []; }
                            if(sign == 0) 
                                {
                                //t_0 = time;
                        //V_0 = myCSV["rawtime"][t_0]["voltage"];
                                zStack.push(time); 
                                }
                                t_t = time;
                                V_t = myCSV["rawtime"][t_t]["voltage"];
                            punches.push( {"result": result, "t_0": t_0, "t_t": t_t, "V_0": V_0, "V_t": V_t } );
                            
                    break;
                    }
            
            break;
            
            
            
            
            case "release":  // negative slope [release]
                switch(sign)
                    {
                    case 1: 
                            // if positive, like zero
                    case 0: // if back to zero, we are done with press state?
                            // if zero, but stack wasn't large enough, then maybe a false flag ...
                            if(vn >= toleranceFalseFlag)
                                {
                                var result = "released";    
                                }
                                else
                                    {
                                    console.log("### RELEASE ### ... false flag");  
                                    console.log("======================================");                                    
                                    // if zero, but stack wasn't large enough, then maybe a false flag ...
                                    var result = "falseflag";
                                    }  
                                    
                            state = "level";  
                            if(sign == 0) { zStack.push(time); }
                            if(sign == -1) { state = "press"; zStack = []; }
                                t_t = time;
                                V_t = myCSV["rawtime"][t_t]["voltage"];
                            punches.push( {"result": result, "t_0": t_0, "t_t": t_t, "V_0": V_0, "V_t": V_t } );                            
                    break;
                    
                    case -1: 
                        zStack = [];
                        // should be positive slope ... just update stack if needed
                        if(vn <= toleranceFalseFlag)
                           {                                 
                           vStack.push(currentV);
                           }
                        console.log("### RELEASE ### ... still tracking release ... ");
                    break;
                    
                    }
            
            break;
            
            
            }
            
            
            // debugger;
            
            
            console.log(vStack);
            console.log("punches");
            console.log(punches);
            
        });
    
    // we start tracking a stack if we reach a count
    
    // we need to know if the direction is up "press" or down "release"
    
    // updateState
    
    // seekSlope, seekMin/Max, findZeroIsh, "changeSign" ...
    // maybe change V0 any time we hit zero ... in "seekSlope"
    
    
    return punches;    
    }
    
    
    
    
    
function loadDataIntoHighChart(hid,dstring,format="csv")
    {
        
    }


    /*
    https://stackoverflow.com/questions/33960561/highcharts-stop-y-axis-value-change-on-redraw
    
    chart: {
        zoomType: 'x',
        alignTicks:false
    },
    
    
    http://jsfiddle.net/b1vrvn2q/9
    
    chartOptions
    
    
    */
    
    
    
    
  function base64_encode(str)
	{
	return window.btoa(str);
	}
function base64_decode(str)
	{
	return window.atob(str);
	}
function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function pluginHighChart()
	{
	Highcharts.SVGRenderer.prototype.symbols.star = function(x, y, w, h) {
			return [
			  'M', x, y + 0.4 * h,
			  'L', x + 0.35 * w, y + 0.35 * h,
			  'L', x + 0.5 * w, y,
			  'L', x + 0.65 * w, y + 0.35 * h,
			  'L', x + w, y + 0.4 * h,
			  'L', x + 0.75 * w, y + 0.65 * h,
			  'L', x + 0.85 * w, y + h,
			  'L', x + 0.5 * w, y + 0.8 * h,
			  'L', x + w * 0.15, y + h,
			  'L', x + 0.25 * w, y + 0.65 * h,
			  'Z'
			];
		  };

	  if (Highcharts.VMLRenderer) {
		Highcharts.VMLRenderer.prototype.symbols.star = Highcharts.SVGRenderer.prototype.symbols.star;
	  }
	
	// Small plugin to allow marker symbol settings to affect bubbles
	Highcharts.wrap(Highcharts.seriesTypes.bubble.prototype, 'translate', function(proceed) {
			var renderer = this.chart.renderer,
			  symbol = this.options.marker.symbol;

			proceed.call(this);
			if (symbol && renderer.symbols[symbol]) {
			  Highcharts.each(this.data, function(point) {
				point.shapeType = 'path';
				point.shapeArgs = {
				  d: renderer.symbols[symbol](
					point.dlBox.x,
					point.dlBox.y,
					point.dlBox.width,
					point.dlBox.height
				  ),
				  r: 0
				};
			  });
			}
		  });
	}
    
    
    function similarityTable(svd)
	{
	console.log(svd);
	var str = '';
		str += '<table border=0 style="margin-left:auto; margin-right:auto; ">';
		str += '<tr><th colspan=4 style="padding: 3px; text-align: center; text-decoration: underline;">SIMILARITY SCORES</th></tr>';
		str += '<tr><th style="padding: 3px; text-align: center;">Excerpt</th><th style="padding: 3px; text-align: center;">Pythagoras</th><th style="padding: 3px; text-align: center;">Newton</th><th style="padding: 3px; text-align: center;">Einstein</th></tr>';
		str += '<tr><th style="padding: 3px; text-align: center;">'+ Math.round( svd["presvd-idea"] * 10) / 10 +'</th><th style="padding: 3px; text-align: center;">'+ Math.round( svd["presvd-subset"] * 10) / 10 +'</th><th style="padding: 3px; text-align: center;">'+ Math.round( svd["svd500"] * 10) / 10 +'</th><th style="padding: 3px; text-align: center;">'+ Math.round( svd["svd100"] * 10) / 10 +'</th></tr>';
		str += '</table>';
	return str;
	}
    
    
    
    function resizeContainer(cid,hid,fid,highchart=false)
	{
    // resize a container (cid) to maximize size given a header (hid) and footer (fid)   
    var cobj = $("#"+cid);
    var hobj = $("#"+hid);
    var fobj = $("#"+fid);
        
        var height = Math.abs( cobj.offset().top - fobj.offset().top ) - hobj.height;
			console.log("height:" + height);
		var width = document.body.clientWidth - 5;
            console.log("width:" + width);
            
    if(highchart)
        {
        var chart = cobj.highcharts();    
        // $(".highcharts-tooltip>span").width(width-50);
            chart.setSize(width, height, false	); 
        }
    
	}
    
    
    
    function updateFormatters(_options,which)
	{
	console.log("_options"); console.log(_options);
	
	switch(which)
		{
		case "nnp":
			_options.plotOptions.series.point.events.click = function(e) { 
						var obj = e.point; 
						doZoom(obj.x, obj.y); 
						var chart=$("#highchart-container").highcharts(); 
							chart.showResetZoom();
						}
				
				_options.plotOptions.series.point.events.select = function(e){ doZoom(e.target.x,e.target.y);  }
					
					
				_options.tooltip.formatter = function () {
						var info = JSON.parse( base64_decode(this.point.info) );
						console.log(info);
						var str = '';
						if(this.point.name != "idea")
							{
							
							var similarity = similarityTable(info["svd"]);
							var firms = '';
							for(var i=0;i<info["firms"].length;i++)
								{
								firms += info["firms"][i]['name'] + "<BR />";
								}
							var inventors = '';
							for(var i=0;i<info["inventors"].length;i++)
								{
								inventors += info["inventors"][i]['name'] + "<BR />";
								}
								str += '<table border=0>';
								str += '<tr><th colspan="3" style="text-align: center;"><h3 style="padding: 5px; margin: 0px;">'+info["formatted"]+'</h3></th></tr>';
								str += '<tr><th colspan="3" style="text-align: center; font-size: 75%;">'+similarity+'</th></tr>';
								str += '<tr bgcolor="#cccccc"><th colspan="3" style="text-align: center; "><h3 style="padding: 5px; margin: 0px; font-size: 125%;">'+info["title"]+'</h3></th></tr>';
								str += '<tr><th colspan="3" style="text-align: center; font-size: 75%;">Series Code: '+info["series_code"]+'</th></tr>';
								str += '<tr><th colspan="3" style="text-align: center; font-size: 75%;">'+info["datetype"]+': '+info["datevalue"]+'</th></tr>';
								str += '<tr><th style="text-align: center; text-decoration: underline;" width="49%">FIRM(s)</th><th style="text-align: center;"> </th><th style="text-align: center; text-decoration: underline;" width="49%">INVENTOR(s)</th></tr>';
								str += '<tr><td style="text-align: center;" valign="top">'+firms+'</td><td style="text-align: center;"> </td><td style="text-align: center;" valign="top">'+inventors+'</td></tr>';
								str += '<tr><th colspan="3" style="font-size: 67%;">'+info[	"classification"]+'</th></tr>';
								str += '<tr><td colspan="3" style="text-align: left; font-size: 75%;">'+info["abstract"]+'</td></tr>';
								
								str += '</table>';
							}
							else
								{
								return false;
								}
			
						
					return str;
					}
		break;
		
		case "fto":
			// Date.UTC not evaluated ...
			
			_options.plotOptions.series.point.events.click = function(e) { 
						var obj = e.point; 
						doZoom(obj.x, obj.y); 
						var chart=$("#highchart-container").highcharts(); 
							chart.showResetZoom();
						}
						
			_options.xAxis.min = eval(_options.xAxis.min);
			_options.xAxis.max = eval(_options.xAxis.max);
			
			_options.xAxis.plotBands[0].from = eval(_options.xAxis.plotBands[0].from);
			_options.xAxis.plotBands[0].to = eval(_options.xAxis.plotBands[0].to);
			
			_options.xAxis.plotBands[1].from = eval(_options.xAxis.plotBands[1].from);
			_options.xAxis.plotBands[1].to = eval(_options.xAxis.plotBands[1].to);
			
			_options.xAxis.plotLines[0].value = eval(_options.xAxis.plotLines[0].value);
				
			_options.plotOptions.series.point.events.select = function(e){ doZoom(e.target.x,e.target.y);  }
				
			_options.tooltip.formatter = function () {
					var info = JSON.parse( base64_decode(this.point.info) );
					console.log(info);
					var firms = '';
					for(var i=0;i<info["firms"].length;i++)
						{
						firms += info["firms"][i]['name'] + "<BR />";
						}
					var inventors = '';
					for(var i=0;i<info["inventors"].length;i++)
						{
						inventors += info["inventors"][i]['name'] + "<BR />";
						}
					var str = '';
						str += '<table border=0>';
						str += '<tr><th colspan="3" style="text-align: center;"><h3 style="padding: 5px; margin: 0px;">'+info["formatted"]+'</h3></th></tr>';
						
						str += '<tr bgcolor="#cccccc"><th colspan="3" style="text-align: center; "><h3 style="padding: 5px; margin: 0px; font-size: 125%;">'+info["title"]+'</h3></th></tr>';
						str += '<tr><th colspan="3" style="text-align: center; font-size: 75%;">Series Code: '+info["series_code"]+'</th></tr>';
						str += '<tr><th colspan="3" style="text-align: center; font-size: 75%;">'+info["datetype"]+': '+info["datevalue"]+'</th></tr>';
						str += '<tr><th style="text-align: center; text-decoration: underline;" width="49%">FIRM(s)</th><th style="text-align: center;"> </th><th style="text-align: center; text-decoration: underline;" width="49%">INVENTOR(s)</th></tr>';
						str += '<tr><td style="text-align: center;" valign="top">'+firms+'</td><td style="text-align: center;"> </td><td style="text-align: center;" valign="top">'+inventors+'</td></tr>';
						str += '<tr><th colspan="3" style="font-size: 67%;">'+info["classification"]+'</th></tr>';
						str += '<tr><td colspan="3" style="text-align: left; font-size: 75%;">'+info["abstract"]+'</td></tr>';
						
						str += '</table>';
		
					
				return str;
				}
		break;
		
		default:
		case "idea":
				_options.plotOptions.series.point.events.click = function(e) { 
						var obj = e.point; 
						doZoom(obj.x, obj.y); 
						var chart=$("#highchart-container").highcharts(); 
							chart.showResetZoom();
						}
				
				_options.plotOptions.series.point.events.select = function(e){ doZoom(e.target.x,e.target.y);  }
					
					
				_options.tooltip.formatter = function () {
					var info = this.point.info;
					var str = '<table border=0>';
						str += '<tr><th colspan="3" style="text-align: center;"><h3 style="padding: 5px; margin: 0px;">'+info["word"]+'</h3></th></tr>';
						str += '<tr><th colspan="3" style="text-align: center; font-size: 75%;">'+info["variants"]+'<BR /><BR /></th></tr>';
						str += '<tr><th style="text-decoration: underline; width: 50px; text-align: right; padding: 5px;">if</th><th>Within-Idea Term Occurrence:</th><td align="right"> '+numberWithCommas(info["if"])+' times</td></tr>';
						str += '<tr><th style="text-decoration: underline; width: 50px; text-align: right; padding: 5px;">sdf</th><th>Within-Subset Document Occurrence:</th><td align="right"> '+numberWithCommas(info["sdf"])+' times</td></tr>';
						str += '<tr><th style="text-decoration: underline; width: 50px; text-align: right; padding: 5px;">df</th><th>Corpus Document Occurrence:</th><td align="right"> '+numberWithCommas(info["df"])+' times</td></tr>';
						str += '<tr><th style="text-decoration: underline; width: 50px; text-align: right; padding: 5px;">tf</th><th>Corpus Term Total Occurrence:</th><td align="right"> '+numberWithCommas(info["tf"])+' times</td></tr>';
						str += '</table>';
						return str;
					}
					
					
					

		break;
		}

	return _options;
	}
function updateDateToUTC(data)
	{
	return data;  // maybe just the eval of elements
	
	console.log(data);
	for(var i=0;i<data.length;i++)
		{
		var t = data[i];
				//console.log(t);
		var info = JSON.parse( base64_decode(t.info) );
				//console.log(info);
		var u = info["date-filed-prep-utc"].split("-");
				//console.log(u);
		var ndate = Date.UTC(u[0], u[1], u[2]);
		data[i]["x"] = ndate;
				//console.log(ndate);
				// 1268870400000
				// 1249937677000 **
				// 1255132800000
				// 1252540800000
				// 1271548800000
				
				//console.log( Date.UTC(2009, 9, 10) );
		//break;
		}
	
	return data;	
	}
function setData(data)
	{
	console.log(data);
	var chart=$("#highchart-container").highcharts();
		console.log(chart);
	switch(which)
		{
		case "nnp":
			chart.series[0].setData( data["data"][0], true, true);	
			chart.series[1].setData( data["data"][1], true, true);
			chart.series[2].setData( data["data"][2], true, true);
			
			var xTitle = chart.axes[0].axisTitle["textStr"];
				xTitle = xTitle.replace("{x}",1);
				xTitle = xTitle.replace("{n}",data["extra"]["count"]);
				xTitle = xTitle.replace("{p}",data["extra"]["vs"][0]);
				
			chart.xAxis[0].axisTitle.attr({text: xTitle});
				var min = data["extra"]["mins"][0];
				var max = data["extra"]["maxs"][0];
				var range = max - min;
					min = min - 0.1 * range;
					max = max + 0.1 * range;
			chart.xAxis[0].setExtremes(min, max );
			
			var yTitle = chart.axes[1].axisTitle["textStr"];
				yTitle = yTitle.replace("{x}",2);
				yTitle = yTitle.replace("{n}",data["extra"]["count"]);
				yTitle = yTitle.replace("{p}",data["extra"]["vs"][1]);
			
			
			chart.yAxis[0].axisTitle.attr({text: yTitle});	
				var min = data["extra"]["mins"][1];
				var max = data["extra"]["maxs"][1];
				var range = max - min;
					min = min - 0.1 * range;
					max = max + 0.1 * range;
			chart.yAxis[0].setExtremes(min,max);
	
	
		break;
		
		case "fto":			
			chart.series[0].setData( updateDateToUTC(data[0]), true, true);
			chart.series[1].setData( updateDateToUTC(data[1]), true, true);
		break;
		
		default:
		case "idea":
			for(n=1;n<=5;n++)
				{
				var length = data[n].length;
					if(length > 99) { length += "+"; }
				chart.series[n-1].name += " ("+length+")";
				chart.series[n-1].setData( data[n], true, true);		
				}
		break;
		}
		
	//chart.showResetZoom();
	}
function doZoom(x,y)
	{
	var chart=$("#highchart-container").highcharts();
	// let's define xmin,xmax and ymin,ymax based on some scaling factor
		console.log(chart.xAxis[0]);
	var xScale = (chart.xAxis[0].dataMax - chart.xAxis[0].dataMin)/36 ;
	var yScale = (chart.yAxis[0].dataMax - chart.yAxis[0].dataMin)/25 ;
		var xmin = x - xScale;
		var xmax = x + xScale;
		
		var ymin = y - yScale;
		var ymax = y + yScale;
	
	chart.xAxis[0].setExtremes(xmin, xmax);
	chart.yAxis[0].setExtremes(ymin, ymax);
	
	
	// chart.showResetZoom();
	}
    