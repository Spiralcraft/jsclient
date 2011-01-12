//
//Copyright (c) 2010 Michael Toth
//Spiralcraft Inc., All Rights Reserved
//
//This package is part of the Spiralcraft project and is licensed under
//a multiple-license framework.
//
//You may not use this file except in compliance with the terms found in the
//SPIRALCRAFT-LICENSE.txt file at the top of this distribution, or available
//at http://www.spiralcraft.org/licensing/SPIRALCRAFT-LICENSE.txt.
//
//Unless otherwise agreed to in writing, this software is distributed on an
//"AS IS" basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
//

/*
 * Spiralcraft Common Javascript Library 
 *
 * Common functionality that does not depend on external functions
 */
var SPIRALCRAFT = (function (my) { 
        
  var _private = my._private = my._private || {};
  
  var _debug = true;

  if(window.console){  
    var consoleBackUp = window.console.log;  
    window.console.log = function(str){  
      if(_debug){  
        consoleBackUp.call(this,str);  
      }  
    }  
  }else{  
    var log = window.opera ? window.opera.postError : function(str) {};  
    window.console = {};  
    window.console.log = function(str){  
      if(_debug){  
        log(str);  
      }  
    }  
  }  
  
           
  return my; 
}(SPIRALCRAFT || {}));


SPIRALCRAFT.uri = (function(my) {

  my.addQueryTerm = (function(uri,name,value) {
  
    if (uri.indexOf("?")>0)
    { uri=uri+"&"+name+"="+value;
    }
    else
    { uri=uri+"?"+name+"="+value;
    }
    return uri;
  });

  return my;
}(SPIRALCRAFT.uri || {}));

/*
 * Spiralcraft webui related functions
 */
SPIRALCRAFT.webui = (function(my) {

  var _sessionSyncCount = 0;

  my.syncLocation = "";
  my.sessionExpiration = 0;
  my.timeoutRef = null;
  
  /*
   * Call the server to tickle the session and reset the pending check
   */
  my.checkSession = (function() {
    
    // Reset anything that might be pending
    if (my.timeoutRef!=null) {
      window.clearTimeout(my.timeoutRef);
      my.timeoutRef=null;
    }
    
    // Pull the new expiration time from the server
    SPIRALCRAFT.ajax.get(
      SPIRALCRAFT.uri.addQueryTerm(my.syncLocation+"","oob","sessionSync"),
      function(data) {
        // alert("Got "+data+" from server");
        my.sessionExpiration=parseInt(data);
        if (my.sessionExpiration>0) {
          if (_sessionSyncCount>0) {
            my.timeoutRef=window.setTimeout(my.checkSession,my.sessionExpiration-60000);
            // alert("Rechecking session in "+((my.sessionExpiration-60000)/1000)+" seconds");
          }
        } else {
          // alert("Session expired, reloading");
          window.location.reload();
        }
      
      }
    );

  });  
  
  /*
   * Toggles session keepalive
   */
  my.sessionSync = (function(on) {
  
    
    if (on)
    {
      _sessionSyncCount++;
      my.checkSession();
    }
    else
    {
      if (_sessionSyncCount>0) { 
        _sessionSyncCount--;
        if (_sessionSyncCount==0 && my.timeoutRef!=null)  { 
          window.clearTimeout(my.timeoutRef);
          my.timeoutRef=null;
        }
      } else { 
        console.log("Error: sessionSync turned off too many times");
      }
    }
    console.log("Sync count = "+_sessionSyncCount);
    
  });
  
  return my;
}(SPIRALCRAFT.webui || {}));

/*
 * SHA256 digester
 */
SPIRALCRAFT.SHA256 = (function(my) {

  //SHA-256 : MIT License: Credit- antimatter15.com : UTF8-encode input
  my.digestUTF8 = (function (b) {
    
    function h(j,k){
      return(j>>e)+(k>>e)+((p=(j&o)+(k&o))>>e)<<e|p&o
    }
    
    function f(j,k){
      return j>>>k|j<<32-k
    }
    
    var g=[],d,c=3,l=[2],p,i,q,a,m=[],n=[];i=b.length*8;
    for(var e=16,o=65535,r="";c<312;c++){
      for(d=l.length;d--&&c%l[d]!=0;);
        d<0&&l.push(c)
    }
    b+="\u0080";
    for(c=0;c<=i;c+=8)n[c>>5]|=(b.charCodeAt(c/8)&255)<<24-c%32;
    n[(i+64>>9<<4)+15]=i;
    for(c=8;c--;)m[c]=parseInt(Math.pow(l[c],0.5).toString(e).substr(2,8),e);
    for(c=0;c<n.length;c+=e){
      a=m.slice(0);
      for(b=0;b<64;b++){
        g[b]=b<e?n[b+c]:h(h(h(f(g[b-2],17)^f(g[b-2],19)^g[b-2]>>>10,g[b-7]),f(g[b-15],7)^f(g[b-15],18)^g[b-15]>>>3),g[b-e]);
        i=h(h(h(h(a[7],f(a[4],6)^f(a[4],11)^f(a[4],25)),a[4]&a[5]^~a[4]&a[6]),parseInt(Math.pow(l[b],1/3).toString(e).substr(2,8),e)),g[b]);
        q=(f(a[0],2)^f(a[0],13)^f(a[0],22))+(a[0]&a[1]^a[0]&a[2]^a[1]&a[2]);
        for(d=8;--d;)a[d]=d==4?h(a[3],i):a[d-1];a[0]=h(i,q)
      }
      for(d=8;d--;)m[d]+=a[d]
    }
    for(c=0;c<8;c++)
      for(b=8;b--;)r+=(m[c]>>>b*4&15).toString(e);
    return r
  });
  
  
  return my;
}(SPIRALCRAFT.SHA256 || {}));

/*
 * UTF8 string encoder
 */
SPIRALCRAFT.UTF8 = (function(my) {

  my.encode = (function(s) {
    return unescape( encodeURIComponent( s ) );
  });
  
  my.decode = (function (s) {
    return decodeURIComponent( escape( s ) );
  });

  return my;
}(SPIRALCRAFT.UTF8 || {}));