// Keeps the web server session alive and responds to connection issues
export default function(options={})
{
  const defaults =
  {
    syncLocation: SPIRALCRAFT.webui.syncLocation,
    reloadOnTimeout: true,
    onTimeout: () => { console.log("onTimeout: Session timed out"); },
    pollInterval: 60 * 1000,
    connectFailedPollInterval: 5 * 1000,
    reloadLocation: window.location.href,
    onError: (status,responseText) => 
      { console.log("Error polling "+status+":"+responseText) 
      },
  }
  
  options = { ...defaults, ...options };
  
  let syncLocation = options.syncLocation;
  let reloadOnTimeout = options.reloadOnTimeout;
  let onTimeout = options.onTimeout;
  let pollInterval = options.pollInterval;
  let connectFailedPollInterval = options.connectFailedPollInterval;
  let reloadLocation = options.reloadLocation;
  let onError = options.onError;
  
  let sessionExpiration= SPIRALCRAFT.webui.sessionExpiration;
  let timeoutRef;
  let timedOut = false;
  let sessionSyncCount=0;
  
  const checkSession= () =>
  {
    sessionSyncCount--;
    SPIRALCRAFT.ajax.get(
      SPIRALCRAFT.uri.addQueryTerm(syncLocation+"","oob","sessionSync"),
      function(data) {
        // console.log("Got "+data+" from server");
        sessionExpiration=parseInt(data);
        if (sessionExpiration>0) {
          if (sessionSyncCount==0) {
            setTimer();
            // console.log("Rechecking session in "+((sessionExpiration-60000)/1000)+" seconds");
          }
          else
          { console.log("Sync count !=0: "+sessionSyncCount);
          }
        } else {
          console.log("Session expired, reloading");
          timedOut=true;
          onTimeout();
          if (reloadOnTimeout)
          { window.location.reload(true);
          }
        }
      
      },
      function(status,responseText) {
        onError(status,responseText);
        if (sessionSyncCount==0) {
          if (status!=0)
          { setTimer();
          }
          else
          { setConnectFailedTimer();
          }
          // console.log("Rechecking session in "+((sessionExpiration-60000)/1000)+" seconds");
        }
        else
        { console.log("Sync count !=0: "+sessionSyncCount);
        }
      }
    );
  }

  const setTimer = () =>
  { 
    let delay = Math.min(pollInterval,Math.max(0,sessionExpiration-60000));
    if (delay==0)
    { delay=pollInterval;
    }
    // console.log("Checking in "+delay+" ms");
    timeoutRef=window.setTimeout(checkSession,delay);
    sessionSyncCount++;
  }
 
  const setConnectFailedTimer = () =>
  { 
    timeoutRef=window.setTimeout(checkSession,connectFailedPollInterval);
    sessionSyncCount++;
  }
  
  setTimer();
}