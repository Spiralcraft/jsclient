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
        { if (this.conf.init) this.conf.init.call(this);
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
   * A View manages the interaction between the framework and a DOM node.
   */
  self.View = SC.extend
    (self.Component
    ,function(peer,node,conf) 
    { 
      var defaultConf={ autoRefresh: true };
      self.Component.call(this,SC.copy(defaultConf,conf));
      this.peer=peer;
      this.node=node;
      this.model=null;
      this.parentView=null;
      this.onEnteringFocusSubscribed=false;
      this.refreshOnEnteringFocus;
    }
    ,new function() 
    { 
      this.class={ name: "spiralcraft.app.View" };
      
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
                ,null
                );
          }
          else
          { console.log("Unrecognized model config",this);
          }
        }
        
        if (!this.onEnteringFocusSubscribed)
        {
          if (this.conf.autoRefresh || 
              (this.conf.refreshEvents 
               && this.conf.refreshEvents.indexOf("enteringFocus")>-1
              )
             ) 
          { this.subscribeOnEnteringFocus();
          }
        }
        
        this.checkVisible();
      }

      /*
       * View.subscribeOnEnteringFocus
       */
      this.subscribeOnEnteringFocus = function()
      {
        if (this.parentView)
        { 
          this.parentView.addListener
            ("enteringFocus",this.enteringFocusHandler.bind(this));
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
          
        }

      }
      
      
      /*
       * View.refresh() 
       * 
       *   Refresh this view
       */
      this.refresh = function()
      {
        if (this.model)
        { this.renderTemplate(this.model.get());
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
        if (!data)
        { return;
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
          { node.removeChild(remove[i]);
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
   * Container groups several components into some form of interaction model.
   */
  self.Container = SC.extend
    (self.View
    ,function(peer,node,conf) 
    { 
      self.View.call(this,peer,node,conf);
      this.peer=peer;
      this.node=node;
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
        
        if (this.peer.iterate)
        { data=this.peer.iterate();
        }
        else if (this.conf.iterate)
        { data=this.conf.iterate.call(this);
        }
        
        if (this.conf.trace) console.log("Iterate: "+data);
        
        if (data)
        {
          var node=this.peer.element();
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
            { node.removeChild(remove[i]);
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
        }
      }
      ,function()
      { 
        SC.webui.registerView
          ("clickable",function(p,n,c) { return new this(p,n,c); }.bind(this));
      }
    );

  /*
   * BoundInput: A control used to edit data stored somewhere else
   */
  self.BoundInput = SC.extend
    (self.View
      ,function(peer,node,conf)
      {
        self.View.call(this,peer,node,conf);
        this.binding = new SC.webui.DataBinding(node,peer,conf.source,conf.setter);
      }
      ,new function()
      {
        this.class = { name: "spiralcraft.app.BoundInput" };
        
        this.init = function()
        { 
          this._super();
          if (this.conf.refreshOnInit)
          { this.refresh();
          }
        }

        this.refresh = function() 
        { this.binding.updateControl();
        }
      }
      ,function()
      { 
        SC.webui.registerView
          ("boundInput",function(p,n,c) { return new this(p,n,c); }.bind(this));
      }
    );

  return self;
}(SPIRALCRAFT.app || {}));