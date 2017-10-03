/*
 * Toolkit for UI logic for client-side interaction
 */
SPIRALCRAFT.app = (function(self) {


  
  self.State = SPIRALCRAFT.extend
    (SPIRALCRAFT.SCObject
    ,function(conf) 
      {
        SPIRALCRAFT.SCObject.call(this);
        this.name=conf.name;
        this.actions=conf.actions;
        this.config=conf;
      }
    ,new function() 
      {
        this.enter = function() {};
        this.exit = function() {};
      }
    );

  self.StateMachine = SPIRALCRAFT.extend
    (SPIRALCRAFT.SCObject
    ,function(machineConfig) 
      {
        // console.log(machineConfig);
        SPIRALCRAFT.SCObject.call(this);
        this.states=[];
        this.statesByName=[];
        
        for (var i=0; i<machineConfig.states.length;i++)
        { 
          var stateConf=machineConfig.states[i];
          if (stateConf)
          {
            var state=new self.State(stateConf);
            this.states.push(state);
            this.statesByName[state.name]=state;
            // console.log(stateConf);
          }
        }
        this.selectedState=this.states[0];
      }
    ,new function() 
      {
        this.selectState = function (name)
        {
          if (this.statesByName[name])
          {
            if (this.selectedState)
            { this.selectedState.exit();
            }
            this.selectedState=this.statesByName[name];
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
                if (action.nextState)
                { this.selectState(action.nextState)
                }
                else
                { console.log("No nextState for action '"+name+"' ",action);
                };  
                 
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
   * Container groups several components into some form of interaction model.
   */
  self.View = SPIRALCRAFT.extend
    (SPIRALCRAFT.SCObject
    ,function(peer,node,conf) 
    { 
      SPIRALCRAFT.SCObject.call(this);
      this.peer=peer;
      this.node=node;
      this.conf=conf;
      if (this.conf.trace) 
        console.log("Constructing "+(typeof this)+JSON.stringify(this));
    }
    ,new function() 
    { 
      this.class={ name: "spiralcraft.app.View" };
      this.subtreeProcessed = function() {};
      this.contextView = function(something) 
      {
        // console.log("View.contextView",something);
        return this.peer.contextView(something);
      };
    }
  );
  
  /*
   * Container groups several components into some form of interaction model.
   */
  self.Container = SPIRALCRAFT.extend
    (self.View
    ,function(peer,node,conf) 
    { 
      self.View.call(this,peer,node,conf);
      this.peer=peer;
      this.node=node;
      this.conf=conf;
      if (this.conf.trace) 
        console.log("Constructing "+(typeof this)+JSON.stringify(this));
    }
    ,new function() 
    {
      this.class={ name: "spiralcraft.app.Container" };
      
      /*
       * Resolve an ancestral view with the given name
       */
      this.resolveContextView = function(name) 
      {
        var contextPeer=this.peer.context(name);
        if (contextPeer)
        {
          if (this.conf.trace) 
            console.log(contextPeer);
          if (contextPeer.view)
          { return contextPeer.view;
          }
          else
          { console.log("No view for peer "+contextPeer.nid+" referred to by "+this.prettyId());
          }
        }
        else
        { console.log("Could not find context '"+name+"' from "+this.prettyId());
        }
      }

      /*
       * Compose an id for logging / debugging that combines the configured name
       *   and the peer id.
       */
      this.prettyId = function()
      { return this.conf.name+" ("+this.peer.nid+")";
      }
    }
  );
  
  SPIRALCRAFT.webui.registerView
    ("container",function(p,n,c) { return new self.Container(p,n,c); });
  
  /*
   * View Selector
   * 
   * A control that switches between one of several views
   */
  self.ViewSelector = SPIRALCRAFT.extend
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
        }
      }
    ,new function() 
      {
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
        this.registerView = function(name,peer) {
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
          var target=this.views[name];
          if (target)
          { 
            if (this.selected)
            { this.selected.peer.element().style.display='none';
            }
            target.peer.element().style.display=target.defaultDisplay;
            this.selected=target;
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
  self.Router = SPIRALCRAFT.extend 
    (
    self.ViewSelector
        ,function(peer,node,conf) 
        {
          self.ViewSelector.call(this,peer,node,conf);
        }
        ,new function() {}
    );
  
  SPIRALCRAFT.webui.registerView
    ("router",function(p,n,c) { return new self.Router(p,n,c); });
  
  /*
   * RoutedView
   * 
   * A view that is controlled by the state of a router
   */
  self.RoutedView = SPIRALCRAFT.extend(
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
        var contextView=this.resolveContextView(conf.router);
        if (this.conf.trace) 
          console.log(contextView);
        contextView.registerView(conf.name ? conf.name : peer.id,peer);
      }
      else
      { console.log("No router specified for "+prettyId());
      }
    }
    ,function() {}
  );
  
  SPIRALCRAFT.webui.registerView
    ("routedView",function(p,n,c) { return new self.RoutedView(p,n,c); });

  /*
   * Iterator
   * 
   * Iterates source data for rendering
   */
  self.Iterator = SPIRALCRAFT.extend(
    self.Container
    ,function(peer,node,conf) 
    { 
      self.Container.call(this,peer,node,conf);
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
        var data;
        
        if (this.peer.iterate)
        { data=this.peer.iterate();
        }
        else if (this.conf.iterate)
        { data=this.conf.iterate();
        }
        
        if (this.conf.trace) console.log("Iterate: "+data);
        
        if (data)
        {
          var node=this.peer.element();
          this.index=0;
          SPIRALCRAFT.forEach
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
                SPIRALCRAFT.webui.processTree(node.children[node.children.length-1]);
                this.index++;
              }.bind(this)
            );
          this.index=null;
          this.iteratingItem=null;
        }
      }

    }
  );
  
  SPIRALCRAFT.webui.registerView
    ("iterator",function(p,n,c) { return new self.Iterator(p,n,c); });

  /*
   * Selector: A writable control which controls selection from a set of items. 
   */
  self.Selector = SPIRALCRAFT.extend
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
          SPIRALCRAFT.forEach
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
                SPIRALCRAFT.webui.processTree(node.children[node.children.length-1]);              
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
    );
  
  SPIRALCRAFT.webui.registerView
    ("selector",function(p,n,c) { return new self.Selector(p,n,c); });

  /*
   * SelectorItem: Represents an item in a Selection
   */
  self.SelectorItem = SPIRALCRAFT.extend
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
          { SPIRALCRAFT.dom.addClass(this.node,"selected");
          }
          else
          { SPIRALCRAFT.dom.removeClass(this.node,"selected");
          }
        }
        
        this.setData = function(data)
        { this.data=data;
        }
        
        this.click = function() 
        { this.selector.itemSelected(this.data);
        }        
      }
    );
  
  SPIRALCRAFT.webui.registerView
    ("selectorItem",function(p,n,c) { return new self.SelectorItem(p,n,c); });

  /*
   * Clickable: A simple control which reponds to a click with some action
   */
  self.Clickable = SPIRALCRAFT.extend
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
    );

  SPIRALCRAFT.webui.registerView
    ("clickable",function(p,n,c) { return new self.Clickable(p,n,c); });
  

  return self;
}(SPIRALCRAFT.app || {}));