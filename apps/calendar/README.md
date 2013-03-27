
# Calendar

## Running in Firefox

Would you like to develop the calendar app in Firefox instead of b2g  
desktop? Yes, you would.  

### Step 1: Authorize mozAnon/mozSystem XHR use

Now we need to authorize the host you will be running the calendar app  
from to be able to establish XHR connections. This is necessary  
in order to issue cross-origin requests and avoid reusing credentials  
from other connections.  

Copy/modify the following code to use whatever URL you are hosting the  
calendar app on. If you are running b2g-desktop in debug mode by doing  
`make DEBUG=1` then it will host on port 8080. If you did not explicitly  
specify a domain with `GAIA_DOMAIN=domain` to the make invocation, then  
your domain is gaiamobile.org and the app will be found at  
`calendar.gaiamobile.org:8080`. Make sure your `/etc/hosts` file  
is pointing to this domain at `127.0.0.1`!  

Bring up the error console in firefox by hitting `control-shift-J`.  
Paste the code into the "Code" box and click the "evaluate" button.  

    (function() {
      var host = 'http://calendar.gaiamobile.org:8080';
      var perm = Components.classes['@mozilla.org/permissionmanager;1']
          .createInstance(Components.interfaces.nsIPermissionManager);
      var ios = Components.classes['@mozilla.org/network/io-service;1']
          .getService(Components.interfaces.nsIIOService);
      var uri = ios.newURI(host, null, null);

      perm.add(uri, 'systemXHR', 1);
      return ' '.join('Successfully added systemXHR permissions for', host);
    })();

At the bottom of the Error Console list, you should see an entry  
that confirms the permissions were added.  

### Step 3: Run Gaia Calendar!

Start the b2g-desktop instance to serve the calendar app on port 8080.  

Browse to http://calendar.gaiamobile.org:8080/ (or whatever URL you  
used above).  
