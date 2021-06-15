import view from '@vfs/spiralcraft/data/view.js';
import cloneDeep from 'clone-deep';

export default function(options)
{
  let apiEndpoint=options.apiEndpoint;
  
  let app;
  let thisView;
  const superOptions=options;
  
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
    let params={ ...obj };
    // Don't put primary key in data
    params.id=undefined;
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
    app.api.postJSON
      (apiEndpoint+keyValue[0]+"/.delete"
      , (r)=> 
        { callback(r);
        }
      );
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
      pkey: o => [o.id],
      ...superOptions
    };
    
    thisView=view(options);
  
    return thisView;
  }
  
}