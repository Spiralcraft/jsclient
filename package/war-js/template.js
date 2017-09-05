/*
 * Templating system
 */
SPIRALCRAFT.template = (function(self) {

  /*
   * Template Object
   * 
   * Represents a parsed template
   */
  self.Template = SPIRALCRAFT.extend
    (Object
    ,function(interpolation) 
    {
      this.interpolation=interpolation;
    }
    ,new function() 
    {
      this.render= function(context,param) 
      {
        if (!context)
        { context=this;
        }
        
        var out=[];
        for (var i=0;i<this.interpolation.length;i++)
        {
          if (typeof this.interpolation[i] == "string")
          {
            out.push(this.interpolation[i]);
          }
          else
          {
            out.push(this.interpolation[i].call(context,param));
          }
        }
        return out.join("");
      };
    }
    );
  
  self.parse = function (templateString,config) 
  {
    
    var interpolation=[];
    var pos=0;
    do
    {
      var openCodePos=templateString.indexOf("${",pos);
      if (openCodePos<0)
      { 
        if (pos<templateString.length)
        { interpolation.push(templateString.substring(pos,templateString.length));
        }
        break;
      }
      if (openCodePos>pos)
      { interpolation.push(templateString.substring(pos,openCodePos));
      }
      pos=self.parseCode(templateString,openCodePos+2,interpolation,config);
      
    }
    while (pos<templateString.length);
    
    return new self.Template(interpolation);
    
  };

  self.parseCode = function(templateString,codeStart,interpolation,config)
  {
    var chars=[];
    var i=codeStart;
    var escapes=[];
    do
    {
      var char=templateString[i];
      var esc=escapes.length>0?escapes[escapes.length-1]:null;
      if (char=="}" && !esc)
      {
        var code=chars.join("");
        if (config && config.paramName)
        { interpolation.push(new Function(config.paramName,"return "+code));
        }
        else
        { interpolation.push(new Function("return "+code));
        }
        return i+1;
      }
      else if (esc=="\\")
      { 
        escapes.pop();
        chars.push(char);
      }
      else if (char=="\\")
      { escapes.push(char);
      }
      else if (["\"","'","`"].indexOf(char)>-1)
      {
        if (esc==char)
        { escapes.pop();
        }
        else
        { escapes.push(char);
        }
        chars.push(char);
      }
      else if (["{","(","["].indexOf(char)>-1)
      {
        escapes.push(char);
        chars.push(char);
      }
      else if (["}",")","]"].indexOf(char)>-1)
      {
        if (esc!=char)
        { throw new Exception("Unbalanced parens/brackets '"+char+"'");
        }
        else
        { escapes.pop();
        }
        chars.push(char);
      }
      else
      { chars.push(char)
      }
      i++;
    }
    while (i<templateString.length)
  }
  
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