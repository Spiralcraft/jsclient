//
//Copyright (c) 2010,2012 Michael Toth
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

//Portions adapted from:
//
//JavaScript: The Definitive Guide by David Flanagan
//Copyright © 1997-2000, O'Reilly & Associates
//
//"These programs come with no warranty of any sort. They are copyrighted 
//material and are not in the public domain. As long as you retain the 
//copyright notice, however, you may study, use, modify, and distribute them 
//for any purpose."

/*
 * Spiralcraft Common Javascript Library 
 *
 * Common functionality that does not depend on external functions
 */




// Main SPIRALCRAFT namespace
var SPIRALCRAFT = (function (self) { 
        
  var _private = self._private = self._private || {};
  
  var _debug = true;

  if (typeof window.console != 'undefined'){  
    var consoleBackup = window.console;
    if (typeof consoleBackup == 'undefined')
    { consoleBackup=console;
    }
    // window.console.log("Replacing window.console.log()");
    // consoleBackUp("Writing to consoleBackUp");
    
    window.console.log = function(str){  
      if(_debug){  
        try
        { 
          if (typeof consoleBackup != 'undefined')
          { 
            if (typeof consoleBackup.log != 'undefined')
            { consoleBackup.log(str);
            }
          }
          else if (typeof console != 'undefined')
          {
            if (typeof console.log != 'undefined')
            { console.log(str);
            }
          }
        }
        catch (err)
        {
          if (typeof JSON != 'undefined') { 
            alert("Error reporting '"+str+"':"+JSON.stringify(err));
          } else if (typeof err.message != 'undefined') {
            alert("Error reporting '"+str+"':"+err.message);
          } else {
            alert("Error reporting '"+str+"':"+err);
          }
        }
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
  
           
  return self; 
}(SPIRALCRAFT || {}));


/*
 * DOM functions and event handlers
 */
SPIRALCRAFT.dom = (function(self) {
  
  var _peers= {};
  var _bodyOnLoadHooked = false;
  var _bodyOnLoadFired = false;
  var _tardyBodyOnLoad = false;
  
  // This function is returned by hookDocumentReady() to call the
  //   init sequence
  self.bodyOnLoad = function() {
    // window.console.log("SPIRALCRAFT.dom.bodyOnLoad()");
    _bodyOnLoadFired = true;
    self.bodyOnLoadChain();
  }; 
  
  // This function will be replaced with a chaining function
  //   whenever registerBodyOnLoad(function) is
  //   called.
  self.bodyOnLoadChain = function() {
    
  }; 
  
  // This function is is called to return the main bodyOnLoad() init
  //   function and ensures that it is only called once.
  self.hookDocumentReady = function() {
    if (!_bodyOnLoadHooked) {
      _bodyOnLoadHooked=true;
      return self.bodyOnLoad;
    } else {
      alert("SPIRALCRAFT.dom.hookDocumentReady() called more than once");
    }
  }
  
  self.isBodyOnLoadHooked = function() {
    return _bodyOnLoadHooked;
  };

  self.isTardyBodyOnLoad = function() {
    return _tardyBodyOnLoad;
  };
  
  self.wasBodyOnLoadFired = function() {
    return _bodyOnLoadFired;
  };
  
  self.registerBodyOnLoad = function(fn) {
    
    if (!_bodyOnLoadFired) {
    
      var lastFn = self.bodyOnLoadChain;
      self.bodyOnLoadChain = function() { 
        lastFn();
        fn();
      };
    } else {
      // Just run it now b/c body.onload already fired
      _tardyBodyOnLoad=true;
      fn();
    }
  };

  self.windowOnResize = function(event) {
    // window.console.log("SPIRALCRAFT.dom.windowOnResize(): "+event);
    
  };
  
  if (typeof window.addEventListener != 'undefined') { 
    window.addEventListener(
      "resize",
      function(event) { 
        self.windowOnResize(event);
      },
      false
    );
  }
  else if (typeof window.attachEvent != 'undefined') {
    window.attachEvent(
        "onresize",
        function() { 
          self.windowOnResize(null);
        }
      );
  }
  
  self.registerWindowOnResize = function(fn) {
    var lastFn = self.windowOnResize;
    self.windowOnResize = function() { 
      lastFn();
      fn();
    };
  };
  
  self.getParent = function(child,name) {
    while (child.parentNode)
    { 
      child=child.parentNode;
      if (SPIRALCRAFT.dom.isDescribedBy(child,name))
      { return child;
      }
    }
    return null;
  };
  
  self.isDescribedBy = function(node,name) {
    if (name.startsWith("."))
    { return SPIRALCRAFT.dom.hasClass(node,name.substring(1));
    }
    else if (name.startsWith("#"))
    { return node.id==name.substring(1);
    }
    else
    { return node.nodeName==name;
    }
    return false;
  };
  
  self.hasClass = function(node,name) {
    if (typeof node.classList != 'undefined') {
      return node.classList.contains(name);
    }
    else if (typeof node.className != 'undefined') { 
      return node.className.split(" ").indexOf(name)>=0;
    }
    return false;
  };
  
  self.makeFormAnchor = function(child,name) {
    if (name==null) {
      name=child.id;
    }
    var form=SPIRALCRAFT.dom.getParent(child,"FORM");
    form.action=SPIRALCRAFT.uri.setFragment(form.action,name);
    return true;
  };
  
  self.chainEvent = function(first,next) {
    if (first==null) { 
      return next;
    } else if (next==null) {
      return first;
    } else {
      return function() {
        var ret=first.apply(this,arguments);
        if (ret!=false) {
          return next.apply(this,arguments);
        } else {
          return false;
        }
      };
    }
  };
  
  return self;
}(SPIRALCRAFT.dom || {}));


/*
 * HTTP related functionality 
 */
SPIRALCRAFT.http = (function(self) {
  
  var _factories = [
    function() { return new XMLHttpRequest(); },
    function() { return new ActiveXObject("Msxml2.XMLHTTP"); },
    function() { return new ActiveXObject("Microsoft.XMLHTTP"); }
  ];

  var _factory = null;

  // Create a new request
  var _newXmlHttpRequest = function() {
    if (_factory != null) return _factory();

    for(var i = 0; i < _factories.length; i++) {
      try {
        var factory = _factories[i];
        var request = factory();
        if (request != null) {
          _factory = factory;
          return request;
        }
      }
      catch(e) {
        continue;
      }
    }

    // If we get here, none of the factory candidates succeeded,
    // so throw an exception now and for all future calls.
    _factory = function() {
      throw new Error("XMLHttpRequest not supported");
    }
    _factory(); // Throw an error
  };
  
  self.get = function(location,options) {
    
    if (options.method == null)
    { options.method = "GET";
    }
    
    var _request=_newXmlHttpRequest();
    
    var _callbacks = [
      options.onOpen, 
      options.onSend,
      options.onReceive, 
      function () {
        if (_request.status >= 200 && _request.status < 300) {
          options.onSuccess(_request);
        }
        if (options.onComplete) { 
          options.onComplete(_request); 
        }
      }
    ];
    
    
    _request.onreadystatechange = function () {
      if (options.onReadyStateChange) {
        options.onReadyStateChange(_request);
      }
    
      if (_callbacks[_request.readyState-1]) {
        _callbacks[_request.readyState-1](_request);
      }
    };
    
    _request.open(options.method,location);
    if (options.contentType) {
      _request.setRequestHeader("Content-Type",options.contentType);
    }
    _request.send(options.data);
  };
  
  
  self.parseHeaders = function(request) {
    var headerText = request.getAllResponseHeaders();  // Text from the server
    var headers = {}; // This will be our return value
    var ls = /^\s*/;  // Leading space regular expression
    var ts = /\s*$/;  // Trailing space regular expression

    // Break the headers into lines
    var lines = headerText.split("\n");
    // Loop through the lines
    for(var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (line.length == 0) continue;  // Skip empty lines
      // Split each line at first colon, and trim whitespace away
      var pos = line.indexOf(':');
      var name = line.substring(0, pos).replace(ls, "").replace(ts, "");
      var value = line.substring(pos+1).replace(ls, "").replace(ts, "");
      // Store the header name/value pair in a JavaScript object
      headers[name] = value;
    }
    return headers;
  };
  
  /**
   * Encode the property name/value pairs of an object as if they were from
   * an HTML form, using application/x-www-form-urlencoded format
   */
  self.encodeFormData = function(data) {
    var pairs = [];
    var regexp = /%20/g; // A regular expression to match an encoded space

    for(var name in data) {
      if (!(typeof data[name] === "undefined")) {
        var value = data[name].toString();
        // Create a name/value pair, but encode name and value first
        // The global function encodeURIComponent does almost what we want,
        // but it encodes spaces as %20 instead of as "+". We have to
        // fix that with String.replace()
        var pair = encodeURIComponent(name).replace(regexp,"+") + '=' +
          encodeURIComponent(value).replace(regexp,"+");
        pairs.push(pair);
      }
    }

    // Concatenate all the name/value pairs, separating them with &
    return pairs.join('&');
  };
  
  return self;
  
}(SPIRALCRAFT.http || {}));


SPIRALCRAFT.ajax = (function (self) { 
  
  self.get = function(location,callback) {
    SPIRALCRAFT.http.get(
      location,
      { 
        onSuccess: function(request) { 
          callback(request.responseText); 
        }
      }
    );
  };
  
  self.post = function(location,callback,content) {
    SPIRALCRAFT.http.get(
      location,
      {
        method: "POST",
        data: content,
        onSuccess: function(request) { 
          callback(request.responseText); 
        }
      }
    );
  };

  self.postForm = function(location,callback,formObject) {
    SPIRALCRAFT.http.get(
      location,
      {
        method: "POST",
        contentType: "application/x-www-form-urlencoded",
        data: SPIRALCRAFT.http.encodeFormData(formObject),
        onSuccess: function(request) { 
          callback(request.responseText); 
        }
      }
    );
  };
  
  return self; 
}(SPIRALCRAFT.ajax || {}));

/*
 * Function for manipulating URIs
 */
SPIRALCRAFT.uri = (function(self) {

  self.addQueryTerm = (function(uri,name,value) {
  
    if (uri.indexOf("?")>0)
    { uri=uri+"&"+name+"="+value;
    }
    else
    { uri=uri+"?"+name+"="+value;
    }
    return uri;
  });

  self.setFragment = function(uri,fragment) {
    
    if (uri.indexOf("#")>0) {
      uri=uri.substring(0,uri.indexOf("#"));
    }
    return uri+"#"+fragment;
  };
  
  return self;
}(SPIRALCRAFT.uri || {}));

/*
 * Utilities
 */
SPIRALCRAFT.util = (function(self) {

  self.sizeOf = (function(o) {
    var size = 0, key;
    for (key in o) {
        if (o.hasOwnProperty(key)) size++;
    }
    return size;
  });


    
    
  return self;
}(SPIRALCRAFT.util || {}));

/*
 * Spiralcraft webui related functions
 */
SPIRALCRAFT.webui = (function(self) {

  var _sessionSyncCount = 0;
  var _peers={};
  var autoId = 1;
 

  self.syncLocation = "";
  self.sessionExpiration = 0;
  self.timeoutRef = null;
  
  /*
   * Call the server to tickle the session and reset the pending check
   */
  self.checkSession = (function() {
    
    // Reset anything that might be pending
    if (self.timeoutRef!=null) {
      window.clearTimeout(self.timeoutRef);
      self.timeoutRef=null;
    }
    
    // Pull the new expiration time from the server
    SPIRALCRAFT.ajax.get(
      SPIRALCRAFT.uri.addQueryTerm(self.syncLocation+"","oob","sessionSync"),
      function(data) {
        // alert("Got "+data+" from server");
        self.sessionExpiration=parseInt(data);
        if (self.sessionExpiration>0) {
          if (_sessionSyncCount>0) {
            self.timeoutRef=window.setTimeout(self.checkSession,self.sessionExpiration-60000);
            // alert("Rechecking session in "+((self.sessionExpiration-60000)/1000)+" seconds");
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
  self.sessionSync = (function(on) {
  
    
    if (on) {
      _sessionSyncCount++;
      self.checkSession();
    } else {
      if (_sessionSyncCount>0) { 
        _sessionSyncCount--;
        if (_sessionSyncCount==0 && self.timeoutRef!=null)  { 
          window.clearTimeout(self.timeoutRef);
          self.timeoutRef=null;
        }
      } else { 
        window.console.log("Error: sessionSync turned off too many times");
      }
    }
    window.console.log("Sync count = "+_sessionSyncCount);
    
  });

  self.nextAutoId = function() {
    return autoId++;
  }
  /*
   * Registers a javascript "peer" object that is associated with the DOM 
   *   element that has the specified id. The peer object can hold custom state 
   *   and methods that can be used to interact with the application model
   *   associated with the DOM element.
   */
  self.bindPeer = function(peer) {
    _peers[peer.id] = peer;
      
    if (peer.onRegister) { 
      peer.onRegister.call(peer,peer);
    };
  
    if (peer.onBodyLoad) {
      SPIRALCRAFT.dom.registerBodyOnLoad( function() { peer.onBodyLoad.call(peer,peer); } );
    };
    
  };
  
  self.getPeer = function(id) {
    return _peers[id];
  };
  
  self.getElement = function(id) {
    return document.getElementById(id);
    
  };
  
  self.newPeer = function(id) {
    var peer=new self.Peer();
    peer.id=id;
    return peer;
    alert("Created peer for id "+id);
  };
  
  /*
   * The JS Peer object for dom elements
   */
  self.Peer = function() { 
  };
  
  self.Peer.prototype = new function() {

    this.constructor=self.Peer;
    this.id=null;
    this.data={};
    this.events={};
    
    this.attachBodyOnLoad = function(fn) {
      var self=this;
      SPIRALCRAFT.dom.registerBodyOnLoad( function() { fn.call(self,self); } );
    };
    
    this.setData = function (data) {
      this.data=data;
    };
    
    this.setEvents = function(eventNames) {
      for (var i=0; i<eventNames.length; i++)  {
        this.events[eventNames[i]]=new self.dispatcher();
      }
    };
    
    this.element = function() {
      return SPIRALCRAFT.webui.getElement(this.id);
    };
    
    this.attachHandler = function(event,fn) {
      var element=this.element();
      element[event]=SPIRALCRAFT.dom.chainEvent(element[event],fn);
    }
  }

  
  /*
   * Generic dispatcher class which keeps a set of listeners for an event
   *   and routes event notification to the listeners.
   */
  self.dispatcher = function() {
    
    this._listeners = [];
    
    this.notify = function(data) {
      
      for (var i=0; i<this._listeners.length ; i++)
      { this._listeners[i](data);
      }
    };
    
    this.listen = function(thisArg,fn) {
      this._listeners[this._listeners.length]=
        function (data) {
          // Call the listener in its own object context
          fn.call(thisArg,data);
        };
    };
    
  };
  
  //Shorthand for getting the SPIRALCRAFT.webui peer JS object for a dom
  //element.
  self.peerAPI = function (something) {
    if (typeof something == "string") { 
     var peer=self.getPeer(something);
     if (!peer)
     { 
       peer=self.newPeer(something);
       self.bindPeer(peer);
     }
     return peer;
    } else if (typeof something == "object") {
     if (!something.id)
     { something.id="_sc"+(self.nextAutoId());
     }
     var peer=self.getPeer(something.id);
     if (!peer)
     { 
       peer=self.newPeer(something.id);
       self.bindPeer(peer);
     }
     return peer;
    } else {
     alert("Unrecognized parameter "+something+": "+(typeof something));
    }
    
  };
  
  self.Port = function (url) {
    this.url=url;
  }
    
  self.Port.prototype = new function() {

    this.constructor=self.Port;
    
    /*
     * Query the port by adding the data elements to the URL query string,
     *   and call the callback function with a JSON object parsed from the
     *   result data
     */
    this.queryJSON = function(data,callback) {
      this.query(data,function (content) { callback(SPIRALCRAFT.json.parse(content)); });
    };
    
    /*
     * Query the port by adding the data elements to the URL query string,
     *   and call the callback function with the result data
     */
    this.query = function(data,callback) {
      
      var queryUrl=this.url;
      if (data)
      {
        queryUrl=queryUrl+"&"+SPIRALCRAFT.http.encodeFormData(data);
      }
      SPIRALCRAFT.ajax.get (
        queryUrl,
        callback?callback:function(cb) {}
      );
    };


    /*
     * Encode the data object as a form post and post it to the port. Call
     *   the callback function with the result data.
     */
    this.postForm = function(data,callback) {
      SPIRALCRAFT.ajax.postForm (
        this.url,
        callback?callback:function(cb) {},
        data
      );
    };
  }
  return self;
}(SPIRALCRAFT.webui || {}));


var $SC = function(something) {
  return SPIRALCRAFT.webui.peerAPI.call(SPIRALCRAFT.webui,something);
};

/*
 * Functions for interacting with Spiralcraft security subsystem
 */
SPIRALCRAFT.security = (function(self) {
  
  self.realmName = "";
  
  self.realmDigest = (function(challenge,username,clearpass) {
    return SPIRALCRAFT.SHA256.digestUTF8(
        SPIRALCRAFT.UTF8.decode(
            challenge+this.realmName+username.toLowerCase()+clearpass
        )
      );
  });

  self.processLoginControls =  
    (function(challengeInput,usernameInput,clearpassInput,digestpassInput) {
      
      digestpassInput.value = 
        this.realmDigest(
          challengeInput!=null?challengeInput.value:"",
          usernameInput.value,
          clearpassInput.value
        );
      
      clearpassInput.value="";
/*      
      window.console.log(
        (challengeInput!=null?challengeInput.value:"")+","+
        usernameInput.value+","+
        clearpassInput.value+" = "+
        digestpassInput.value
      );
*/        
      return true;
        
  });

  self.loginFormOnSubmit =  
    (function(loginForm) {
      this.processLoginControls(
        loginForm.login_challenge,
        loginForm.login_username,
        loginForm.login_clearpass,
        loginForm.login_digestpass
        );
      return true;
  });
  
  self.processRegistrationControls =  
    (function(
      usernameInput,
      clearpassInput,
      digestpassInput,
      clearpassInputCheck,
      digestpassInputCheck,
      passwordLengthInput
      ) {
      
      digestpassInput.value = 
        this.realmDigest(
          "",
          usernameInput.value,
          clearpassInput.value
        );
      
      passwordLengthInput.value=clearpassInput.value.length;
      clearpassInput.value="";
      
      if (digestpassInputCheck)
      {
        digestpassInputCheck.value = 
          this.realmDigest(
            "",
            usernameInput.value,
            clearpassInputCheck.value
          );
        
        clearpassInputCheck.value="";
        
      }
      
/*      
      window.console.log(
        usernameInput.value+","+
        clearpassInput.value+" = "+
        digestpassInput.value
      );
*/        
      return true;
        
  });

  self.registrationFormOnSubmit =  
    (function(registrationForm) {
      this.processRegistrationControls(
        registrationForm.register_username,
        registrationForm.register_clearpass,
        registrationForm.register_digestpass,
        registrationForm.register_clearpass_check,
        registrationForm.register_digestpass_check,
        registrationForm.register_passwordlength
        );
      return true;
  });
  
  return self;
}(SPIRALCRAFT.security || {}));


/*
 * SHA256 digester
 */
SPIRALCRAFT.SHA256 = (function(self) {

  self.digestUTF8 = (function (b) {
    
    return Sha256.hash(b);

  });
  
  
  return self;
}(SPIRALCRAFT.SHA256 || {}));

/*
 * UTF8 string encoder
 */
SPIRALCRAFT.UTF8 = (function(self) {

  self.encode = (function(s) {
    return unescape( encodeURIComponent( s ) );
  });
  
  self.decode = (function (s) {
    return decodeURIComponent( escape( s ) );
  });

  return self;
}(SPIRALCRAFT.UTF8 || {}));


/*
 * String utility
 */
SPIRALCRAFT.StringUtil = (function(self) {
  
  self.toBytes = (function (s) {
    var result = [];
    var stack;
    for (var i = 0; i < s.length; i++) {
      ch=s.charCodeAt(i);
      stack=[];
      do {
        stack.push(ch & 0xFF);
        ch = ch >> 8;
      } while (ch);
      result = result.concat(stack.reverse());
    }
    return result;
  });

  return self;
}(SPIRALCRAFT.StringUtil || {}));


/*
 * JSON utility
 */
SPIRALCRAFT.json = (function(self) {
  
  self.stringify = (function (o) {
    return JSON.stringify(o);
    
  });
  
  self.parse = (function (s) {
    return JSON.parse(s);
  });

  return self;
}(SPIRALCRAFT.json || {}));



// http://www.movable-type.co.uk/scripts/sha256.html
// Licensed from author under LGPL (http://creativecommons.org/licenses/LGPL/2.1/)
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  SHA-256 implementation in JavaScript | (c) Chris Veness 2002-2010 | www.movable-type.co.uk    */
/*   - see http://csrc.nist.gov/groups/ST/toolkit/secure_hashing.html                             */
/*         http://csrc.nist.gov/groups/ST/toolkit/examples.html                                   */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

var Sha256 = {};  // Sha256 namespace

/**
 * Generates SHA-256 hash of string
 *
 * @param {String} msg                String to be hashed
 * @returns {String}                  Hash of msg as hex character string
 */
Sha256.hash = function(msg) {
    
    // constants [§4.2.2]
    var K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
             0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
             0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
             0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
             0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
             0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
             0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
             0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
    // initial hash value [§5.3.1]
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];

    // PREPROCESSING 
 
    msg += String.fromCharCode(0x80);  // add trailing '1' bit (+ 0's padding) to string [§5.1.1]

    // convert string msg into 512-bit/16-integer blocks arrays of ints [§5.2.1]
    var l = msg.length/4 + 2;  // length (in 32-bit integers) of msg + ‘1’ + appended length
    var N = Math.ceil(l/16);   // number of 16-integer-blocks required to hold 'l' ints
    var M = new Array(N);

    for (var i=0; i<N; i++) {
        M[i] = new Array(16);
        for (var j=0; j<16; j++) {  // encode 4 chars per integer, big-endian encoding
            M[i][j] = (msg.charCodeAt(i*64+j*4)<<24) | (msg.charCodeAt(i*64+j*4+1)<<16) | 
                      (msg.charCodeAt(i*64+j*4+2)<<8) | (msg.charCodeAt(i*64+j*4+3));
        } // note running off the end of msg is ok 'cos bitwise ops on NaN return 0
    }
    // add length (in bits) into final pair of 32-bit integers (big-endian) [§5.1.1]
    // note: most significant word would be (len-1)*8 >>> 32, but since JS converts
    // bitwise-op args to 32 bits, we need to simulate this by arithmetic operators
    M[N-1][14] = ((msg.length-1)*8) / Math.pow(2, 32); M[N-1][14] = Math.floor(M[N-1][14])
    M[N-1][15] = ((msg.length-1)*8) & 0xffffffff;


    // HASH COMPUTATION [§6.1.2]

    var W = new Array(64); var a, b, c, d, e, f, g, h;
    for (var i=0; i<N; i++) {

        // 1 - prepare message schedule 'W'
        for (var t=0;  t<16; t++) W[t] = M[i][t];
        for (var t=16; t<64; t++) W[t] = (Sha256.sigma1(W[t-2]) + W[t-7] + Sha256.sigma0(W[t-15]) + W[t-16]) & 0xffffffff;

        // 2 - initialise working variables a, b, c, d, e, f, g, h with previous hash value
        a = H[0]; b = H[1]; c = H[2]; d = H[3]; e = H[4]; f = H[5]; g = H[6]; h = H[7];

        // 3 - main loop (note 'addition modulo 2^32')
        for (var t=0; t<64; t++) {
            var T1 = h + Sha256.Sigma1(e) + Sha256.Ch(e, f, g) + K[t] + W[t];
            var T2 = Sha256.Sigma0(a) + Sha256.Maj(a, b, c);
            h = g;
            g = f;
            f = e;
            e = (d + T1) & 0xffffffff;
            d = c;
            c = b;
            b = a;
            a = (T1 + T2) & 0xffffffff;
        }
         // 4 - compute the new intermediate hash value (note 'addition modulo 2^32')
        H[0] = (H[0]+a) & 0xffffffff;
        H[1] = (H[1]+b) & 0xffffffff; 
        H[2] = (H[2]+c) & 0xffffffff; 
        H[3] = (H[3]+d) & 0xffffffff; 
        H[4] = (H[4]+e) & 0xffffffff;
        H[5] = (H[5]+f) & 0xffffffff;
        H[6] = (H[6]+g) & 0xffffffff; 
        H[7] = (H[7]+h) & 0xffffffff; 
    }

    return Sha256.toHexStr(H[0]) + Sha256.toHexStr(H[1]) + Sha256.toHexStr(H[2]) + Sha256.toHexStr(H[3]) + 
           Sha256.toHexStr(H[4]) + Sha256.toHexStr(H[5]) + Sha256.toHexStr(H[6]) + Sha256.toHexStr(H[7]);
}

Sha256.ROTR = function(n, x) { return (x >>> n) | (x << (32-n)); }
Sha256.Sigma0 = function(x) { return Sha256.ROTR(2,  x) ^ Sha256.ROTR(13, x) ^ Sha256.ROTR(22, x); }
Sha256.Sigma1 = function(x) { return Sha256.ROTR(6,  x) ^ Sha256.ROTR(11, x) ^ Sha256.ROTR(25, x); }
Sha256.sigma0 = function(x) { return Sha256.ROTR(7,  x) ^ Sha256.ROTR(18, x) ^ (x>>>3);  }
Sha256.sigma1 = function(x) { return Sha256.ROTR(17, x) ^ Sha256.ROTR(19, x) ^ (x>>>10); }
Sha256.Ch = function(x, y, z)  { return (x & y) ^ (~x & z); }
Sha256.Maj = function(x, y, z) { return (x & y) ^ (x & z) ^ (y & z); }

//
// hexadecimal representation of a number 
//   (note toString(16) is implementation-dependant, and  
//   in IE returns signed numbers when used on full words)
//
Sha256.toHexStr = function(n) {
  var s="", v;
  for (var i=7; i>=0; i--) { v = (n>>>(i*4)) & 0xf; s += v.toString(16); }
  return s;
}

