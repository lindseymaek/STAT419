/* allow toggle of please wait */

var hasPageLoaded = false;
document.onreadystatechange = function () 
    {
    var state = document.readyState;
    console.log("ready-state: "+state);
    if(!hasPageLoaded)
        {
        if(state == "complete")
            {
            togglePleaseWait("hide");
            hasPageLoaded = true;
            }
        // could do other switches as well...
        }
    };
    

function togglePleaseWait(which)
    {
    var obj = document.getElementById('pleaseWait');  // we don't have JQUERY loaded yet ...
    switch(which)
        {
        default:
        break;
        
        case "show":
            obj.style.visibility = "visible";
        break;
        
        case "hide":
            obj.style.visibility = "hidden";
        break;
        }
    }
    
    
/*    
$('.alert').on('close.bs.alert', function (e) {
    e.preventDefault();
    // $(this).addClass('hidden');
    $(this).addClass('hide');
});
*/

    