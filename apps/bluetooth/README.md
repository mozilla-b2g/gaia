# Bluetooth
Bluetooth app is responsible for:

1. Pairing process for those remote(unpaired) Bluetooth devices. And will pop out attention dialog to interact with user via window.open.
2. Discover Bluetooth devices for user picked in current area. Then, send file(s) to the paired device. If the picked device is unpaired, send file(s) after inline-pairing successfully.


## JSDOC

Generated jsdoc is hosted on [http://mozilla-b2g.github.io/gaia/bluetooth/](http://mozilla-b2g.github.io/gaia/bluetooth/). You can generate it locally with the following command:

```
$ gulp jsdoc:bluetooth
```


## WARNING

Any change under `js/modules` should be synced with Settings Bluetooth module (`apps/settings/js/modules/bluetooth`).
