
# Calendar

## Running in Firefox

Would you like to develop the calendar app in Firefox instead of b2g  
desktop? Yes, you would.  

### Step 1: Authorize mozAnon/mozSystem XHR use

We need to authorize the host you will be running the calendar app  
from to be able to establish XHR connections. This is necessary  
in order to issue cross-origin requests and avoid reusing credentials  
from other connections.  

Bring up the error console in firefox by hitting `CTRL-SHIFT-J`.  
Paste the code below into the "Code" box and click the "evaluate" button.  

    (function() {
      var host = 'http://calendar.gaiamobile.org:8080';
      var perm = Components.classes['@mozilla.org/permissionmanager;1']
          .createInstance(Components.interfaces.nsIPermissionManager);
      var ios = Components.classes['@mozilla.org/network/io-service;1']
          .getService(Components.interfaces.nsIIOService);
      var uri = ios.newURI(host, null, null);

      perm.add(uri, 'systemXHR', 1);
      return 'Successfully added systemXHR permissions for ' + host;
    })();

At the bottom of the Error Console list, you should see an entry  
that confirms the permissions were added.  

### Step 2: Run Gaia Calendar!

Start the b2g-desktop instance to serve the calendar app on port 8080  
with  

    cd /path/to/gaia
    DEBUG=1 make
    /path/to/nightly/firefox -jsconsole -profile profile/

Browse to http://calendar.gaiamobile.org:8080/.

### Next Steps

+ Running the unit tests: https://developer.mozilla.org/en-US/docs/Mozilla/Firefox_OS/Platform/Testing/Gaia_unit_tests
+ Helpful command line utilities: https://npmjs.org/package/b2g-scripts
