//
//Copyright (c) 2010 Michael Toth
//Spiralcraft Inc., All Rights Reserved
//
//This package is part of the Spiralcraft project and is licensed under
//a multiple-license framework.
//
//You may not use this file except in compliance with the terms found in the
//SPIRALCRAFT-LICENSE.txt file at the top of this distribution, or available
//at http://www.spiralcraft.org/licensing/SPIRALCRAFT-LICENSE.txt.
//
//Unless otherwise agreed to in writing, this software is distributed on an
//"AS IS" basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
//

/*
 * Spiralcraft JQuery Extension Library 
 *
 * Common functionality for use with jquery
 */
var SPIRALCRAFT = (function (my) { 
  return my; 
}(SPIRALCRAFT || {}));


SPIRALCRAFT.ajax = (function (my) { 
  
  my.get = (function(location,callback) {
    $.get(location,callback);
  });    
      

  
  return my; 
}(SPIRALCRAFT.ajax || {}));

