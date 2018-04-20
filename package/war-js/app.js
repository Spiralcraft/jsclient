/*
 * Toolkit for UI logic for client-side interaction
 */
SPIRALCRAFT.app = (function(self) {
  var SC=SPIRALCRAFT;

  /**
   * Component is a long-lived configurable object which supports events and
   *   participates in a structure of other Components.
   */
  self.Component = SC.extend
    (SC.SCObject
    ,function(conf)
      {
        SC.SCObject.call(this);
        this.conf=(conf || {});
        this.listeners={ };

        if (this.conf.trace) 
          console.log("Constructing "+(typeof this)+JSON.stringify(this));
      
      }
    ,new function()
      {
        this.class={ name: "spiralcraft.app.Component" };

        /*
         * Component.init()
         */
        this.init = function()
        { 
          if (this.conf.init) this.conf.init.call(this);
        }
        
        /*
         * Component.postInit()
         * 
         *   Called after the contained children are initialized
         */
        this.postInit = function()
        {
          if (this.conf.postInit) this.conf.postInit.call(this);
        }
        
        this.error = function(message,cause)
        {
          var ne = new Error(message+" ("+this.objectId()+")");
          ne.stack += '\nCaused by: '+cause.stack;
          ne.cause=cause;
          throw ne;
        }
        
        this.objectId = function()
        { 
          if (this.constructor.prototype.class)
          { return this.constructor.prototype.class.name;
          }
          else
          { 
            console.log("objectId called out of context",this);
            return "???";
          }
        }
        
        /*
         * Component.addListener(event,listener)
         */
        this.addListener = function(event,listener)
        {
          var elist=this.listeners[event];
          if (!elist)
          { 
            elist=[]; 
            this.listeners[event]=elist;
            if (this.conf.trace)
              console.log("Added ",event);
          }
          if (elist.indexOf(listener)<0)
          { 
            elist.push(listener);
            if (this.conf.trace)
              console.log("Added ",event,listener);
            this.listenerAdded(event,listener);
          }
          else
          { console.log("Dup listener ",event,listener,this);
          }
        }
        
        /*
         * Component.removeListener(event,listener)
         */
        this.removeListener = function(event,listener)
        {
          var elist=this.listeners[event];
          if (elist)
          {
            var index=elist.indexOf(listener);
            if (index>=0)
            { elist.splice(index,1);
            }
          }
        }
        
        /*
         * Component.notifyListers(event)
         */
        this.notifyListeners = function(event)
        {
          if (this.conf.trace)
            console.log("Notifying ",event);
          var ename;
          if (typeof event == "string")
          { ename=event;
          }
          else
          { ename=event.name;
          }
          var elist=this.listeners[ename];
          if (elist)
          {
            for (var i=0;i<elist.length;i++)
            { elist[i](event);
            }
          }
          else
          {
            if (this.conf.trace)
              console.log("No listeners for ",event);
          }
        }
        
        /*
         * Component.listenerAdded(event,listener)
         * 
         *   Called after an event listener has been registered
         */
        this.listenerAdded = function(event,listener)
        {
          
        }
      
      }
    );
  
  /**
   * State is an element in a StateMachine. It maps actions to other states.
   */
  self.State = SC.extend
    (SC.SCObject
    ,function(machine,conf) 
      {
        SC.SCObject.call(this);
        this.machine=machine;
        this.name=conf.name;
        this.actions=conf.actions;
        this.config=conf;
      }
    ,new function() 
      {
        this.canEnter = function()
        { return this.config.canEnter?this.config.canEnter.call(this):true;
        }
        
        this.enter = function()
        {
          if (this.config.onEnter)
          { this.config.onEnter.call(this);
          }
        };
        
        this.canExit = function()
        { return this.config.canExit?this.config.canExit.call(this):true;
        }

        this.exit = function() 
        {
          if (this.config.onExit)
          { this.config.onExit.call(this);
          }
          
        };
        
      }
    );

  self.StateMachine = SC.extend
    (SC.SCObject
    ,function(machineConfig) 
      {
        // console.log(machineConfig);
        SC.SCObject.call(this);
        this.states=[];
        this.statesByName=[];
        this.controller=null;
        this.config=machineConfig;
        
        for (var i=0; i<machineConfig.states.length;i++)
        { 
          var stateConf=machineConfig.states[i];
          if (stateConf)
          {
            var state=new self.State(this,stateConf);
            this.states.push(state);
            this.statesByName[state.name]=state;
            // console.log(stateConf);
          }
        }
        
      }
    ,new function() 
      {
        this.init = function()
        {
          if (this.config.initialState)
          { this.selectedState=this.statesByName(this.config.initialState);
          }
          else
          { this.selectedState=this.states[0];
          }
          this.selectedState.enter();
          this.notifyObservers();
        }
        
        this.selectState = function (name)
        {
          if (this.statesByName[name])
          {
            var newState=this.statesByName[name];
            
            
            if (this.selectedState)
            { 
              if (!this.selectedState.canExit())
              { return;
              }
            }
            if (!newState.canEnter())
            { return;
            }
            if (this.selectedState)
            { this.selectedState.exit();
            }
            this.selectedState=newState;
            this.selectedState.enter();
            this.notifyObservers();
          }
          else
          { console.log("Unknown state '"+name+"'");
          }
        };

    
        this.doAction = function (name)
        {
          if (this.selectedState)
          { 
            if (this.selectedState.actions)
            { 
              var action=this.selectedState.actions[name];
              if (action)
              {
                if (action.can)
                { 
                  if (!action.can.call(this.controller));
                  { return false;
                  }
                }
                var result=null;
                if (action.fn)
                { result=action.fn.call(this.controller);
                }
                var nextState=null;
                if (action.map)
                { nextState=action.map[result];
                }
                if (nextState==null && action.go)
                { nextState=action.go;  
                }
                if (nextState!=null)
                { this.selectState(nextState);
                }
                 
              }
              else
              { console.log("No action '"+name+"' for current state ",this.selectedState);
              }
            }
          }
        }
      }
      
    );
  
  /*
   * Adornment
   *   
   *  An adornment is an object that modifies some aspect of a view such as 
   *    DOM element attribute values or CSS classes as appropriate to an interactive
   *    state
   */
  self.Adornment = SC.extend
    (self.Component
    ,function(view,conf)
    {
      var defaultConf={  };
      self.Component.call(this,SC.copy(defaultConf,conf));
      this.peer=view.peer;
      this.node=view.node;
      this.view=view;
    }
    ,new function() 
    { 
      this.class={ name: "spiralcraft.app.Adornment" };

      /*
       * init
       */
      this.init = function() 
      { 
        this._super();
        
        if (this.conf.model)
        {
          
          if (SC.isAssignableFrom(SC.webui.Channel,this.conf.model))
          { this.model=this.conf.model;
          }
          else if (typeof this.conf.model == "string" )
          {
            this.model
              =new SC.webui.Channel
                (new Function("return "+this.conf.model).bind(this)
                ,new Function("_",this.conf.model+"=_").bind(this)
                );
          }
        }
        
        if (this.conf.modelFn)
        { 
          this.model=this.conf.modelFn.call(this);
          if (this.model==null)
          { console.log("modelFn returned null",this.conf.modelFn);
          }
        }
        
        if (this.model)
        { this.model.observe(this.modelHandler.bind(this));
        }
      }
      
      this.update = function() 
      { 
        if (this.conf.update)
        { this.conf.update.call(this,this.model?this.model.get():null);
        }
      }
      
      this.modelHandler = function(event)
      { this.update();
      }
      
    }  
  );

  /*
   * View
   *   
   *   A View manages the interaction between the framework and a DOM node.
   */
  self.View = SC.extend
    (self.Component
    ,function(peer,node,conf) 
    { 
      var defaultConf={ autoRefresh: true };
      if (conf.refreshEvents)
      { 
        defaultConf.autoRefresh=false;
        defaultConf.refreshOnInit=false;
      }
      
      self.Component.call(this,SC.copy(defaultConf,conf));
      this.peer=peer;
      this.node=node;
      this.model=null;
      this.adornments=[];
      this.parentView=null;
      this.onEnteringFocusSubscribed=false;
      this.refreshOnEnteringFocus=false;
    }
    ,new function() 
    { 
      this.class={ name: "spiralcraft.app.View" };
      
      /*
       * Identify this View by class and peer id
       */
      this.objectId = function()
      { return this._super()+"@"+this.peer.id;
      }
      
      /*
       * Handle anything that needs to happen on the DOM refresh sweep
       */
      this.subtreeProcessed = function() 
      {
        if (this.conf.autoRefresh)
        { this.refresh();
        }
      };
      
      /*
       * init
       */
      this.init = function() 
      { 
        this._super();
        this.parentView=this.peer.parentView();
        
        if (this.conf.model)
        {
          
          if (SC.isAssignableFrom(SC.webui.Channel,this.conf.model))
          { this.model=this.conf.model;
          }
          else if (typeof this.conf.model == "string" )
          {
            this.model
              =new SC.webui.Channel
                (new Function("return "+this.conf.model).bind(this)
                ,new Function("_",this.conf.model+"=_").bind(this)
                );
          }
          else if (typeof this.conf.model == "number" )
          {
            this.model
              =new SC.webui.Channel
                (new Function("return "+this.conf.model).bind(this)
                ,null
                );
          }
          else if (typeof this.conf.model == "boolean" )
          {
            this.model
              =new SC.webui.Channel
                (new Function("return "+this.conf.model).bind(this)
                ,null
                );
          }
          else if (typeof this.conf.model == "object" )
          {
            this.model
              =new SC.webui.Channel
                (new Function("return "+SC.JSON.stringify(this.conf.model)).bind(this)
                ,null
                );
          }
          else
          { console.log("Unrecognized model config",this);
          }
        }
        
        if (this.conf.modelFn)
        { this.model=this.conf.modelFn.call(this);
        }
        
        if (!this.onEnteringFocusSubscribed)
        {
          if (
              (this.conf.refreshEvents 
               && this.conf.refreshEvents.indexOf("enteringFocus")>-1
              )
             ) 
          { this.subscribeOnEnteringFocus();
          }
        }
        
        this.initModelDependents();
        
        if (this.conf.classes)
        {
          this.conf.classes.forEach
            (function(clazz)
              { 
                if (typeof clazz == "string")
                { this.peer.addClass(clazz);
                }
                else if (typeof clazz == "function")
                { this.peer.addClass(clazz.call(this))
                }
                else
                { console.log("Unknown object in View.conf.classes",clazz)
                }
              }.bind(this)
            )
        }
        
        if (this.conf.refreshOnModelChange)
        { this.model.observe(function(event) { this.refresh() }.bind(this));
        }
        
        if (this.conf.adornments)
        {
          this.conf.adornments.forEach
            (function(_) 
              {
                var ad=new self.Adornment(this,_);
                this.adornments.push(ad);
                ad.init();
              }.bind(this)
            );
        }
        
        if (this.conf.refreshOnInit
            || (this.conf.refreshEvents
                && this.conf.refreshEvents.indexOf("init")>-1
                )
            )
        { this.refresh();
        }
      }

      /*
       * initModelDependents
       * 
       *   Overide to initialize anything dependent on the bound model. Called
       *     after the model is set up but before adornments are initialized.
       */
      this.initModelDependents = function() { }
      
      /*
       * View.dispose()
       */
      this.dispose = function()
      {
        if (this.onEnteringFocusSubscribed)
        { 
          if (this.parentView)
          {
            console.log("removing enteringFocus listener");
            this.parentView.removeListener
              ("enteringFocus",this.boundEnteringFocusHandler);
          }
        }
      }
      
      /*
       * View.subscribeOnEnteringFocus
       */
      this.subscribeOnEnteringFocus = function()
      {
        if (this.parentView)
        { 
          this.boundEnteringFocusHandler=this.enteringFocusHandler.bind(this);
          this.parentView.addListener
            ("enteringFocus",this.boundEnteringFocusHandler);
        }
        this.onEnteringFocusSubscribed=true;
      }
      
      /*
       * View.listenerAdded(event,listener)
       */
      this.listenerAdded = function(event,listener)
      {
        this._super();
        if (event == "enteringFocus" && !this.onEnteringFocusSubscribed)
        { this.subscribeOnEnteringFocus();
        }
      }
      
      /*
       * View.enteringFocusHandler(event)
       */
      this.enteringFocusHandler = function(event)
      { 
        this.onEnteringFocus();
        this.notifyListeners(event);
      }
      
      /*
       * View.onEnteringFocus 
       */
      this.onEnteringFocus = function()
      {
        if (this.conf.trace) console.log("Entering focus",this);
        
        if (this.conf.autoRefresh ||
            (this.conf.refreshEvents 
                && this.conf.refreshEvents.indexOf("enteringFocus")>-1
               )
           )
        { this.refresh();
        }
        
        if (this.conf.onEnteringFocus)
        { this.conf.onEnteringFocus.apply(this);
        }
        
      }
      
      /*
       * View.contextView(selector)
       * 
       *   Find a containing view with the specified context name or the specified 
       *   type.
       */
      this.contextView = function(something) 
      {
        // console.log("View.contextView",something);
        return this.peer.contextView(something);
      };
      
      /*
       * View.checkVisible(): 
       *   
       *   Check for change in dynamic visibility
       */
      this.checkVisible = function()
      {
        if (this.conf.visible)
        { 
          var visible=this.conf.visible.call(this);
          if (visible==false)
          { 
            this.peer.hide();
          }
          else if (visible==true)
          { this.peer.unhide();
          }
          return visible;
        }
        return true;
      }
      
      
      /*
       * View.refresh() 
       * 
       *   Refresh this view
       */
      this.refresh = function()
      {
        if (this.checkVisible() || this.conf.renderWhenHidden)
        {
          this.updateContents();
          this.adornments.forEach(function(_) {_.update()});
        }
      }
      
      /*
       * View.updateContents
       */
      this.updateContents = function()
      { 
        if (this.conf.textContentFn)
        { this.node.textContent=this.conf.textContentFn.call(this);
        }
        if (this.conf.htmlContentFn)
        { this.node.htmlContent=this.conf.htmlContentFn.call(this);
        }
        
      }
      
      /*
       * View.renderTemplate(data)
       * 
       *   Render the template for this view against the specified
       *   data. The template will replace all the node content or the content
       *   after the SC-START marker comment and before the SC-END marker comment.
       */
      this.renderTemplate = function(data)
      {
        if (!data && data!="")
        { 
          if (this.conf.trace)
          { console.log("No template data to render",data,this);
          }
          return;
        }
        
      
        var node=this.peer.element();
        var children=node.childNodes;
        var start;
        var end;
        var remove=[];
        for (var i=0;i<children.length;i++)
        { 
          var child=children[i];
          if (child.nodeType==8)
          {
            if (child.nodeValue=="SC-START")
            { 
              start=child;
              remove=[];
            }
            else if (child.nodeValue=="SC-END")
            { 
              end=child;
            }
            else if (end==null)
            { remove.push(child);
            }
          }
          else if (end==null)
          { remove.push(child);
          }
        }
        if (!end)
        {
          end=document.createComment("SC-END");
          node.appendChild(end);
        }
        if (!start)
        { 
          start=document.createComment("SC-START");
          node.insertBefore(start,end);
        }
        if (remove)
        { 
          for (var i=0;i<remove.length;i++)
          { 
            var rpeer=SC.webui.existingPeer(remove[i]);
            if (rpeer)
            { rpeer.dispose();
            }
            node.removeChild(remove[i]);
          }
        }
        
        var html="";
        if (this.peer.render)
        { html=this.peer.render(data);
        }
        else if (this.peer.templates)
        {
          for (var i=0;i<this.peer.templates.length;i++)
          { 
            var template=this.peer.templates[i];
            if (template.name==null)
              html+=template.render(this,data);
          }
        }
        else if (this.conf.templateRef)
        { 
          var template=this.peer.findTemplate(this.conf.templateRef);
          if (template)
          { html+=template.render(this,data);
          }
        }
        if (html.length>0)
        { 
          var nodes=SC.dom.nodesFromHTML(html);
          if (this.conf.trace)
          { console.log("html ",html);
          }
          for (var i=0;i<nodes.length;i++)
          {
            var newchild=nodes[i];
            if (this.conf.trace)
            { console.log("node ",newchild);
            }
            newchild=node.insertBefore(newchild,end);
            if (newchild)
            { SC.webui.processTree(newchild);
            }
          }

        }
        
      }
    }
    ,function()
    { 
      SC.webui.registerView
        ("view",function(p,n,c) { return new this(p,n,c); }.bind(this));
    }
  );
  
  /*
   * Template 
   * 
   *   Renders dynamic data from a model into a template 
   */
  self.Template = SC.extend
    (self.View
    ,function(peer,node,conf)
    {
      self.View.call(this,peer,node,conf);
      
    }
    ,new function()
    { 
      this.updateContents=function()
      { 
        this._super();
        if (this.model)
        { this.renderTemplate(this.model.get());
        }
      }
    }
    ,function()
    { 
      SC.webui.registerView
        ("template",function(p,n,c) { return new this(p,n,c); }.bind(this));
    }
    );
        
  /*
   * Container groups several components into some form of interaction model.
   */
  self.Container = SC.extend
    (self.View
    ,function(peer,node,conf) 
    { 
      self.View.call(this,peer,node,conf);
      if (this.conf.trace) 
        console.log("Constructing "+(typeof this)+JSON.stringify(this));
    }
    ,new function() 
    {
      this.class={ name: "spiralcraft.app.Container" };
      
      /*
       * Compose an id for logging / debugging that combines the configured name
       *   and the peer id.
       */
      this.prettyId = function()
      { return this.conf.name+" ("+this.peer.nid+")";
      }
    }
    ,function()
    { 
      SC.webui.registerView
        ("container",function(p,n,c) { return new this(p,n,c); }.bind(this));
    }
  );
  
  
  /*
   * View Selector
   * 
   * A control that switches between one of several views
   */
  self.ViewSelector = SC.extend
    (self.Container
    ,function(peer,node,conf) 
      {
        self.Container.call(this,peer,node,conf);
        this.views=[];
        this.selected=null;
        this.stateMachine=null;
        if (conf.stateMachine)
        { 
          this.stateMachine=new self.StateMachine(conf.stateMachine);
          this.stateMachine.observe(this);
          this.stateMachine.controller=this;
        }
      }
    ,new function() 
      {
        this.class={ name: "spiralcraft.app.ViewSelector" };
      
        this.init = function()
        {
          this._super();
          if (this.stateMachine)
          { this.stateMachine.init();
          }
        }
        this.subtreeProcessed = function()
        {
          this._super();
          this.updateFromStateMachine();
          if (this.conf.trace)
            console.log("ViewSelector-sp");
        }
        /**
         * Called to register a View to be controlled by this ViewSelector
         */
        this.registerView = function(name,peer)
        {
          var entry={};
          var element=peer.element();
          entry.name=name;
          entry.peer=peer;
          entry.defaultDisplay=element.style.display;
          element.style.display='none';
          this.views[name]=entry;
          if (this.conf.trace) 
            console.log("Registered view '"+name+"'")
        }
        
        /*
         * Select a named view
         */
        this.selectView = function(name) 
        {
          if (this.conf.trace) 
            console.log("selectView",name);
          var target=this.views[name];
          if (target)
          { 
            if (this.selected)
            { 
              var view=this.selected.peer.view;
              if (view.leavingFocus)
              { view.leavingFocus();
              }
              this.selected.peer.element().style.display='none';
              if (view.leftFocus)
              { view.leftFocus();
              }
            }
            this.selected=target;
            var view=target.peer.view;
            if (view.enteringFocus)
            { view.enteringFocus();
            }
            target.peer.element().style.display=target.defaultDisplay;
            if (view.enteredFocus)
            { view.enteredFocus();
            }
            
          }
          else
          { console.log("View "+name+" not found in "+this.conf.contextName);
          }
        }
        
        this.selectState = function(name)
        { this.stateMachine.selectState(name);
        }
        
        this.doAction = function(name)
        { 
          this.stateMachine.doAction(name);
          this.updateFromStateMachine();
        }
        

        this.updateFromStateMachine = function()
        {
          this.selectView(this.stateMachine.selectedState.config.viewName);
        }
        
        this.notify = function(event)
        {
          this.updateFromStateMachine();
          this.notifyObservers(event);
        }
        
      }
    );
  
  
  /*
   * Router
   * 
   * Switches focus between multiple views based on input from menus, application
   *   logic, and/or URL fragments based on a state machine.
   */
  self.Router = SC.extend 
    (self.ViewSelector
    ,function(peer,node,conf) 
      {
        self.ViewSelector.call(this,peer,node,conf);
        
        
        if (!this.parent)
        { 
          this.lastHash=window.location.hash.substring(1);
          this.initialHash=this.lastHash;
          this.initialHashProcessed=false;
          SC.dom.registerWindowOnHashChange(this.hashChangeListener.bind(this));
        }
        // XXX Only do this is we're the top router reading the URL state
      }
    ,new function()
      {
        this.class={ name: "spiralcraft.app.Router" };
      
        this.subtreeProcessed = function()
        {
          this._super();
          if (this.initialHash && !this.initialHashProcessed)
          { this.navTo(this.initialHash);
          }
          this.updateFromStateMachine();
          if (this.conf.trace)
            console.log("Router-sp");
        } 
        
        /*
         * Navigate to the specfied hash
         */
        this.navTo = function(hash)
        { 
          this.selectState(hash);
          window.history.pushState(undefined,undefined,"#"+hash);
        }
        
        this.hashChangeListener = function(event)
        {
          var newHash=SC.uri.getFragment(event.newURL);
          if (newHash != this.lastHash)
          { 
            if (this.conf.trace)
              console.log("Hash changed from "+this.lastHash+" to "+newHash,event);
            this.selectState(newHash);
            this.lastHash=newHash;
          }
        }
      }
      ,function()
      { 
        SC.webui.registerView
          ("router",function(p,n,c) { return new this(p,n,c); }.bind(this));
      }
    );
    
  /*
   * RoutedView
   * 
   * A view that is controlled by the state of a router
   */
  self.RoutedView = SC.extend(
    self.Container
    ,function(peer,node,conf) 
    {
      self.Container.call(this,peer,node,conf);

      if (this.conf.trace) 
        console.log(JSON.stringify(this));
      if (this.conf.trace) 
        console.log(JSON.stringify(this.prototype));
      
      if (conf.router)
      {
        var contextView=this.contextView(conf.router);
        if (contextView)
        {
          if (this.conf.trace) 
            console.log(contextView);
          contextView.registerView(conf.name ? conf.name : peer.id,peer);
        }
        else
        { console.log("Specified router '"+conf.router+"' not found "+prettyId());
        }
      }
      else
      { 
        var contextView=this.contextView(self.Router);
        if (contextView)
        {
          if (this.conf.trace) 
            console.log(contextView);
          contextView.registerView(conf.name ? conf.name : peer.id,peer);
        }
        else
        { console.log("No router specified or found for "+prettyId());
        }
      }
    }
    ,new function() 
    {
      this.class={ name: "spiralcraft.app.RoutedView" };
      
      this.enteringFocus = function() { this.notifyListeners("enteringFocus"); };
      this.enteredFocus = function() { this.notifyListeners("enteredFocus"); };
      this.leavingFocus = function() { this.notifyListeners("leavingFocus"); };
      this.leftFocus = function () { this.notifyListeners("leftFocus"); };
      
    }
    ,function()
    { 
      SC.webui.registerView
        ("routedView",function(p,n,c) { return new this(p,n,c); }.bind(this));
    }
  );
  

  /*
   * Iterator
   * 
   * Iterates source data for rendering.
   * 
   * The conf object contains an "iterate" function which will be called with
   *   "this" = to the this view to provide access to the component tree. 
   */
  self.Iterator = SC.extend(
    self.Container
    ,function(peer,node,conf) 
    { 
      var defaultConf={ autoRefresh: true };
      self.Container.call(this,peer,node,SC.copy(defaultConf,conf));
      this.index=null;
      this.iteratingItem=null;
    }
    ,new function() 
    {
      this.class={ name: "spiralcraft.app.Iterator" };

      /*
       * Render the content before the end of this node. Process the dom on the
       *   rendered content to pick up any script.
       */
      this.subtreeProcessed = function()
      {
        this._super();
        if (this.conf.autoRefresh==true)
          this.refresh();
      }
      
      this.refresh = function()
      {
        var data;
        
        try
        {
          if (this.peer.iterate)
          { data=this.peer.iterate();
          }
          else if (this.conf.iterate)
          { data=this.conf.iterate.call(this);
          }
        }
        catch (e)
        { this.error("Problem iterating data source",e);
        }
        
        if (this.conf.trace) console.log("Iterate: "+data);
        
        if (data)
        {
          var node=this.peer.element();
          if (!node)
          { 
            console.log("No element!",this,this.peer);
            return;
          }
          var children=node.childNodes;
          var start;
          var end;
          var startIndex;
          var endIndex;
          var remove=[];
          for (var i=0;i<children.length;i++)
          { 
            var child=children[i];
            if (child.nodeType==8)
            {
              if (child.nodeValue=="SC-START")
              { 
                start=child;
                startIndex=i;
                remove=[];
              }
              else if (child.nodeValue=="SC-END")
              { 
                end=child;
                endIndex=i;
              }
              else if (end==null)
              { remove.push(child);
              }
            }
            else if (end==null)
            { remove.push(child);
            }
          }
          if (!end)
          {
            end=document.createComment("SC-END");
            endIndex=children.length;
            node.appendChild(end);
          }
          if (!start)
          { 
            start=document.createComment("SC-START");
            startIndex=endIndex;
            endIndex++;
            node.insertBefore(start,end);
          }
          if (remove)
          { 
            for (var i=0;i<remove.length;i++)
            { 
              var rpeer=SC.webui.existingPeer(remove[i]);
              if (rpeer)
              { rpeer.dispose();
              }              
              node.removeChild(remove[i]);
            }
          }
          
          this.index=0;
          SC.forEach
            (data
            ,function(data) 
              {  
                this.iteratingItem = data;
                
                var html="";
                if (this.peer.render)
                { html=this.peer.render(data);
                }
                else if (this.peer.templates)
                {
                  for (var i=0;i<this.peer.templates.length;i++)
                  { 
                    var template=this.peer.templates[i];
                    if (template.name==null)
                      html+=template.render(this,data);
                  }
                }
                else if (this.conf.templateRef)
                { 
                  var template=this.peer.findTemplate(this.conf.templateRef);
                  if (template)
                  { html+=template.render(this,data);
                  }
                }
                if (html.length>0)
                { 
                  var nodes=SC.dom.nodesFromHTML(html);
                  if (this.conf.trace)
                  { console.log("html ",html);
                  }
                  for (var i=0;i<nodes.length;i++)
                  {
                    var newchild=nodes[i];
                    if (this.conf.trace)
                    { console.log("node ",newchild);
                    }
                    newchild=node.insertBefore(newchild,end);
                    if (newchild)
                    { SC.webui.processTree(newchild);
                    }
                    endIndex++;
                  }

                }
                this.index++;
              }.bind(this)
            );
          this.index=null;
          this.iteratingItem=null;
        }
      }

    }
    ,function()
    { 
      SC.webui.registerView
        ("iterator",function(p,n,c) { return new this(p,n,c); }.bind(this));
    }
  );
  
  /*
   * Selector: A writable control which controls selection from a set of items. 
   */
  self.Selector = SC.extend
    (self.Container
      ,function(peer,node,conf)
      { 
        self.Container.call(this,peer,node,conf);
        this.selectorMap=[];
        this.selected=null;
        this.target=conf.target.call(this);
        if (!conf.keyFn)
        { conf.keyFn= function(data) { return data.id }
        }
      }
      ,new function()
      {
        this.class={ name: "spiralcraft.app.Selector" };

        /*
         * Render the content before the end of this node. Process the dom on the
         *   rendered content to pick up any script.
         */
        this.subtreeProcessed = function()
        {
          this._super();
          var data=this.conf.options.call(this);
          
          if (this.conf.trace) console.log(data);
          var node=this.peer.element();
          
          SC.forEach
            (data
            ,function(data) 
              {  
                this.iteratingItem = data;
                var html="";
                if (this.peer.render)
                { html=this.peer.render(data);
                }
                else if (this.peer.templates)
                {
                  for (var i=0;i<this.peer.templates.length;i++)
                  { html+=this.peer.templates[i].render(this,data);
                  }
                }
                node.insertAdjacentHTML("beforeend",html);
                
                SC.webui.processTree(node.children[node.children.length-1]);              
              }.bind(this)
            );
          
          this.target.observe(this);
          this.notify();
        }
        
        this.registerItem = function(selectorItem)
        {
          if (this.conf.trace)
            console.log("registering",selectorItem," for ",this.iteratingItem);
          selectorItem.setData(this.iteratingItem);
          this.selectorMap[this.conf.keyFn(this.iteratingItem)]=selectorItem;
          
        }
        
        this.itemSelected = function(data)
        { this.conf.select.call(this,data);
        }
        
        this.notify = function(event)
        {
          var selected=this.conf.selected.call(this);
          if (this.selected != selected)
          {
            var unselectItem = this.selected?this.selectorMap[this.conf.keyFn(this.selected)]:null;
            if (unselectItem)
            { 
              if (this.conf.trace) 
                console.log("Unselecting ",unselectItem,this.selected);

              unselectItem.selectionChanged(false);
            }
            
            var selectItem=selected?this.selectorMap[this.conf.keyFn(selected)]:null;
            if (selectItem)
            { 
              if (this.conf.trace)
                console.log("Selecting ",selectItem,selected);
              
              selectItem.selectionChanged(true);
            }
            this.selected=selected;
          }
        }
      }
      ,function()
      { 
        SC.webui.registerView
          ("selector",function(p,n,c) { return new this(p,n,c); }.bind(this));
      }
    );
  
  /*
   * SelectorItem: Represents an item in a Selection
   */
  self.SelectorItem = SC.extend
    (self.Container
      ,function(peer,node,conf)
      { 
        self.Container.call(this,peer,node,conf);
        this.data=null;
        
        this.selector=peer.contextView(self.Selector);
        if (this.selector)
        { this.selector.registerItem(this); 
        }
        else
        { console.log("Can't find Selector");
        }
        node.onclick=this.click.bind(this);
      }
      ,new function()
      {
        this.class = { name: "spiralcraft.app.SelectorItem" };

        this.selectionChanged = function(isSelected)
        { 
          if (isSelected)
          { SC.dom.addClass(this.node,"selected");
          }
          else
          { SC.dom.removeClass(this.node,"selected");
          }
        }
        
        this.setData = function(data)
        { this.data=data;
        }
        
        this.click = function() 
        { this.selector.itemSelected(this.data);
        }        
      }
      ,function()
      { 
        SC.webui.registerView
          ("selectorItem",function(p,n,c) { return new this(p,n,c); }.bind(this));
      }
    );
  
  /*
   * Clickable: A simple control which reponds to a click with some action
   */
  self.Clickable = SC.extend
    (self.View
      ,function(peer,node,conf)
      {
        self.View.call(this,peer,node,conf);
        if (conf.onClick)
        { node.onclick=this.click.bind(this);
        }
        
      }
      ,new function()
      {
        this.class = { name: "spiralcraft.app.Clickable" };
        this.click = function() {
          // console.log("Click",this);
          this.conf.onClick.call(this);
          return false;
        }
      }
      ,function()
      { 
        SC.webui.registerView
          ("clickable",function(p,n,c) { return new this(p,n,c); }.bind(this));
      }
    );

  /*
   * BoundInput
   *  
   *   A control used to edit data stored somewhere else
   */
  self.BoundInput = SC.extend
    (self.View
      ,function(peer,node,conf)
      {
        self.View.call(this,peer,node,conf);
      }
      ,new function()
      {
        this.class = { name: "spiralcraft.app.BoundInput" };
        
        this.init = function()
        { 
          this.control=this.contextView(self.BoundControl);
          if (this.control!=null)
          { this.control.registerInput(this);
          }
          this._super();
          this.node.addEventListener("blur",this.leftFocus.bind(this));
          this.node.addEventListener("focus",this.gainedFocus.bind(this));
        }

        this.initModelDependents = function()
        {
          if (this.model==null)
          {
            if (this.control!=null)
            { this.model=this.control.buffer;
            }
          }
          if (this.model!=null)
          { this.binding = new SC.webui.DataBinding(this.node,this.peer,this.model);
          }
          else if (this.conf.source)
          { 
            this.binding 
              = new SC.webui.DataBinding
                (this.node
                ,this.peer
                ,this.conf.source
                ,this.conf.setter
                );
          }
          
        }

        this.leftFocus = function()
        { 
          if (this.conf.trace) { console.log("Left focus"); }
          this.notifyListeners("blur");
        }
        
        this.gainedFocus = function()
        { 
          if (this.conf.trace) { console.log("Gained focus"); }
          this.notifyListeners("focus");
        }
        
        this.refresh = function() 
        { 
          if (!this.binding)
          { console.log("No binding for ",this);
          }
          this.binding.updateControl();
          this._super();
        }
        
        this.getValue = function()
        { return this.binding.getControlValue();
        }
      }
      ,function()
      { 
        SC.webui.registerView
          ("boundInput",function(p,n,c) { return new this(p,n,c); }.bind(this));
      }
    );
  
  /*
   * ControlLabel
   * 
   *    A label for a control
   */
  self.ControlLabel = SC.extend
    (self.View
      ,function(peer,node,conf)
      {
        self.View.call(this,peer,node,conf);
      }
      ,new function()
      {
        this.class = { name: "spiralcraft.app.BoundControl" };
        
        this.init = function()
        { 
          this._super();
          this.control=this.contextView(self.BoundControl);
          if (this.control!=null)
          { this.control.registerLabel(this);
          }
        }
      }
      ,function()
      { 
        SC.webui.registerView
          ("controlLabel",function(p,n,c) { return new this(p,n,c); }.bind(this));
      }
    );
  
  /*
   * BoundControl
   * 
   *   A Container for data editing controls which coordinates 
   *     interactive event handling and validation state. 
   */
  self.BoundControl = SC.extend
    (self.Container
      ,function(peer,node,conf)
      {
        self.Container.call(this,peer,node,conf);
        this.buffer=null;
        this.message=null;
        this.status=null;
        this.lastValue=null;
        this.rules=[];
        this.labelView=null;
        this.inputView=null;
        this.form=null;
        if (this.conf.rules)
        { 
          this.conf.rules.forEach
           (function(rule) {this.rules.push(new self.ValidationRule(rule))}.bind(this)
           )
        }
        
      }
      ,new function()
      {
        this.class = { name: "spiralcraft.app.BoundControl" };
        
        this.init = function()
        { 
          this._super();
          this.form=this.contextView(self.FormContainer);
          if (this.form)
          { this.form.registerControl(this);
          }
        }
        
        this.postInit = function()
        {
          this._super();
          if (this.labelView && this.inputView)
          {
            this.labelView.node.setAttribute("for",this.inputView.node.id);
          }
          if (this.inputView)
          { 
            this.inputView.addListener("blur",this.inputLostFocus.bind(this));
            this.inputView.addListener("focus",this.inputGainedFocus.bind(this));
          }
        }
        this.initModelDependents = function()
        {
          this.buffer
            =new SC.webui.Channel
              (this.bufferGet.bind(this)
              ,this.bufferSet.bind(this)
              );     
          this.message=new SC.webui.Value();
          this.status=new SC.webui.Value();
        }

        this.registerInput=function(view)
        { this.inputView=view;
        }
        
        this.registerLabel=function(view)
        { this.labelView=view;
        }
        
        
        this.inputGainedFocus = function()
        {
          if (this.conf.trace) { console.log("control gained focus") }
          this.validateScope("enter");
        }
        this.inputLostFocus = function()
        {
          if (this.conf.trace) { console.log("control lost focus") }
          this.validateScope("leave");
        }
        
        this.refresh = function() 
        { this._super();
        }
        
        /*
         * Called via the buffer when a child requests the property value
         */
        this.bufferGet = function()
        {
          var val=this.model.get();
          this.lastValue=val;
          return val;
        }
        
        /*
         * Called via the buffer when a child is setting a property value
         */
        this.bufferSet = function(value)
        { 
          var lastStatus=this.status.get();
          var valid=this.validate(value,"change");
          var set=false;
          if (this.conf.trace) { console.log("control value changed to ",value) }
          if (valid)
          {
            this.lastValue=value;
            set=this.model.set(value);
          }
            
          if (this.status.get()!=lastStatus)
          { 
            if (this.form)
            { this.form.controlValidationStatusChanged(valid);
            }
          }
          return set;
        }
        
        /*
         * Validate rules associated with the given scope
         */
        this.validateScope = function(scope)
        {
          var lastStatus=this.status.get();
          var valid=this.validate(this.inputView.getValue(),scope);
          var newStatus=this.status.get();
          if (newStatus!=lastStatus)
          { 
            if (this.form)
            { this.form.controlValidationStatusChanged(valid);
            }
          }
          return valid;
        }
        
        /*
         * Runs validation on an input
         */
        this.validate = function(value,scope)
        {
          var pass=true;
          var msg="";
          var status="pass";
          for (var i in this.rules)
          {
            var rule=this.rules[i];
            if (scope=="input" && rule.onInput!=true)
            { continue;
            }
            if (scope=="enter" && rule.onEnter!=true)
            { continue;
            }
            if (scope=="leave" && rule.onLeave!=true)
            { continue;
            }
            if (scope=="change" && rule.onChange!=true)
            { continue;
            }
            if (scope=="action" && rule.onAction!=true)
            { continue;
            }
            
            var rulePass=rule.test.call(this,value);
            if (!rulePass)
            {
              pass=false;
              if (typeof rule.message == "string")
              { msg=rule.message;
              }
              else if (typeof rule.message == "function")
              { msg=rule.message.call(this,value);
              }
              status=rule.status;
              break;
            }
          }
          this.message.set(msg);
          this.status.set(status);
          return pass;
        }
        
        
      }
      ,function()
      { 
        SC.webui.registerView
          ("boundControl",function(p,n,c) { return new this(p,n,c); }.bind(this));
      }
    );
  
  /*
   * ValidationRule
   */
  self.ValidationRule = SC.extend
    (SC.SCObject
      ,function(def)
      {
        if (!def)
        { throw new Error("ValidationRule constructor argument is null");
        }
        SC.SCObject.call(this);
        this.test=def.test?def.test:function(_){return true};
        this.message=def.message?def.message:"Invalid input";
        this.status=def.status?def.status:"warning";
        this.onChange=def.onChange!=null?def.onChange:true;
        this.onEnter=def.onEnter!=null?def.onEnter:false;
        this.onLeave=def.onLeave!=null?def.onLeave:true;
        this.onInput=def.onInput!=null?def.onInput:false;
        this.onAction=def.onAction!=null?def.onAction:true;
      }
      ,new function()
      {
      }
    );
  
  /*
   * FormContainer
   * 
   *   Coordinates a set of input controls and actions related to some user activity. 
   */
  self.FormContainer = SC.extend
    (self.Container
      ,function(peer,node,conf)
      {
        self.Container.call(this,peer,node,conf);
        this.controls=[];
        this.pass=new SC.webui.Value();
      }
      ,new function()
      {
        this.class = { name: "spiralcraft.app.FormContainer" };
        
        this.init = function()
        { this._super();
        }
        
        this.registerControl = function(control)
        { this.controls.push(control);
        }
        
        /*
         * scanValidationStatus
         * 
         *   Scan controls for their validation status.
         *   
         *   Return false if any controls are in failure state, true if all
         *     controls have passed, or null if any controls are unvalidated
         */
        this.scanValidationStatus = function()
        {
          var none=false;
          var pass=false;
          for (var i in this.controls)
          { 
            var status=this.controls[i].status.get();
            if (status=="pass")
            { pass=true;
            }
            else if (status)
            { 
              if (this.conf.trace)
              { console.log("fail Status for ",this.controls[i].peer.id,status);
              }
              fail=true;
              return false;
            }
            else
            { none=true;
            }
          }
          if (none)
          { 
            if (this.conf.trace)
            { console.log("validation status=none");
            }
            return null;
          }
          else if (pass)
          { return true;
          }
        }
        
        /*
         * controlValidationStatusChanged(pass)
         * 
         *   Called by child controls when the validation status changes after data
         *     is updated
         */
        this.controlValidationStatusChanged = function(pass)
        {
          if (pass)
          {
            if (this.pass!=true)
            { 
              var globPass=this.scanValidationStatus();
              if (globPass!=this.pass)
              { 
                this.pass.set(globPass);
                this.validationStatusChanged();
              }
              
            }
          }
          else
          {
            this.pass.set(false);
            this.validationStatusChanged();
          }
        }
        
        this.validationStatusChanged = function()
        {
          if (this.conf.trace)
          { console.log("Validation status changed ",this.pass.get());
          }
        }
        
        /*
         * validateAndAction
         * 
         *   Perform an action after performing all action-stage validation on 
         *      controls
         */
        this.validateAndAction = function(action)
        {
          var pass=true;
          for (var i in this.controls)
          {
            pass=this.controls[i].validateScope("action");
            if (pass==false)
            { 
              this.pass.set(false);
              this.validationStatusChanged();
              if (this.conf.trace)
              { console.log("Control failed ",this.controls[i].peer.id);
              }
              break;
            }
          }
          if (pass!=false)
          { 
            if (this.conf.trace) { console.log("Passed! performing action") }
            action(); 
          }
        }
      }
      ,function()
      { 
        SC.webui.registerView
          ("formContainer",function(p,n,c) { return new this(p,n,c); }.bind(this));
      }
    );
  
  return self;
}(SPIRALCRAFT.app || {}));