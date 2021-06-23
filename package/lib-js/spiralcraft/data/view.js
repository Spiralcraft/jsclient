export default function(options)
{
  let data = [];

  let defaults =
  {
    fetchAll: (callback) => callback(data),
    fetchForPkey: (keyValue,callback) => callback(findForPkey(keyValue)),
    post: (obj,callback) => { if (callback) callback(obj) },
    remove: (keyValue,callback) => { if (callback) callback() },
    pkey: (o) => { return Object.values(o)[0] },
    sendCall: (key,method,params,callback) => { console.log("sendCall not defined") },
    cache: false,
    meta:
    {
      fields:
      {
      
      }
    },
    postFields: null,

  };

  options 
    = options
    ?{ ...defaults
     , ...options
     }
    :defaults;


  const fetchAll=options.fetchAll;
  const fetchForPkey=options.fetchForPkey;
  const post=options.post;
  const remove=options.remove;
  const pkey=options.pkey;
  const meta=options.meta;
  const postFields=options.postFields;
  const sendCall=options.sendCall;
    
  const showAll = (callback) =>
  { fetchAll(callback);
  }
  
  const showForPkey = (keyValue,callback) => 
  { fetchForPkey(keyValue,callback);
  }

  const edited = (obj,callback) =>
  { 
    let postObj;
    if (postFields)
    { 
      postObj={};
      postFields.forEach((f) => postObj[f]=obj[f]);
    }
    else
    { postObj=obj;
    }
    post(pkey(obj),postObj,callback);
  }
  
  const call = (key,method,params,callback) =>
  { sendCall(key,method,params,callback);  
  }
  
  const trashed = (keyValue,callback) =>
  { remove(keyValue,callback);
  }

  const init = () => { }
  
  let ret=
  { 
    showAll,
    showForPkey,
    edited,
    trashed,
    call,
    init,
    meta,
  };
  
  return ret;
}