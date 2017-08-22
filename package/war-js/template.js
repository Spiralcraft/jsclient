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

  self.expandTemplates = (function (root) {
    SPIRALCRAFT.dom.scanNodes
      (root
      ,function (parent,child) {
          var templateRef=self.readTemplateRef(child);
          return !templateRef;
        }
      );
  });
  
  // Determine whether a node is a template reference
  self.readTemplateRef = function(node) {
    
    // Explicit data-template attribute in dom node
    var tpName=SPIRALCRAFT.dom.attributeValue(node,"data-template");
    if (tpName)
    {
      self.handleDomElementUsesTemplate(node,tpName);
      return true;
    }
    
    if (node.nodeName=="SCRIPT")
    {
      console.log(node.nodeName+":"+node.getAttribute("type"));
    }
    return null;
    
  };
  
  self.handleElementUsesTemplate = function(node,tpName) {
    console.log("Template="+tpName+" : "+node);
  };
  
  return self;
}(SPIRALCRAFT.template || {}));