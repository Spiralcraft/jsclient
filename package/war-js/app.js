/*
 * Toolkit for UI logic for client-side interaction
 */
SPIRALCRAFT.app = (function(self) {
  
  /*
   * Container groups several components into some form of interaction model.
   */
  self.Container = scextend
    (Object
    ,function(peer,node,conf) 
    { 
      this.peer=peer;
      this.node=node;
      this.conf=conf;
      if (this.conf.trace) 
        console.log("Constructing "+(typeof this)+JSON.stringify(this));
    }
    ,new function() 
    {
      this.constructor=self.Container;
      
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
  
  /*
   * View Selector
   * 
   * A control that switches between on of several views
   */
  self.ViewSelector = scextend
    (self.Container
    ,function(peer,node,conf) 
      {
        self.Container.call(this,peer,node,conf);
        this.views=[];
        this.selected=null;
      }
    ,new function() 
      {
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
      }
    );
  
  
  /*
   * Router
   * 
   * Switches focus between multiple views based on input from menus, application
   *   logic, and/or URL fragments based on a state machine.
   */
  self.Router = scextend (
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
  self.RoutedView = scextend(
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

  return self;
}(SPIRALCRAFT.app || {}));