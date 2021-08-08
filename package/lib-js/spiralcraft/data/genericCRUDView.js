import view from '@vfs/spiralcraft/data/view.js';
import cloneDeep from 'clone-deep';

export default function(options)
{
  let apiEndpoint=options.apiEndpoint;
  
  let app;
  let thisView;
  let pkeyProp="id";
  if (options.pkeyProp)
  { pkeyProp=options.pkeyProp;
  }

  const superOptions=options;
  
  const normalizeKey = (key) =>
  {
    if (Array.isArray(key))
    { return key;
    }
    else
    { return [key];
    }
  }
  
  const fetchAll 
    = (callback) =>
    {
      app.api.getJSON
        (apiEndpoint
        , (r)=> 
        { callback(r);
        }
        );
    };
    
  const fetchForPkey
    = (keyValue,callback) =>
    {
      keyValue=normalizeKey(keyValue);
      app.api.getJSON
        (apiEndpoint+keyValue[0]
        , (r)=> 
        { callback(r);
        }
        );
    };
    
  const post = (keyValue,obj,callback) =>
  {
    console.log("Posting "+JSON.stringify(obj));
    keyValue=normalizeKey(keyValue);
    let params={ ...obj };
    // Don't put primary key in data
    params[pkeyProp]=undefined;
    app.api.postJSON
      (apiEndpoint+(!keyValue[0]?"-":keyValue[0])
      , (r)=> 
        { callback(r);
        }
      ,params
      );
    
  }
    
  const remove = (keyValue,callback) =>
  {
    keyValue=normalizeKey(keyValue);    
    app.api.postJSON
      (apiEndpoint+keyValue[0]+"/.delete"
      , (r)=> 
        { callback(r);
        }
      );
  }
  
  const sendCall = (key,method,params,callback) =>
  {
    let endpoint;
    if (key === null || key === undefined )
    { endpoint = apiEndpoint+"."+method;
    }
    else
    {
      key=normalizeKey(key);
      endpoint = apiEndpoint+(key?key[0]+"/":"")+"."+method;
    }
    
    if (params)
    {
      app.api.postJSON
        (endpoint
        ,(r)=> 
          { callback(r);
          }
        ,params
        );
    }
    else
    {
      app.api.getJSON
        (endpoint
        ,(r)=> 
          { callback(r);
          }
        );
    }
        
  }
    
  return function(appContext)
  {
    app=appContext;
    let options=
    { 
      fetchAll,
      fetchForPkey,
      post,
      remove,
      sendCall,
      pkey: o => [o[pkeyProp]],
      ...superOptions
    };
    
    thisView=view(options);
  
    return thisView;
  }
  
}