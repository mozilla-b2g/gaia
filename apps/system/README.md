# System

System app is the first webapp triggered by Gecko. It handles statusbar and utility tray management, SIM lock, update manager, homescreen launcher, webapp window management, and numerous responsibilities that not scoped by per `webapp`.

Please follow module architecture https://wiki.mozilla.org/Gaia/System/NewModule to develop a new module.


## JSDOC

Generated jsdoc is hosted on [http://mozilla-b2g.github.io/gaia/system/](http://mozilla-b2g.github.io/gaia/system/). You can generate it locally with the following command:

```
$ gulp jsdoc:system
```
