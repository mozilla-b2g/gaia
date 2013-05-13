Three APN (Access Point Name) databases are used:

* the Android database `/shared/resources/apn/apns_conf.xml` is the *de facto* standard we rely on;
* a local database `/shared/resources/apn/apns_conf-local.xml` with the same format we merge with the above, used for where Google is lacking. Ideally this file should be empty as everything should be put upstream;
* the Gnome database `/shared/resources/apn/service_providers.xml` is probably less up-to-date but has a bit more information.

A fourth file `/shared/resources/apn/operator-variant.xml` is also used.

These files are only used to test and merge these APN databases.

The `/shared/resources/apn.json` file is a JSON version of the Android database, with a few additional informations from the Gnome APN database (e.g.  voicemail number).

To regenerate the .json file, delete the apn.json first, then start a webserver from gaia/shared/resource folder. Like this:

  python -m SimpleHTTPServer 4104

Then load http://0.0.0.0:4104/apn
This should regenerate the .json file into the left part of the page, and you can cut & paste this to your editor.

TODO: make this automatic. Patches Welcome™
