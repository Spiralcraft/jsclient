/*
 * Templating system
 */
SPIRALCRAFT.template = (function(self) {

  /*
   * Template Object
   * 
   * Represents a parsed template
   */
  self.Template = function(templateString,declContext) {
    this.templateString=templateSting;
    this.declContext=declContext;
  };
  
  self.Template.prototype = new function() {
    
    this.constructor=self.Template;
    
    this.render= function(context) {
      
    };
    
  }
  
  self.parse = (function (templateString) {
    
    
  });

  return self;
}(SPIRALCRAFT.template || {}));