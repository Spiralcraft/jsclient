import path from 'path';
import fs from 'fs';
import slash from 'slash';

export default function(options)
{
  let defaults =
  {
    vfsPrefix: "@vfs",
    projectRoot: "..",
    searchRoots: ['src','lib'],
    roots: 
      { src: 'src-js'
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
  
  let defaultMatchPrefix = options.vfsPrefix+"/";
  let idMatchPrefix = options.vfsPrefix+".";
  let projectRoot = slash(path.resolve(options.projectRoot));
  let verbose=options.verbose;

  let remapPoints={};
  let remaps={};
  let importer;
  
  function resolve(f,importerParam)
  {
    importer=importerParam;
    if (f.startsWith(defaultMatchPrefix) || f.startsWith(idMatchPrefix))
    {
      if (verbose) console.log("Resolving: "+f);
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
      { return resolveInRoot(root,pathInfo);
      }
      else
      {
        for (var i=0;i<options.searchRoots.length;i++)
        {
          let searchPath=options.roots[options.searchRoots[i]];
          let foundFile=resolveInRoot(searchPath,pathInfo);
          if (foundFile)
          { return foundFile;
          }
        }
      }
      console.log('Could not resolve \''+f+'\' from \''+importer+'\'');
      return null;
    }
  }
  
  function resolveInRoot(searchPath,pathInfo)
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
      let vfsFile=resolveInVfs(searchDir,searchFilename);
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

  function resolveInVfs(searchDir,searchFilename)
  {
    let vfsRemapping = vfsRemap(searchDir);
    if (vfsRemapping)
    {
      let vfsInfo = vfsRemapping.vfsInfo;
      let baseParentPath= vfsRemapping.remappedDir;
      let searchFile = baseParentPath+"/"+searchFilename;
      let foundFile;
      if (searchFile.startsWith(options.vfsPrefix))
      { foundFile=resolve(searchFile,importer);
      }
      else if (!searchFile.isAbsolute())
      { 
        searchFile=slash(path.resolve(searchFile));
        if (verbose) console.log("Searching: "+searchFile);
        if (fs.existsSync(searchFile))
        { 
          if (verbose) console.log("Found "+searchFile);
          foundFile=searchFile;
        }
        else
        { foundFile=resolveInVfs(rewrittenDir,searchFilename);
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
        { foundFile=resolveInVfs(rewrittenDir,searchFilename);
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

    console.log("Searching for vfs remap in "+searchDir+" (cache="+remapPoint+")");
    let vfsInfoFile=searchDir+"/vfs.json";
    if (fs.existsSync(vfsInfoFile))
    {
      let rawdata = fs.readFileSync(vfsInfoFile);
      let vfsInfo = JSON.parse(rawdata);
      vfsInfo.location = searchDir;
      console.log("Found package: "+vfsInfo+" in "+searchDir);
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
    resolveId: (f,importer) => resolve(f,importer)
  }
}