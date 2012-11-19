Two APN (Access Point Name) databases are used:

* the Android database is the *de facto* standard we rely on;
* the Gnome database is probably less up-to-date but has a bit more information.

These files are only used to test and merge these APN databases.

The `/shared/resources/apn.json/` file is a JSON version of the Android database, with a few additional informations from the Gnome APN database (e.g.  voicemail number).

If this file is found, it will be used as is by the `index.html` file; if not present, the `index.html` file will generate a new one.

