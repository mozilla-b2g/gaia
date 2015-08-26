# Devices (Device Deck)

Device deck is a smart screen app that provides functionality of
1. displaying all connected devices and input ports
2. management of device connection
3. pinning device to `Home`

From HTML point-of-view, device-deck is divided in two sections:
* header (section#header)
* grid (section#grid)

There are some status icons and buttons placed in header such as bluetooth on/off indicator and 'refresh' button.
Within grid section, there are two div containers.
* div#connected-device-container
* div#newly-found-devices-list

As the names suggests, one is for connected devices and the other is for newly found devices. However this might soon to be changed subjected to UX spec.

Notice that device-deck has no real functionality in b2g-desktop because there is no workable bluetooth Web API in b2g-desktop. Currently we put it on nexus 5 to see if it works.

Before flashing gaia onto nexus 5, we need to set `layout.css.devPixelsPerPx` to make nexus 5 display in proper form-factor.To do that, just add this line in `build/config/tv/custom-prefs.js`:
```
user_pref('layout.css.devPixelsPerPx', '0.75');
```

## JSDOC

Generated jsdoc is hosted on [http://mozilla-b2g.github.io/gaia/device-deck/](http://mozilla-b2g.github.io/gaia/device-deck/). You can generate it locally with the following command:

```
$ gulp jsdoc:device-deck
```
