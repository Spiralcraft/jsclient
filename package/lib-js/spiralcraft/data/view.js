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
    cache: false,
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
    
  const showAll = (callback) =>
  { fetchAll(callback);
  }
  
  const showForPkey = (keyValue,callback) => 
  { fetchForPkey(keyValue,callback);
  }

  const edited = (obj,callback) =>
  { post(pkey(obj),obj,callback);
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
    init,
  };
  
  return ret;
}