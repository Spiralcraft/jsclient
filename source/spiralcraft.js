var SPIRALCRAFT = (function (my) { 
        
  var _private = my._private = my._private || {};
       
  return my; 
}(SPIRALCRAFT || {}));


SPIRALCRAFT.webui = (function(my) {

  return my;
}(SPIRALCRAFT.webui || {}));



SPIRALCRAFT.time = (function(my) {

  my.iso8601Converter=new AnyTime.Converter({
    utcFormatOffsetImposed: 0,
    format:"<"+"date>%Y-%m-%dT%H:%i:%s%:<"+"/date>"
    });
    
  my.defaultConverter=new AnyTime.Converter();
  
  return my;
}(SPIRALCRAFT.time || {}));


SPIRALCRAFT.debug = (function (my) { 
  
  var _private = my._private = my._private || {}; 
          
  my.manageDebug=function () {  
    var debug = true;  
    if(window.console){  
      var consoleBackUp = window.console.log;  
      window.console.log = function(str){  
        if(debug){  
          consoleBackUp.call(this,str);  
        }  
      }  
    }else{  
      var log = window.opera ? window.opera.postError : my.nullLog;  
      window.console = {};  
      window.console.log = function(str){  
        if(debug){  
          log(str);  
        }  
      }  
    }  
    
    // console.log("Spiralcraft debug on");
  }; //manageDebug ends  
  
  my.nullLog=function(str) { };
  
  $(document).ready(my.manageDebug);
  
  return my; 
}(SPIRALCRAFT.debug || {}));

