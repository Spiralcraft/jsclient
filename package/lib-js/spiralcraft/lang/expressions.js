/*
 * Use tokenized strings to specify data operations
 */


function sub(channel,fn)
{
  channel.subs.push(fn);
  fn(channel.get());
  return () => channel.subs.splice(channel.subs.indexOf(fn),1);
}

function pub(subs,value)
{ subs.map( fn => fn(value) );
}

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
    set: (value) => { chain.get()[name]=value; pub(channel.subs,value); return value; },
    getMeta: () => ({ type: "fieldAccessor", name: name, source: chain.getMeta() }),
    sub: (fn) => sub(channel,fn),
    subs: [],
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

function targetRef(fn)
{
  const channel =
  {
    get: () => fn(),
    set: () => {},
    getMeta: () => ({ type: "targetRef", source: fn }),
  }
  return channel;
}

function pipedAccessor(chain,piped)
{
  const path=piped.split(".");
  for (name of path)
  { 
    chain=fieldAccessor(chain,name);
  }
  const channel =
  {
    get: () => chain.get(),
    set: (value) => { value=chain.set(value); pub(channel.subs,value); return value; },
    getMeta: () => ({ type: "piperdAccessor", name: name, chain: chain.getMeta(), }),
    sub: (fn) => sub(channel,fn),
    subs: [],

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

export {fieldAccessor,target,targetRef,pipedAccessor,pipedReference};