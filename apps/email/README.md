## Back-End Code Location ##

The e-mail back-end is not developed in this repository.  All of the code in
GAIA/apps/email/js/ext/* and its sub-directories comes from:
https://github.com/mozilla-b2g/gaia-email-libs-and-more

If you want to make fixes to the code, then please issue pull requests against
that repository. This is particularly important since the e-mail back-end uses
staged loading of some roll-up files to get the best performance.

The e-mail back-end repo copies over a few files to this repository via that
repository's `make install-into-gaia` command. The files are as follows:

* **js/ext/alameda.js**: used for dynamic loading and module binding for back-end.
* **js/ext/end.js**: Kickstarts back-end loading. If it detects no accounts have
been set up, then it gives the UI a fake data object, then dynamically loads
the bulk of the back-end.
* **js/ext/mailapi/same-frame-setup.js**: the email back-end. It knows how to talk
to the local databases and then dynamically loads account type rollup files.
* **js/ext/mailapi/activesync/configurator.js**: Code for the activesync account
type.
* **js/ext/mailapi/composite/configurator.js**: Code for the "imap+smtp" account
type.
* **js/ext/mailapi/fake/configurator.js**: Code for the "fake" account type, used
for testing.


## Running in Firefox ##

Would you like to develop the e-mail app in Firefox instead of b2g desktop?
Yes, you would.

### Step 1: Turn on mozTCPSocket ###

In order to do IMAP stuff, you need to flip the big switch that enables the use
of TCP sockets.  This does not let all webpages open TCP sockets; they still
need the permission we authorize in step 2.

- Open "about:config" in the browser.
- Right-click anywhere in the config setting listing, and choose "New",
  "Boolean" from the context menu.
- Enter "dom.mozTCPSocket.enabled" in the "Enter the preference name" box and
  click the "OK" button.
- Select "true" on the next dialog box and click the "OK" button.

### Step 2: Authorize mozAnon/mozSystem XHR's and mozTCPSocket use ###

Now we need to authorize the host you will be running the e-mail app from to be
able to establish IMAP and ActiveSync connections.  IMAP connections depend on
the "tcp-socket" permission to establish TCP connections.  ActiveSync depends on
"systemXHR" in order to issue cross-origin requests and avoid reusing
credentials from other connections.

Copy/modify the following code to use whatever URL you are hosting the e-mail
app on.  If you are running b2g-desktop in debug mode by doing "make profile
DEBUG=1" then it will host on port 8080.  If you did not explicitly specify a
domain with GAIA_DOMAIN=domain to the make invocation, then your domain is
gaiamobile.org and the app will be found at "email.gaiamobile.org:8080".  Make
sure your /etc/hosts file is pointing this domain at 127.0.0.1!

Bring up the error console in firefox by hitting control-shift-J.  Paste the
code into the "Code" box and click the "evaluate" button.

```
host = 'http://email.gaiamobile.org:8080';
perm = Components.classes["@mozilla.org/permissionmanager;1"]
                 .createInstance(Components.interfaces.nsIPermissionManager);
ios = Components.classes["@mozilla.org/network/io-service;1"]
                .getService(Components.interfaces.nsIIOService);
uri = ios.newURI(host, null, null);
perm.add(uri, 'systemXHR', 1);
perm.add(uri, 'tcp-socket', 1);
'Successfully added systemXHR and tcp-socket permissions for '+host;
```

At the bottom of the Error Console list, you should see an entry that confirms
the permissions were added.

### Step 3: Run Gaia E-Mail! ###

Start the b2g-desktop instance to serve the e-mail app on port 8080.

Browse to http://email.gaiamobile.org:8080/ or whatever URL you used above.
