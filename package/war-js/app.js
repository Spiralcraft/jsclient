/*
 * Toolkit for UI logic for client-side interaction
 */
SPIRALCRAFT.app = (function(self) {
  
  
  /*
   * Container groups several components into some form of interaction model.
   */
  self.Container = function(peer,node,conf) {
    console.log("Constructing "+(typeof this)+JSON.stringify(this));
    this.peer=peer;
    this.node=node;
    this.conf=conf;
  }
  
  /*
   * View Selector
   * 
   * A control that switches between on of several views
   */
  self.ViewSelector = function(peer,node,conf) {
    SPIRALCRAFT.app.Container.call(this,peer,node,conf);
  };
  
  self.ViewSelector.prototype = new function() {
    this.constructor=self.ViewSelector;
  }
  

  /*
   * Router
   * 
   * Switches focus between multiple views based on input from menus, application
   *   logic, and/or URL fragments based on a state machine.
   */
  self.Router = function(peer,node,conf) {
    SPIRALCRAFT.app.ViewSelector.call(this,peer,node,conf);
  }
  
  self.Router.prototype = new function() {
    this.constructor=self.Router;
  }
  
  SPIRALCRAFT.webui.registerView
    ("router",function(p,n,c) { return new self.Router(p,n,c); });
  
  /*
   * RoutedView
   * 
   * A view that is controlled by the state of a router
   */
  self.RoutedView = function(peer,node,conf) {
    SPIRALCRAFT.app.Container.call(this,peer,node,conf);
  }
  
  self.RoutedView.prototype = new function() {
    this.constructor=self.RoutedView;
  }
  
  SPIRALCRAFT.webui.registerView
    ("routedView",function(p,n,c) { return new self.RoutedView(p,n,c); });

  return self;
}(SPIRALCRAFT.app || {}));