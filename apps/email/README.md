## Front-End Notes ##

The email front end code dynamically loads each card implementation, and uses
HTML cached in a document cookie as part of startup. The cached HTML is just
for the first card the user will see when launching the app. By using the
cached HTML, it allows for a quick display to the user while the rest of the
UI and back-end (which runs in a web worker) starts up.

Once real data is available from the back-end, the cached HTML is removed and
the card with the real data is inserted.

This means the index.html file is fairly sparse. It just contains one script
tag to inject the cached HTML into the DOM, and that script triggers the load
of the main app JS after injecting the cached HTML.

The main app JS is built using the Makefile in the email directory. The email
app uses a module loader plugins to load templates: the 'tmpl!...' dependencies,
which in turn depend on 'text!...' dependencies. These loader plugins
participate in the build by leveraging special "pluginBuilder" modules,
tmpl_builder.js and text_builder.js respectively. Since those builder modules
support a few JS build environments, they contain extra code in them, but
they are not actually loaded during the runtime of application, just during the
build process.

Since it has its own custom build processes, the usual Gaia build processes
do not result in much extra optimization. The Gaia build process for the
localizations still occurs, and the full collection of JS strings for the
translations are inlined, but the HTML DOM is not pre-localized, as each card
HTML is stored in its own .html file that is loaded on demand when the card
is needed.

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

## Build Notes ##

The email app takes advantage of some features in the gaia build system to do
some optimizations:

* Apps can define an app-specific Makefile in their directory. This is run
before the rest of the general Gaia build steps. Email uses this to create
a directory in `gaia/build_stage/email` and runs some optimizations around
JS and CSS concatenation.
* The Gaia build system knows to use `gaia/build_stage/email` to do the rest of
the Gaia build steps because email specifies the "dir" in the `gaia_build.json`
in this directory.
* Since the shared resources referenced by email are not listed in the HTML,
but as CSS @imports or via JS module dependencies, the email Makefile
runs `email/build/make_gaia_shared.js` to generate a `gaia_shared.json` file
in the `gaia/build_stage/email` directory to list out the shared items use by
the email app. `gaia_shared.json` is used by the general Gaia build system to
know what shared resources to keep. The Gaia build system also does HTML file
scanning to find shared resources too.

For DEBUG=1 builds, the email source directory is used as-is, and the shared
resources are magically linked in via the Gaia build system.

When using GAIA_OPTIMIZE=1, which is set by `make production`, the email build
runs some uglify2 minification on the files. This can take a while, so if you
are doing multiple, rapid edit-device push cycles you should not use this.

If you want to give snapshots of builds, say for UX reviews, you should use
the contents of the `gaia/build_stage/email` directory as it will be a fully
functional snapshot.


