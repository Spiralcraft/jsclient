/*
 * Toolkit for UI logic for client-side interaction
 */
SPIRALCRAFT.app = (function(self) {
  var SC=SPIRALCRAFT;

  
  self.State = SC.extend
    (SC.SCObject
    ,function(conf) 
      {
        SC.SCObject.call(this);
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

  self.StateMachine = SC.extend
    (SC.SCObject
    ,function(machineConfig) 
      {
        // console.log(machineConfig);
        SC.SCObject.call(this);
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
  self.View = SC.extend
    (SC.SCObject
    ,function(peer,node,conf) 
    { 
      SC.SCObject.call(this);
      this.peer=peer;
      this.node=node;
      this.conf=conf;
      if (this.conf.trace) 
        console.log("Constructing "+(typeof this)+JSON.stringify(this));
      if (this.conf.init) this.conf.init.call(this);
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
  self.Container = SC.extend
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
       * Compose an id for logging / debugging that combines the configured name
       *   and the peer id.
       */
      this.prettyId = function()
      { return this.conf.name+" ("+this.peer.nid+")";
      }
    }
  );
  
  SC.webui.registerView
    ("container",function(p,n,c) { return new self.Container(p,n,c); });
  
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
            console.log("Hash changed from "+this.lastHash+" to "+newHash,event);
            this.selectState(newHash);
            this.lastHash=newHash;
          }
        }
      }
    );
  
  SC.webui.registerView
    ("router",function(p,n,c) { return new self.Router(p,n,c); });
  
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
    ,function() {}
  );
  
  SC.webui.registerView
    ("routedView",function(p,n,c) { return new self.RoutedView(p,n,c); });

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
          for (var i=0;i<children.length;i++)
          { 
            var child=children[i];
            if (child.nodeType==8)
            {
              if (child.nodeValue=="SC-START")
              { 
                start=child;
                startIndex=i;
              }
              if (child.nodeValue=="SC-END")
              { 
                end=child;
                endIndex=i;
              }
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
            node.insertBefore(start,end);
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
  );
  
  SC.webui.registerView
    ("iterator",function(p,n,c) { return new self.Iterator(p,n,c); });

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
    );
  
  SC.webui.registerView
    ("selector",function(p,n,c) { return new self.Selector(p,n,c); });

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
    );
  
  SC.webui.registerView
    ("selectorItem",function(p,n,c) { return new self.SelectorItem(p,n,c); });

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
    );

  SC.webui.registerView
    ("clickable",function(p,n,c) { return new self.Clickable(p,n,c); });
  

  return self;
}(SPIRALCRAFT.app || {}));