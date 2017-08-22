/*
 * Toolkit for UI logic for client-side interaction
 */
SPIRALCRAFT.app = (function(self) {
  
  /*
   * Container groups several components into some form of interaction model.
   */
  self.Container = function() {
    
  }
  
  /*
   * Template Object
   * 
   * Represents a parsed template
   */
  self.ViewSelector = function() {
    SPIRALCRAFT.app.Container.call(this);
  };
  
  self.ViewSelector.prototype = new function() {
    
    this.constructor=self.ViewSelector;
    

    
  }
  
  
  
  return self;
}(SPIRALCRAFT.app || {}));