import path from 'path';
import fs from 'fs';
import slash from 'slash';

export default function(options)
{
  let defaults =
  {
    vfsPrefix: "@vfs",
    projectRoot: "..",
    searchRoots: ['src','srclib','lib'],
    roots: 
      { src: 'src-js'
      , srclib: 'src-js/lib'
      , lib: 'lib-js'
      , npm: 'npm/node_modules'
      },
    verbose: true
  };

  options 
   = options
   ?{ ...defaults
    , ...options
    }
   :defaults;
  
  if (options.srcRoot)
  { options.roots.src=options.srcRoot;
  }
  
  let defaultMatchPrefix = options.vfsPrefix+"/";
  let idMatchPrefix = options.vfsPrefix+".";
  let projectRoot = slash(path.resolve(options.projectRoot));
  let verbose=options.verbose;

  let remapPoints={};
  let remaps={};
  let importer;
  let resolve;
  let resolveCache={};
  
  function buildStart(options)
  { resolve=this.resolve;
  }
  
  async function resolveId(f,importerParam)
  {
    importer=importerParam;
    if (f.startsWith(defaultMatchPrefix) || f.startsWith(idMatchPrefix))
    {
      if (verbose) console.log("Resolving: "+f);
      if (f in resolveCache)
      { return resolveCache[f];
      }
      let firstSlash=f.indexOf('/');
      let vfsPrefix=f.substring(0,firstSlash);
      // if (verbose) console.log("vfxPrefix="+vfsPrefix);
      let dotIndex=vfsPrefix.indexOf(".");
      let root;
      if (dotIndex>0)
      { 
        let rootId=vfsPrefix.substring(dotIndex+1)
        // if (verbose) console.log("Root ID "+rootId);
        root=options.roots[rootId];
        if (!root)
        { throw 'Root not found: '+root;
        }
      }
      let pathInfo=path.parse(f.substring(firstSlash+1));
      if (root)
      { 
        let ret=await resolveInRoot(root,pathInfo);
        resolveCache[f]=ret;
        return ret;
      }
      else
      {
        for (var i=0;i<options.searchRoots.length;i++)
        {
          let searchPath=options.roots[options.searchRoots[i]];
          let foundFile=await resolveInRoot(searchPath,pathInfo);
          if (foundFile)
          { 
            resolveCache[f]=foundFile;
            return foundFile;
          }
        }
      }
      console.log('Could not resolve \''+f+'\' from \''+importer+'\'');
      resolveCache[f]=null;
      return null;
    }
  }
  
  async function resolveInRoot(searchPath,pathInfo)
  {
    let searchDir
      =path.isAbsolute(searchPath)
      ?(searchPath+"/"+pathInfo.dir)
      :(options.projectRoot+"/"+searchPath+"/"+pathInfo.dir)
      ;
    let searchFilename=pathInfo.base;
    let searchFile=searchDir+"/"+searchFilename;
    if (verbose) console.log("Searching: "+searchFile);
    let foundFile;
    if (fs.existsSync(searchFile))
    { 
      if (verbose) console.log("Found "+searchFile);
      foundFile=searchFile;
    }
    else
    {
      let vfsFile=await resolveInVfs(searchDir,searchFilename);
      if (vfsFile)
      { foundFile=vfsFile;
      }
    }
    
    if (foundFile && fs.lstatSync(foundFile).isDirectory())
    { return foundFile+"/index.js";
    }
    else
    { return foundFile;
    }
    
  }

  /*
   * Remap a path to another file tree using a vfs.json remap point
   */
  function vfsRemap(searchDir)
  {
    searchDir=slash(path.resolve(searchDir));
    let remap=remaps[searchDir];
    if (remap)
    { return remap;
    }
    if (remap === null)
    { return null;
    }
    
    let vfsInfo = findRemapPoint(searchDir);
    if (vfsInfo)
    {
      let remappedDir=vfsInfo.base+searchDir.substring(vfsInfo.location.length);
      let ret 
        = { remappedDir: remappedDir,
            vfsInfo: vfsInfo
          };
      remaps[searchDir]=ret?ret:null;
      return ret;
    }
    
  }

  async function resolveInVfs(searchDir,searchFilename)
  {
    let vfsRemapping = vfsRemap(searchDir);
    if (vfsRemapping)
    {
      let vfsInfo = vfsRemapping.vfsInfo;
      let baseParentPath= vfsRemapping.remappedDir;
      let searchFile = baseParentPath+"/"+searchFilename;
      let foundFile;
      if (searchFile.startsWith(options.vfsPrefix))
      { foundFile=await resolveId(searchFile,importer);
      }
      else if (searchFile.startsWith("@@"))
      { 
        // Remove leading "@@" and skip vfs
        searchFile=searchFile.substring(2);
        const resolution= await resolve(searchFile,importer, { skipSelf: true });
        if (resolution) 
        { foundFile=resolution.id;
        }
        else
        { console.log("VFS: "+searchFile+" was not resolved by rollup resolver");
        }
      }
      else if (!path.isAbsolute(searchFile))
      { 
        searchFile=slash(path.resolve(searchFile));
        if (verbose) console.log("Searching: "+searchFile);
        if (fs.existsSync(searchFile))
        { 
          if (verbose) console.log("Found "+searchFile);
          foundFile=searchFile;
        }
        else
        { foundFile=await resolveInVfs(baseParentPath,searchFilename);
        }
      }
      else
      {
        if (verbose) console.log("Searching: "+searchFile);
        if (fs.existsSync(searchFile))
        { 
          if (verbose) console.log("Found "+searchFile);
          foundFile=searchFile;
        }
        else
        { foundFile=await resolveInVfs(baseParentPath,searchFilename);
        }
      }
      return foundFile;
    }
    
  }  
  
  
  const findRemapPoint = function(searchDir)
  {
    let remapPoint=remapPoints[searchDir];
    if (remapPoint)
    { return remapPoint;
    }
    if (remapPoint===null)
    { return null;
    }

    if (verbose) console.log("Searching for vfs remap in "+searchDir+" (cache="+remapPoint+")");
    let vfsInfoFile=searchDir+"/vfs.json";
    if (fs.existsSync(vfsInfoFile))
    {
      let rawdata = fs.readFileSync(vfsInfoFile);
      let vfsInfo = JSON.parse(rawdata);
      vfsInfo.location = searchDir;
      if (verbose) console.log("Found package: "+JSON.stringify(vfsInfo));
      remapPoints[searchDir]=vfsInfo;
      return vfsInfo;
    }
    else
    {
      if (searchDir==projectRoot)
      { return;
      }
      let parentSearchDir=path.dirname(searchDir);
      
      if (parentSearchDir && parentSearchDir!=searchDir)
      {
        let remapPoint=findRemapPoint(parentSearchDir);
        remapPoints[searchDir]=remapPoint?remapPoint:null;
        return remapPoint;
      }
    }
    remapPoints[searchDir]=null;
    
  }
  
  function spin(milliseconds) {
   var currentTime = new Date().getTime();

   while (currentTime + milliseconds >= new Date().getTime()) {
   }
  }
  
  const posixPath = function(path)
  { return path.split(path.sep).join('/');
  }
  
  return {
    name: 'vfsResolve',
    async resolveId(f,importer) { return await resolveId(f,importer) },
    buildStart(options) { buildStart.call(this,options) }
  }
}