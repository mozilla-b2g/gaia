Gaia Music
==========

Gaia Music app for Firefox OS

To install from Gaia:
- From the Gaia repo's root directory, run `make install-gaia APP=music`

NOTE: To install an experimental build that utilizes Service Workers for the backend API, use the `NGA_SERVICE_WORKERS=1` flag. You may also need to set `dom.serviceWorkers.enabled` to `true` under "Device Preferences" in WebIDE before running the app with Service Workers enabled.

To run in Firefox Nightly on desktop:
- Run `npm install`
- From this app's root directory, run `npm run serve` (automatically serves up this app from an HTTP server on `localhost` port `3030`)
- Check "Enable multi-process Firefox" in `about:preferences` > "General"
- Set `dom.webcomponents.enabled` to `true` in `about:config`
- Copy some music files into `./media` and update the DeviceStorage shim to reflect the names of the files you copied
  + https://github.com/mozilla-b2g/gaia/blob/master/dev_apps/music/js/shims/device-storage.js#L9
- Browse to `http://localhost:3030`

If you encounter any problems (e.g. HTTP 404 errors, crashes, etc.), try running Firefox Nightly with a fresh profile:
- [Use the Profile Manager to create and remove Firefox profiles](https://support.mozilla.org/en-US/kb/profile-manager-create-and-remove-firefox-profiles)

NOTE: You may occassionally need to clear your cache/history to flush out the Service Worker cache or go to `about:serviceworkers` and "Unregister" the Service Worker.
