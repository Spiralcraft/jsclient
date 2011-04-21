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
 * Spiralcraft "Anytime" Extension Library 
 *
 * Functions to use with the jquery based "Anytime" data-time picker.
 */
var SPIRALCRAFT = (function (my) { 
  return my; 
}(SPIRALCRAFT || {}));


// Time utility functions
SPIRALCRAFT.time = (function(my) {

  my.iso8601Converter=new AnyTime.Converter({
    utcFormatOffsetImposed: 0,
    format:"<"+"date>%Y-%m-%dT%H:%i:%s%:<"+"/date>"
    });
    
  my.defaultConverter=new AnyTime.Converter();
  
  return my;
}(SPIRALCRAFT.time || {}));