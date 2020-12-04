function updateClassForMessage(which,visible)
    {
    var msgClass = "alert {whichAlert} alert-dismissible fade {whichVisibility}";
    
    msgClass = msgClass.split("{whichAlert}").join(which);
    msgClass = msgClass.split("{whichVisibility}").join(visible);
    
    return msgClass;
    }
    
function checkMessageBindings(msgCloseObj,msgContainerObj)
    {
    msgCloseObj.on("click", function () {
            // msgContainerObj.fadeOut();
            // https://stackoverflow.com/questions/2435751/jquery-fade-element-does-not-show-elements-styled-visibility-hidden
            msgContainerObj.fadeTo(300,0);
        });    
    }
function createFileReadingHandler(baseID,type="csv")
    {
    var modalObj = $("#"+baseID);
    var fileObj = $("#"+baseID+"-files");
    
    var rawObj = $("#"+baseID+"-textarea-loaded");
    var verifiedObj = $("#"+baseID+"-textarea-verified");
    
    var msgObj = $("#"+baseID+"-msg");    
    var msgContainerObj = $("#"+baseID+"-msg-container"); 
    var msgCloseObj = $("#"+baseID+"-msg-close");    

    checkMessageBindings(msgCloseObj,msgContainerObj);
    
    fileObj.on('change',function(evt) {
        // let's verify message box is showing ...
        if (!msgContainerObj.is(':visible')) 
            {
             checkMessageBindings(msgCloseObj,msgContainerObj);        
            // set to defaults and fade-in
            msgContainerObj.removeClass();
            msgContainerObj.addClass( updateClassForMessage ("alert-primary","show") );            
            // msgContainerObj.fadeIn();
            msgContainerObj.fadeTo(300,1);
            }            
            
        var file = evt.target.files[0];    // only first one ... for now ...    
console.log("file");
console.log(file);        
        
        if(typeof file == 'undefined')
            {
            msgContainerObj.removeClass();
            msgObj.html("No file selected!");
            msgContainerObj.addClass( updateClassForMessage ("alert-danger","show") );
            msgContainerObj.fadeTo(300,1);
            return false;
            }            
            
        console.log("file: "+file.name); console.log(file);
        msgObj.html( "Filename: <b>[ "+file.name+" ]</b>" ); 
        
        var idx = file.name.indexOf(type);
        if(idx == -1)
            {
            msgContainerObj.removeClass();
            msgObj.html( msgObj.html() + "<BR />" + "Wrong file type!");
            msgContainerObj.addClass( updateClassForMessage ("alert-danger","show") );
            msgContainerObj.fadeTo(300,1);
            return false;
            }
            else
                {
                msgContainerObj.removeClass();
                msgContainerObj.addClass( updateClassForMessage ("alert-primary","show") );
                msgContainerObj.fadeTo(300,1);
                }
                
                
        
        var mydata;
        var myjson;
        var reader = new FileReader();
            reader.onload = function(e) 
                {
                // this occurs when reading is complete
                console.log("reading-complete");
                console.log(reader); 
                togglePleaseWait("hide");
                
                msgContainerObj.removeClass();
                msgObj.html( msgObj.html() + "<BR />" + "Data imported!");
                msgContainerObj.addClass( updateClassForMessage ("alert-success","show") );
                msgContainerObj.fadeTo(300,1);
            
            
                     
				rawObj.val( reader.result );
                msgContainerObj.show();
                
                
                try {
                    mydata = JSON.parse(reader.result);
                    myjson = JSON.stringify(mydata);
                    }
                    catch(err)  {
                                mydata = err;
                                myjson = "------      ERROR      ------"+"\n"+err;
                                }
                                
                    
               
                
                verifiedObj.val( myjson );
                };
         togglePleaseWait("show");       
         reader.readAsText(file);         
                // file.name
                
                
              
        
        
        /*
                    // create onload handler when file is read...
            reader.onload = function(e) {
				msgObj.innerHTML = reader.result;
                msgContainerObj.show();
                });
                */
        
        
        
        
        
        // maybe add error check on file.type.match before loading reader
        
        /*
        if(1==0)
            {
            
            }
        // else show error in msg container 
            else
                {
                msgContainerObj.removeClass();
                msgContainerObj.addClass(  updateClassForMessage("alert-danger","show") );
                msgContainerObj.fadeIn();
                
                
                
                }
                */
        
      

        
        });
    
    }

