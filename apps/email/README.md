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

### Step 1: Setup Gaia inside of Firefox

If you have not already done so, follow the steps below to setup Gaia in Firefox.

https://developer.mozilla.org/en-US/docs/Mozilla/Firefox_OS/Using_Gaia_in_Firefox 

### Step 2: Run Gaia E-Mail! ###

Start the Firefox instance to serve the e-mail app on port 8080.

    cd /path/to/gaia
    DEBUG=1 make
    /path/to/nightly/firefox -jsconsole -profile profile/

Browse to http://email.gaiamobile.org:8080/.
