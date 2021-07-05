/*
 * Use tokenized strings to specify data operations
 */


function fieldAccessor(chain,name)
{
  const channel =
  {
    get: () => 
      { 
        let sval=chain.get();
        try
        { return sval[name];
        }
        catch (error)
        { console.log(error,channel.getMeta());
        }
      },
    set: (value) => { chain.get()[name]=value; return value; },
    getMeta: () => ({ type: "fieldAccessor", name: name, source: chain.getMeta() }),
  };
  return channel;
}

function target()
{
  let value;
  const channel =
  {
    get: () => value,
    set: (newValue) => { value=newValue },
    getMeta: () => ({ type: "target", value: value }),
  };
  return channel;
}

function pipedReference(piped)
{
  const path=piped.split(".");
  const t=target();
  let chain=t;
  for (name of path)
  { 
    chain=fieldAccessor(chain,name);
  }
  const channel =
  {
    get: (tval) => { t.set(tval); return chain.get(); },
    set: (tval,value) => { t.set(tval); return chain.set(value) },
    getMeta: () => ({ type: "piperdReference", chain: chain.getMeta(), target: target.getMeta() }),
  };
  return channel;
}

export {fieldAccessor,target,pipedReference};