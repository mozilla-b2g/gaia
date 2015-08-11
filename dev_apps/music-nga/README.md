music-nga
=========

Experiments in re-building the FxOS Music app using NGA

To set up development environment, clone this repo then run:
- `npm install`
- `bower install`

You may also occassionally need to run `bower update` to fetch the latest dependencies.

To run on Firefox OS device:
- Ensure "USB Debugging" is set to "ADB+DevTools" in "Settings" > "Developer"
- Open "WebIDE" in Firefox desktop
- Select your device from the right-hand "Runtime" menu
- Select "Open App" from the left-hand menu and choose "Open Packaged App..."
- Browse to the root folder of this repo
- Press "Run" to push to the device

Note: Be sure to "Request Higher Permissions" under "Runtime Info" for your device and set `dom.serviceWorkers.enabled` to `true` under "Device Preferences" before running the app.

Running a local web server for development:
- Install [nws](https://www.npmjs.com/package/nws)
  + `npm install -g nws`
- From this repo's root directory, run `nws` (automatically serves up this app from HTTP port 3030)

To run on Firefox desktop (Developer Edition *RECOMMENDED*):
- Check "Enable multi-process Firefox" in `about:preferences` > "General"
- Set `dom.webcomponents.enabled` to `true` in `about:config`
- Copy some music files into `./media` and update the DeviceStorage shim to reflect the names of the files you copied
  + https://github.com/justindarc/music-nga/blob/master/js/shims/device-storage.js#L9
- Browse to `http://localhost:3030`

If you encounter any problems (e.g. HTTP 404 errors, crashes, etc.), try running Firefox with a fresh profile:
- [Use the Profile Manager to create and remove Firefox profiles](https://support.mozilla.org/en-US/kb/profile-manager-create-and-remove-firefox-profiles)
- Try Firefox Developer Edition instead of Nightly for improved stability between builds

Note: You may occassionally need to clear your history to flush out the cache or go to `about:serviceworkers` to "Unregister" the Service Worker.
