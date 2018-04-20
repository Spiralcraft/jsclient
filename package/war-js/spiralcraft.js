//
//Copyright (c) 2010,2018 Michael Toth
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
//Copyright c 1997-2000, O'Reilly & Associates
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


/*
 * Fix the bind method for very old browsers
 *
 * Credit to Douglas Crockford for this bind method
 */
if (!Function.prototype.bind) {
  Function.prototype.bind = function (oThis) {
    if (typeof this !== "function") {
      // closest thing possible to the ECMAScript 5 internal IsCallable function
      throw new TypeError ("Function.prototype.bind - what is trying to be bound is not callable");
    }

    var aArgs = Array.prototype.slice.call (arguments, 1),
        fToBind = this,
        fNOP = function () {
        },
        fBound = function () {
            return fToBind.apply (this instanceof fNOP && oThis
                  ? this
                  : oThis,
                  aArgs.concat (Array.prototype.slice.call (arguments)));
        };

    fNOP.prototype = this.prototype;
    fBound.prototype = new fNOP ();

    return fBound;
  };
}

// Console-polyfill. MIT license.
// https://github.com/paulmillr/console-polyfill
// Make it safe to do console.log() always.
(function(global) 
  {
    'use strict';
    if (!global.console) 
    { global.console = {};
    }
    var con = global.console;
    var prop, method;
    var dummy = function() {};
    var properties = ['memory'];
    var methods = ('assert,clear,count,debug,dir,dirxml,error,exception,group,' +
      'groupCollapsed,groupEnd,info,log,markTimeline,profile,profiles,profileEnd,' +
      'show,table,time,timeEnd,timeline,timelineEnd,timeStamp,trace,warn').split(',');
    while (prop = properties.pop()) if (!con[prop]) con[prop] = {};
    while (method = methods.pop()) if (!con[method]) con[method] = dummy;
    // Using `this` for web workers & supports Browserify / Webpack.
  }
)(typeof window === 'undefined' ? this : window);

//
//
// Spiralcraft JS Client Framework
//
//

// Shorthand reference and API fascade
var $SC = function(something) {
  return SPIRALCRAFT.webui.peerAPI.call(SPIRALCRAFT.webui,something);
  
};

$SC.onBodyLoad = function(fn) {
  SPIRALCRAFT.dom.registerBodyOnLoad(fn);
};

$SC.init = function(options) {
  
  SPIRALCRAFT.options=(options || SPIRALCRAFT.defaultOptions);
  SPIRALCRAFT.start();
}


/**
 * Core SPIRALCRAFT namespace
 */
var SPIRALCRAFT = (function (self) { 
        
  var _private = self._private = self._private || {};
  
  var _debug = true;
  var SC=self;
  
  self.defaultOptions =
  {
    scanDOMOnInit: false
  };
  
  /*
   * Call manually after all scripts are referenced to set up the framework
   *   to be initialized when the DOM is ready.
   */
  self.start = function() {
    document.addEventListener(
      "DOMContentLoaded",
      SPIRALCRAFT.dom.hookDocumentReady()
      );
  }; 
  
  /**
   * Extends a 'class' via prototype chaining
   * 
   * @param baseFn The 'base class'. 
   * @param constructorFn The constructor (instantiated object)
   * @param bodyFn The body of the subclass definition which contains "method"
   *   functions. In methods that override a superclass method, "this._super()" calls
   *   the superclass method.
   * @returns A "class" that can be instantiated via the "new" operator.
   */
  self.extend = function(baseFn,constructorFn,definition,clinitFn)
  {
    var fnTest = /xyz/.test(function(){xyz;}) ? /\b_super\b/ : /.*/;
    var _super = baseFn.prototype;
    if (!definition.class)
      definition.class=new Object();
    definition.class.super=_super;
    var newProto= function() { function fac() {}; fac.prototype=_super; return new fac(); }();
    newProto.constructor=constructorFn;
    constructorFn.prototype=newProto;
    if (console.log.trace)
      console.log(constructorFn.prototype);
    for (var name in definition) {
      // Check if we're overwriting an existing function
      newProto[name] = typeof definition[name] == "function" && 
        typeof _super[name] == "function" && fnTest.test(definition[name]) ?
        (function(name, fn){
          return function() {
            var tmp = this._super;
             
            // Add a new ._super() method that is the same method
            // but on the super-class
            this._super = _super[name];
             
            // The method only need to be bound temporarily, so we
            // remove it when we're done executing
            var ret = fn.apply(this, arguments);        
            this._super = tmp;
             
            return ret;
          };
        })(name, definition[name]) :
        definition[name]
    }
    // Check for and run the class initializer
    if (clinitFn)
    { clinitFn.call(constructorFn);
    }
    return constructorFn;
  }
  
  /*
   * createFromDescriptorString
   * 
   *   Creates an object defined by a String that evaluates to a descriptor. Uses
   *     createFromDescriptor() after evaluating the String
   *     
   */
  self.createFromDescriptorString= function(descriptorString,thisContext)
  {
    var descriptor=new Function("return "+descriptorString.trim()).call(thisContext);
    return SC.createFromDescriptor(descriptor,thisContext);
  }
  
  /*
   * createFromDescriptor
   * 
   *   Create an object from a descriptor. 
   *   
   *   A descriptor consists of standard property values for the constructed object
   *     as well as special properties that determine how the resulting object
   *     will be constructed from the descriptor.
   *
   *   { $$: template } - Make a copy of the template object 
   *   
   */
  self.createFromDescriptor = function(descriptor,thisContext)
  {
    var spawn=null;

    if (descriptor.$)
    {
      if (typeof descriptor.$ == "object")
      {
        // Create a new object using the referenced base object as a prototype
        spawn=Object.createInstance(descriptor.$);
      }
      else if (typeof descriptor.$ == "function")
      {
        // Create a new object using this function as a constructor
        spawn=new descriptor.$;
      }
    }
    
    
    if (descriptor.$$)
    {
      // Make a deep-copy of the referenced base object and overide / augment it
      //   with the data in the descriptor.

      spawn=self.copy
        (spawn
        ,descriptor.$$
        ,self.deepCopyFn
        );
    }
    
    if (spawn)
    {
      spawn=self.copy
        (spawn
        ,descriptor
        ,self.deepCopyFn
        ,function(target,src,copyPropFn,copyValueFn)
          { 
            if (!Array.isArray(src) 
                  && (typeof src == "object" || typeof src == "function")
               )
            { src=self.createFromDescriptor(src,thisContext);
            }
            return self.copy(target,src,copyPropFn,copyValueFn);
          }
        );
      return spawn;
    }
    
    
    return descriptor;
  }
  
  self.forEach = function(iterable,callback)
  { 
    for (var i=0;i<iterable.length;i++)
    { callback(iterable[i]);
    }
  }
  $SC.forEach=self.forEach;
  
  /*
   * map(array,fn)
   * 
   *  Invoke fn on each element in the array and store the result in the
   *    corresponding location in the new array
   */
  self.map = function(array,fn)
  {
    var ret=[];
    for (var i=0;i<array.length;i++)
    { ret.push(fn(array[i]));
    }
    return ret;
  }
  $SC.map=self.map;
  
  /*
   * find(array,fn)
   * 
   *  Find the first element in the array where fn returns true
   */
  self.find = function(array,fn)
  {
    for (var i=0;i<array.length;i++)
    { if (fn(array[i])) return array[i];
    }
  }
  $SC.find=self.find;
  
  /*
   * isAssignableFrom
   * 
   *   Traverse the prototype chain to for a class with the specified constructor
   *     function.
   */
  self.isAssignableFrom = function(supertype,object)
  {
    var p=supertype;
    var opc=object.constructor;
    do
    {
      // console.log("comparing",opc,p);
      if (opc==p)
        return true;
      if (!opc.prototype.class)
      { 
        // console.log(opc.prototype,"no class");
        return false;
      };
      
      opc=opc.prototype.class.super.constructor;
    }
    while (opc);

  }
  $SC.isAssignableFrom=self.isAssignableFrom;
  
  /**
   * copy
   * 
   *   Add all own properties in src to target.
   *   
   *   If the optional copyPropFn(target,src,key,copyPropFn,copyValueFn) is provided,
   *     it will be used to copy the source property value to the target.
   *     
   *   If the optional copyValueFn(target,src,copyPropFn,copyValueFn) is provided,
   *     it will be used to copy the source properties to the target
   */
  self.copy = function(target,src,copyPropFn,copyValueFn)
  {
    if (!copyValueFn && copyPropFn)
    { copyValueFn=self.copy; 
    }
    if (src==null || src===undefined)
    { return target;
    }
    if (!target)
    {
      if (Array.isArray(src))
      { target=[]
      }
      else if (typeof src == "object")
      { 
        if (src.clone)
        { return src.clone();
        }
        else if (src instanceof Date)
        { return new Date(src.getTime());
        }
        target=Object.create(Object.getPrototypeOf(src));      
      }
      else if (typeof src == "function")
      { 
        if (src.clone)
        { return src.clone();
        }
        else
        { return src;
        }
      }
      else
      { console.log("Unknown type to copy = "+typeof src,src,target);
      }
    }

    if (Array.isArray(src))
    {
      for (var i=0;i<src.length;i++)
      {
        if (copyPropFn)
        { copyPropFn(target,src,i,copyPropFn,copyValueFn);
        }
        else if (copyValueFn)
        { target[i] = copyValueFn(target[i],src[i],copyPropFn,copyValueFn);
        }
        else
        { target[i] = src[i];      
        }
      }
    }
    else
    {
      for (var key in src)
      { 
        if (src.hasOwnProperty(key)) 
        { 
          if (copyPropFn)
          { copyPropFn(target,src,key,copyPropFn,copyValueFn);
          }
          else if (copyValueFn)
          { target[key] = copyValueFn(target[key],src[key],copyPropFn,copyValueFn);
          }
          else
          { target[key] = src[key];      
          }
        }
      }
    }
    return target;
  }
  $SC.copy=self.copy;
  
  self.deepCopyFn = function(target,src,key,copyPropFn,copyValueFn)
  {
    var srcValue=src[key];
    if (srcValue === undefined)
    { return;
    }
    else if (srcValue==null)
    { 
      target[key]=null;
      return;
    }
    if (Array.isArray(srcValue))
    {
      target[key]=[];
      target[key]=copyValueFn(target[key],srcValue,copyPropFn,copyValueFn);     
    }
    else if (typeof srcValue=="object")
    { target[key]=copyValueFn(target[key],srcValue,copyPropFn,copyValueFn);
    }
    else if (typeof srcValue=="function")
    { target[key]=copyValueFn(target[key],srcValue,copyPropFn,copyValueFn);
    }
    else
    { target[key] = srcValue;
    }
  }
  
  /**
   * Abstract base class for Spiralcraft objects
   */
  self.SCObject = self.extend
    (Object
    ,function() {
      
    }
    ,new function() 
    {
      this.class={ name: "spiralcraft.app.SCObject" };
      
      this.observe = function(listener) 
      { 
        if (!this.observers)
        { this.observers=[];
        }
        this.observers.push(listener);
      }
      
      this.notifyObservers = function(event)
      { 
        if (this.observers)
        { 
          SPIRALCRAFT.forEach
            (this.observers
            ,function(listener) 
              { 
                if (listener.notify)
                { listener.notify(event);
                }
                else
                { listener(event);
                }
              }
            );
        }
      }
    }
  );  
  
  self.Exception = function(message)
  { this.message=message;
  }
  
  self.identityFn = function(value)
  { return value; 
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
    SPIRALCRAFT.options=(SPIRALCRAFT.options || SPIRALCRAFT.defaultOptions);
    SPIRALCRAFT.webui.doInit();
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
  
  self.registerWindowOnResize = function(fn) 
  {
    var lastFn = self.windowOnResize;
    self.windowOnResize = function() { 
      lastFn();
      fn();
    };
  };
  
  self.registerWindowOnHashChange = function(fn)
  { window.addEventListener("hashchange",fn);    
  }
  
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
  
  /*
   * SPIRALCRAFT.dom.nodesFromHTML
   * 
   * Return a set of nodes given HTML text
   */
  self.nodesFromHTML = function(html)
  {
    var template=document.createElement("template");
    template.innerHTML=html;
    return template.content.children;
  }
  
  /* 
   * SPIRALCRAFT.dom.getComments
   * 
   * Return the children of this node that are comments optionally beginning with
   *   the specific text
   */
  self.getComments = function(node,prefix)
  {
    var children=node.childNodes;
    var ret=[];
    for (var i=0;i<children.length;i++)
    {
      if (children[i].nodeType==8)
      {
        if (!prefix || children[i].nodeValue.startsWith(prefix))
        { ret.push(node);
        }
      }
    }
    return ret;
  }
  
  /* 
   * SPIRALCRAFT.dom.isDescribedBy
   * 
   * Determine whether a node is described by the specifid
   *   selector.
   */
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
  
  /*
   * SPIRALCRAFT.dom.hasClass
   */
  self.hasClass = function(node,name) {
    if (typeof node.classList != 'undefined') {
      return node.classList.contains(name);
    }
    else if (typeof node.className != 'undefined') { 
      return node.className.split(" ").indexOf(name)>=0;
    }
    return false;
  };

  /*
   * SPIRALCRAFT.dom.addClass
   */
  self.addClass = function(el, name) {
    if (el.classList)
      el.classList.add(name)
    else if (!self.hasClass(el, name)) el.className += " " + name;
  }

  /*
   * SPIRALCRAFT.dom.removeClass
   */
  self.removeClass = function (el, name) {
    if (el.classList)
      el.classList.remove(name)
    else if (self.hasClass(el, name)) {
      var reg = new RegExp('(\\s|^)' + name + '(\\s|$)')
      el.className=el.className.replace(reg, ' ')
    }
  }
  
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
  
  self.isNode = function(o) {
    return (
        typeof Node === "object" ? o instanceof Node : 
          o  && typeof o === "object" 
          && typeof o.nodeType === "number" 
          && typeof o.nodeName==="string"
      );
    
  }

  //Returns true if it is a DOM element    
  self.isElement = function(o) {
    return (
      typeof HTMLElement === "object" ? o instanceof HTMLElement : //DOM2
      o && typeof o === "object" && o !== null && o.nodeType === 1 
      && typeof o.nodeName==="string"
    );
    
  }  

  // Recursively iterate the DOM starting from an element and call
  //   a handler for the element, its children and its next siblings
  self.siblingIterateElements = function(main,handler) {
    do {
        if(main.nodeType == 1)
            handler(main);
        if(main.hasChildNodes())
            self.siblingIterateElements(main.firstChild,handler);
    }
    while (main = main.nextSibling);
  }
  
  // Recursively descends the DOM tree and "visits" elements using a
  //   callback function. If the function returns true the element's
  //   children will be scanned.
  self.scanElements= function (element,callback) {
    var children=element.children;
    for (var i=0; i<children.length;i++)
    {
      if (callback(element,children[i]))
      { self.scanElements(children[i],callback);
      }
    }
  }
  
  // Recursively descends the DOM tree and "visits" nodes using a
  //   callback function. If the function returns true the node's
  //   children will be scanned.
  self.scanNodes= function (node,callback) {
    var children=node.childNodes;
    for (var i=0; i<children.length;i++)
    {
      if (callback(node,children[i]))
      { self.scanNodes(children[i],callback);
      }
    }
  }
  
  self.attributeValue= function(node,attrName) {
    if (node.getAttribute)
    { return node.getAttribute(attrName);
    }
    return null;
  }
  

  
  
  
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
  
  self.request = function(location,options) {
    
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
        if (_request.status == 409) {
          alert("Session expired - resetting");
          window.location.replace
            (SPIRALCRAFT.uri.removeQueryParameter
               (window.location.href,"lrs")
            );
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
    
    self.configureXHR(_request);
    
    _request.open(options.method,location);
    if (options.contentType) {
      _request.setRequestHeader("Content-Type",options.contentType);
    }
    _request.send(options.data);
  };
  
  self.configureXHR = function(request) {
    
  };
  
  self.get = self.request;
  
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
    SPIRALCRAFT.http.request(
      location,
      { 
        onSuccess: function(request) { 
          callback(request.responseText); 
        }
      }
    );
  };
  
  self.post = function(location,callback,content) {
    SPIRALCRAFT.http.request(
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

  /*
   * Post data contained in a generic object by encoding fields
   */
  self.postForm = function(location,callback,formObject) {
    if (formObject instanceof FormData) {
      SPIRALCRAFT.ajax.postFormData(location,callback,formObject);
    } else {
      
      SPIRALCRAFT.http.request(
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
    }
       
  };
  
  /*
   * Post data contained in the FormData object
   */
  self.postFormData = function(location,callback,formData) {
    SPIRALCRAFT.http.request(
        location,
        {
          method: "POST",
          data: formData,
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

  /*
   * Replace the fragment portion of a URI
   */
  self.setFragment = function(uri,fragment) 
  {
    
    if (uri.indexOf("#")>-1)
    {
      uri=uri.substring(0,uri.indexOf("#"));
    }
    return uri+"#"+fragment;
  };
  
  /*
   * Get the fragment portion of a URI
   */
  self.getFragment = function(uri)
  {
    var i=uri.indexOf("#");
    if (i>-1)
    { return uri.substring(i+1);
    }
  }
  
  self.removeQueryParameter = function (uri, parameter) {
    //prefer to use l.search if you have a location/link object
    var uriparts= uri.split('?');   
    if (uriparts.length>=2) {

        var prefix= encodeURIComponent(parameter)+'=';
        var pars= uriparts[1].split(/[&;]/g);

        //reverse iteration as may be destructive
        for (var i= pars.length; i-- > 0;) {    
            //idiom for string.startsWith
            if (pars[i].lastIndexOf(prefix, 0) !== -1) {  
                pars.splice(i, 1);
            }
        }

        uri= uriparts[0]+'?'+pars.join('&');
        return uri;
    } else {
        return uri;
    }
  }
  
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

  var SC = SPIRALCRAFT;
  var _sessionSyncCount = 0;
  var _peers={};
  var autoId = 1;

  self.viewFactories = {};
  self.syncLocation = "";
  self.sessionExpiration = 0;
  self.timeoutRef = null;

  /*
   * Performs initialization functions for the WEBUI package. 
   * 
   * Called after the DOM has been loaded, but before the set of registered
   *   bodyOnLoad functions are called. This may result in the registration of
   *   additional bodyOnLoad functions.
   */
  self.doInit = function() {
    if (SPIRALCRAFT.options.scanDOMOnInit) {
      if (console.log.trace)
        console.log("Scanning DOM...");
      self.processTree(document.documentElement);
      if (console.log.trace)
        console.log("Done scanning DOM");
    }
    if (SPIRALCRAFT.options.syncLocation) 
    { self.syncLocation=SPIRALCRAFT.options.syncLocation;
    }
    if (SPIRALCRAFT.options.sessionExpiration) 
    { self.sessionExpiration=SPIRALCRAFT.options.sessionExpiration;
    }
    if (SPIRALCRAFT.options.realmName) 
    { SPIRALCRAFT.security.realmName=SPIRALCRAFT.options.realmName;
    }
    if (SPIRALCRAFT.options.enableSessionSync) 
    { SPIRALCRAFT.dom.registerBodyOnLoad(function() { SPIRALCRAFT.webui.sessionSync(true); });
    }
    
  }; 
    
  /*
   * Register a view factory function that will return an instance of a view
   */
  self.registerView = function(name,fn) {
    self.viewFactories[name]=fn;
  }
  
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
    if (console.log.trace)
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
    
    /* 
     * Peer.dispose()
     * 
     *   Called before deleting the dom node associated with this peer to disconnect
     *     the peer from any references
     */
    this.dispose = function()
    {
      if (this.view)
      { this.view.dispose();
      }
      _peers[this.id]=null;
    }
    
    /*
     * Peer.addClass
     * 
     *   Add a css class to this peer's element
     */
    this.addClass = function(name)
    { return SPIRALCRAFT.dom.addClass(this.element(),name);
    }
    
    /*
     * Peer.removeClass
     * 
     *   Remove a css class from this peer's element
     */
    this.removeClass = function(name)
    { return SPIRALCRAFT.dom.removeClass(this.element(),name);
    }
    
    /*
     * Peer.hide
     * 
     *   Hide an element 
     */
    this.hide = function()
    { this.addClass("sc-hidden");
      
    }
    
    this.unhide = function()
    { this.removeClass("sc-hidden");
    }
    
    /*
     *  Peer.findTemplate
     *  
     *    Find the template with the given name searching from the current node 
     *      first and delegating to ancestors.
     */
    this.findTemplate = function(name)
    {
      var node=this.element();
      do
      {
        var peer=self.existingPeer(node);
        if (peer && peer.templates)
        {
          for (var i=0;i<peer.templates.length;i++)
          {
            if (peer.templates[i].name==name)
            { return peer.templates[i];
            }
          }
        }
        node=node.parentNode;
      }
      while (node!=null)
    }
    
    /*
     *  Peer.context
     *
     *    Find the parent node with the specified context name
     *      and return the peer object.
     */
    this.context = function(name) 
    {
      var node=this.element();
      do 
      { 
        // console.log("finding "+name+" in "+node);
        if (node.context==name)
        { return self.activatePeer(node);
        }
        node=node.parentNode;
      }
      while (node!=null)
       
     
    };
    
    /*
     * Peer.parentView
     * 
     *   Find the immediate parent that is associated with a View
     */
    this.parentView = function()
    {
      var node=this.element().parentNode;
      do 
      { 
        var peer=self.existingPeer(node);
        // console.log("contextView",something,peer,peer?peer.view:null);
        // console.log("finding "+name+" in "+node);
        if (peer && peer.view)
        { return peer.view;
        }
        node=node.parentNode;
      }
      while (node!=null)
      
    }
    
    /*
     *  Peer.contextView
     *
     *    Find the parent node with the specified context name or that has a
     *      view compatible with the specified class
     *      and return the view object.
     */
    this.contextView = function(something) 
    {
      var node=this.element();
      if (typeof something == "function")
      {
        do 
        { 
          var peer=self.existingPeer(node);
          // console.log("contextView",something,peer,peer?peer.view:null);
          // console.log("finding "+name+" in "+node);
          if (peer && peer.view && SPIRALCRAFT.isAssignableFrom(something,peer.view))
          { return peer.view;
          }
          node=node.parentNode;
        }
        while (node!=null)
        
      }
      else
      {
        var name=something;
        do 
        { 
          var peer=self.existingPeer(node);
          // console.log("finding ",name," in ",node,peer);
          if (peer && peer.view && node.context==name)
          { return peer.view;
          }
          node=node.parentNode;
        }
        while (node!=null)
      }  
     
    };
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
  
  /**
   * Return an existing peer for a node
   */
  self.existingPeer = function (something)
  {
    if (something.id)
    { return self.getPeer(something.id);
    }
  }
  
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
  };
    
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
      var url=this.url;
      if (SPIRALCRAFT.dom.isElement(data) && data.tagName=="FORM") {
        var form=data;
        data=new FormData(form);
      }
      SPIRALCRAFT.ajax.postForm (
        url,
        callback?callback:function(cb) {},
        data
      );
    };
  }
  
  /*
   * A bidirectional data source/sink
   */
  self.Channel = SC.extend
    (SC.SCObject
    ,function(getter,setter) 
    { 
      SC.SCObject.call(this);
      this.getter=getter;
      this.setter=setter;
    }
    ,new function()
    {
      this.class={ name: "spiralcraft.webui.Channel" };

      /*
       * handleSourceEvent(event)
       *
       *  Handle an event generated when the source data changes
       */
      this.handleSourceEvent = function(event) 
      {
        switch (event.type) {
           case "change": this.sourceChanged(this.getSourceValue());
        }
      };
      
      /*
       * get: Get the value from the source
       */
      this.get = function()
      { return this.getter?this.getter():null;
      }
      
      /*
       * set: Write a value to the source
       */
      this.set=function(value)
      { 
        if (this.setter)
        {
          this.setter(value);
          this.sourceChanged(this.getter());
        }
        else
        { console.log("Setter is null",new Error())
        }
      }
      
      /*
       * sourceChanged: Called internally when the source value changes
       */
      this.sourceChanged = function(value)
      { this.notifyObservers({ type:"change", oldValue:undefined, newValue:value});
      }
    }
    );

  /*
   * Value
   * 
   *   A Channel that stores a value
   */
  self.Value = SC.extend
    (self.Channel
    ,function() 
    { 
      self.Channel.call(this,this._get.bind(this),this._set.bind(this));
      this.value=null;
    }
    ,new function()
    {
      this.class={ name: "spiralcraft.webui.Value" };
      this._get = function() { return this.value };
      this._set = function(value) { this.value=value };
    }
    );

  /*
   * DataBinding 
   * 
   *   Binds a DOM element to a data location 
   */
  self.DataBinding = function (element, peer, getter, setter, inConverter, outConverter)
  {
    this.inConverter=inConverter;
    this.outConverter=outConverter;
    
    if (!this.inConverter)
    { this.inConverter=function(value) { return (value === undefined) ? null : value };
    }
    if (!this.outConverter)
    { this.outConverter=function(value) { return (value === undefined) ? null : value };
    }
    
    var expr;
    if (typeof getter == "string")
    {
      expr = getter;
      this.get = new Function("return "+getter);
    }
    else if (SPIRALCRAFT.isAssignableFrom(self.Channel,getter))
    { this.channel=getter;
    }
    else if (typeof getter == "function")
    { this.get = getter;
    }

    this.peer = peer;
    if (setter)
    { this.set=new Function("value",setter);
    }
    else if (this.channel)
    {
      
    }
    else
    {
      try
      {
        this.set=new Function("value",expr+"=value;");
      }
      catch (exception)
      {
        console.log("Setter not valid "+exception);
        this.set=new Function("value","null;");
      }    
    }
   
    if (["DIV"
        ,"SPAN"
        ,"LABEL"
        ,"PRE"
        ,"TITLE"
        ,"H1"
        ,"H2"
        ,"H3"
        ,"H4"
        ,"H5"
        ,"H6"
        ].indexOf(element.tagName)>-1
       )
    { 
      this.controlSetter 
        = function (value) 
          { 
            console.log(this.peer.element());
            this.peer.element().textContent=this.outConverter(value); 
          }
      this.controlGetter 
        = function() 
          { 
            console.log(this.peer.element());
            return this.inConverter(this.peer.element().textContent); 
          }
    }
    else
    { 
      this.controlSetter 
        = function (value) 
        { 
          console.log(this.peer.element());
          this.peer.element().value=this.outConverter(value); 
        }
      this.controlGetter 
        = function() 
        { 
          return this.inConverter(this.peer.element().value); 
        }
    }
    element.addEventListener("change", this, false);
  }

  self.DataBinding.prototype = new function () {
    
    this.constructor=self.DataBinding;
  
    //
    //DataBinding.handleEvent
    //
    //  Handle an event generated by a dom control when data changes
    //
    this.handleEvent = function(event) {
      switch (event.type) {
         case "change": this.controlChanged(this.getControlValue());
      }
    };
    
    //
    //DataBinding.getControlValue
    //
    //  Return the current value of the bound control
    //
    this.getControlValue = function() 
    { return this.controlGetter();
    }
    
    //
    //DataBinding.getModelValue
    //
    // Return the current value of the data model
    //
    this.getModelValue = function() {
      if (this.channel)
      { return this.channel.get();
      }
      else
      { return this.get.call(this.peer);
      }
    }
    
    
    //
    //DataBinding.controlChanged
    //
    //  Called when the value of the control changed
    //
    this.controlChanged = function(value) {
      this.setModelValue(value);
    };
    
    //
    //DataBinding.modelChanged
    //
    //  Called when the value of the model changed
    //
    this.modelChanged = function(value) {
      this.setControlValue(value);
    };
    
    //
    //DataBinding.modelChanged
    //
    //  Called when the value of the model changed
    //
    this.setControlValue = function(value) {
      this.controlSetter(value);
    };
    
    //
    //DataBinding.setModelValue
    //
    //  Update the data model
    //
    this.setModelValue = function(value) 
    {
      if (this.channel)
      { this.channel.set(value);
      }
      else
      { this.set.call(this.peer,value);
      }
    };
    
    //
    //DataBinding.updateControl
    //
    //  Updates the control with the current model value
    this.updateControl = function() {
      this.setControlValue(this.getModelValue());  
    };
  }

  //
  //Make a node peerable by giving it an id if it doesn't have one, then
  //  retrieve the peer object for the node.
  //
  self.activatePeer = function (node) {
    if (!node.id)
    { node.id="nid"+node.scnid;
    } 
    var peer=$SC(node.id);
    peer.dataChanged = function() { 
      self.processTree(this.element()); 
    };
    return peer;
  }
  
  /*
   * Initialize specific view logic for this DOM node as specificed by the SC "view"
   *   attribute
   */
  self.initView = function(node) 
  {
    var attrValue=self.getSCAttribute(node,"view").value
    var viewConf;
    try 
    {
      var peer=self.activatePeer(node);
      viewConf=SC.createFromDescriptorString(attrValue,peer);
      if (viewConf.trace) 
        console.log("View: "+JSON.stringify(viewConf));
      if (viewConf.contextName)
      { node.context=viewConf.contextName;
      }
      if (viewConf.type) 
      {
        var factory=self.viewFactories[viewConf.type];
        if (factory && typeof factory == 'function') 
        { 
          view=factory(peer,node,viewConf);
          if (view)
          { peer.view=view;
          } 
          else (console.log("No view returned by factory for "+viewConf.type));
          view.init();
        } 
        else (console.log("View type '"+viewConf.type+"' is unknown"));
      } 
      else (console.log("No view type specified"));
    } 
    catch (e) 
    {
      console.log("Caught "+e+" parsing "+attrValue);
      var ne = new Error("Error parsing ",attrValue);
      ne.stack += '\nCaused by: '+e.stack;
      ne.cause=e;
      throw ne;      
    }
  }
  
  //Sequential ID for uniquely identifying dom nodes
  self.SCNID=1;
  
  //
  //Process the DOM and creating the peer object tree 
  //  that parallels the DOM structure
  //
  // This updates bound controls with data changes to the model.
  self.processTree = function (node) {
   
   var init=false;
   if (!node.scnid)
   { 
     node.scnid=self.SCNID++;
     // console.log(node.scnid+" ("+node.nodeType+") "+node);
     self.initNode(node);
     init=true;
   }
   
   if (node.bound)
   { $SC(node.id).binding.updateControl();
   }
   
   var children=node.childNodes;
   for (var i=0; i<children.length; i++)
   { self.processTree(children[i]);
   }
  
   var peer=self.existingPeer(node);
   if (peer)
   { 
     if (peer.view)
     { 
       if (SPIRALCRAFT.options.traceProcessTree)
       { console.log("Calling subtreeProcessed",node,peer,peer.view);
       }
       try
       { 
         if (init)
         { peer.view.postInit();
         }
         peer.view.subtreeProcessed();
       }
       catch (e)
       { console.log("Exception processing DOM: ",e,node,peer,peer.view);
       }
     }
   }
   
  };
  
  //
  //Process a DOM node and if called for wire it into the peer object tree 
  //  that parallels the DOM
  //
  // If a node has a "sc-context" attribute, the value will be used as the
  //   context name for reference from descendants in the DOM tree
  //
  // If a SCRIPT with a type "sc-context" is found, the SCRIPT will be executed
  //   as new function in the scope of its parent's JS peer object. 
  //
  // If a SCRIPT with a type "sc-template" is found, the SCRIPT will be parsed
  //   as template and stored in the "templates" array property of the JS peer object 
  //
  // If a node has a "sc-bind" attribute, the value represents the data model
  //   that the node communicates with
  
  self.initNode = function (node) {
   switch (node.nodeType) {
   
   case 1:
     if (node.attributes)
     { 
       if (self.getSCAttribute(node,"context"))
       { node.context=self.getSCAttribute(node,"context").value;
       }
       if (self.getSCAttribute(node,"view"))
       { self.initView(node);
       }
       if (self.getSCAttribute(node,"bind"))
       { self.bind(node);
       }
       if (node.tagName=="SCRIPT" && node.type=="sc-context")
       { 
         var peer=self.activatePeer(node.parentElement);
         new Function(node.textContent).call(peer);
       }
       if (node.tagName=="SCRIPT" && node.type=="sc-template")
       { 
         var peer=self.activatePeer(node.parentElement);
         var configStr=self.getSCAttribute(node,"config")?self.getSCAttribute(node,"config").value:null;
         var config=configStr?new Function("return "+configStr.trim()).call(this):null;
         if (SPIRALCRAFT.template)
         { 
           if (!peer.templates) peer.templates=[];
           peer.templates.push
             (SPIRALCRAFT.template.parse(node.textContent,config));
         }
       }
     }
     break;
     
   }
   
  };
  
  // Find all the SC attributes (data-sc- and other prefixes).
  self.getSCAttributes = function(node,attrName) {
    var result=[];
    if (node.hasAttributes()) {
      var attrs=node.attributes;
      
      for (var i=0;i<attrs.length;i++) {
        var name=self.normalizeSCAttrName(attrs[i].name);
        if (name && (!attrName || name==attrName)) {
          var attr={};
          attr.name=name;
          attr.value=attrs[i].value;
          result.push(attr);
        }
      }
    }
    return result;
  }
  
  // Return the normalized name of an attribute if it is an SC attribute
  self.normalizeSCAttrName = function(name) {
    if (name.startsWith("data-sc-")) return name.substring(8,name.length);
    if (name.startsWith("sc-")) return name.substring(3,name.length);
  }
  
  // Get an SC attribute using the normalized name
  self.getSCAttribute = function(node,name) {
    var attr=node.attributes["sc-"+name];
    if (attr)
    { return attr; 
    }
    attr=node.attributes["data-sc-"+name];
    return attr;
  }
  
  //
  //Bind a node to the target indicated by the expression
  //
  self.bind = function (node) {
   
   var expr=self.getSCAttribute(node,"bind").value;
   
   var setter
     =self.getSCAttribute(node,"bind-setter")
     ?self.getSCAttribute(node,"bind-setter").value
     :null;
   
   var peer=self.activatePeer(node);
   node.bound=true;
   peer.binding
     =new self.DataBinding(
         node
         ,peer
         ,expr
         ,setter
         );
  };


  
  
  
  
  return self;
}(SPIRALCRAFT.webui || {}));



/*
 * Functions for interacting with Spiralcraft security subsystem
 */
SPIRALCRAFT.security = (function(self) {
  
  self.realmName = "";
  
  self.realmDigest = (function(challenge,username,clearpass) {
    var digest=
      SPIRALCRAFT.SHA256.digestUTF8(
        SPIRALCRAFT.UTF8.decode(
            this.realmName+username.toLowerCase()+clearpass
        )
      );
    if (challenge!=null && challenge.length>0) {
      digest=SPIRALCRAFT.SHA256.digestUTF8(challenge+digest);    
    }
    return digest;
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
      console.log(
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
    
    return SPIRALCRAFT.sha256impl.hash(b);

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
  
  self.stringify = (function (o,replace,spacing) {
    return JSON.stringify(o,replace,spacing);
    
  });
  
  self.parse = (function (s,reviver) {
    return JSON.parse(s,reviver);
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

SPIRALCRAFT.sha256impl = (function(Sha256) { 
  

/**
 * Generates SHA-256 hash of string
 *
 * @param {String} msg                String to be hashed
 * @returns {String}                  Hash of msg as hex character string
 */
Sha256.hash = function(msg) 
  {
    
    // constants [4.2.2]
    var K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
             0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
             0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
             0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
             0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
             0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
             0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
             0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
    // initial hash value [5.3.1]
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];

    // PREPROCESSING 
 
    msg += String.fromCharCode(0x80);  // add trailing '1' bit (+ 0's padding) to string [5.1.1]

    // convert string msg into 512-bit/16-integer blocks arrays of ints [5.2.1]
    var l = msg.length/4 + 2;  // length (in 32-bit integers) of msg + 1 + appended length
    var N = Math.ceil(l/16);   // number of 16-integer-blocks required to hold 'l' ints
    var M = new Array(N);

    for (var i=0; i<N; i++) {
        M[i] = new Array(16);
        for (var j=0; j<16; j++) {  // encode 4 chars per integer, big-endian encoding
            M[i][j] = (msg.charCodeAt(i*64+j*4)<<24) | (msg.charCodeAt(i*64+j*4+1)<<16) | 
                      (msg.charCodeAt(i*64+j*4+2)<<8) | (msg.charCodeAt(i*64+j*4+3));
        } // note running off the end of msg is ok 'cos bitwise ops on NaN return 0
    }
    // add length (in bits) into final pair of 32-bit integers (big-endian) [5.1.1]
    // note: most significant word would be (len-1)*8 >>> 32, but since JS converts
    // bitwise-op args to 32 bits, we need to simulate this by arithmetic operators
    M[N-1][14] = ((msg.length-1)*8) / Math.pow(2, 32); M[N-1][14] = Math.floor(M[N-1][14])
    M[N-1][15] = ((msg.length-1)*8) & 0xffffffff;


    // HASH COMPUTATION [6.1.2]

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

  return Sha256;
}(SPIRALCRAFT.sha256impl || {}));  // Sha256 namespace

/**
 * Date.parse with progressive enhancement for ISO 8601 <https://github.com/csnover/js-iso8601>
 * © 2011 Colin Snover <http://zetafleet.com>
 * Released under MIT license.
 */
(function (Date, undefined) {
    var origParse = Date.parse, numericKeys = [ 1, 4, 5, 6, 7, 10, 11 ];
    Date.parse = function (date) {
        var timestamp, struct, minutesOffset = 0;

        // ES5 §15.9.4.2 states that the string should attempt to be parsed as a Date Time String Format string
        // before falling back to any implementation-specific date parsing, so that’s what we do, even if native
        // implementations could be faster
        //              1 YYYY                2 MM       3 DD           4 HH    5 mm       6 ss        7 msec        8 Z 9 ±    10 tzHH    11 tzmm
        if ((struct = /^(\d{4}|[+\-]\d{6})(?:-(\d{2})(?:-(\d{2}))?)?(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{3}))?)?(?:(Z)|([+\-])(\d{2})(?::(\d{2}))?)?)?$/.exec(date))) {
            // avoid NaN timestamps caused by “undefined” values being passed to Date.UTC
            for (var i = 0, k; (k = numericKeys[i]); ++i) {
                struct[k] = +struct[k] || 0;
            }

            // allow undefined days and months
            struct[2] = (+struct[2] || 1) - 1;
            struct[3] = +struct[3] || 1;

            if (struct[8] !== 'Z' && struct[9] !== undefined) {
                minutesOffset = struct[10] * 60 + struct[11];

                if (struct[9] === '+') {
                    minutesOffset = 0 - minutesOffset;
                }
            }

            timestamp = Date.UTC(struct[1], struct[2], struct[3], struct[4], struct[5] + minutesOffset, struct[6], struct[7]);
        }
        else {
            timestamp = origParse ? origParse(date) : NaN;
        }

        return timestamp;
    };
}(Date));
