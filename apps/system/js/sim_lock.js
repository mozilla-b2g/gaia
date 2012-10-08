/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var SimLock = {
  init: function sl_init() {
    // Listen to the first appwillopen event, where homescreen launches
    window.addEventListener('appwillopen', this);

    // Listen to appopen event
    window.addEventListener('appopen', this);

    var conn = window.navigator.mozMobileConnection;
    if (!conn)
      return;
    conn.addEventListener('cardstatechange', this);
  },
  handleEvent: function sl_handleEvent(evt) {
    switch (evt.type) {
      case 'cardstatechange':
        this.showIfLocked();

        break;

      case 'appwillopen':
        window.removeEventListener('appwillopen', this);
        this.showIfLocked();

        break;

      case 'appopen':
        // if an app needs telephony or sms permission,
        // we will launch the unlock screen if needed.

        var app = Applications.getByManifestURL(
          evt.target.getAttribute('mozapp'));

        if (!app || !app.manifest.permissions)
          return;

        var keys = Object.keys(app.manifest.permissions);
        var permissions = keys.map(function map_perm(key) {
          return app.manifest.permissions[key];
        });

        if (permissions.indexOf('telephony') === -1 &&
          permissions.indexOf('sms') === -1)
          return;

        this.showIfLocked();
        break;
    }
  },
  showIfLocked: function sl_showIfLocked() {
    var conn = window.navigator.mozMobileConnection;
    if (!conn)
      return;

    switch (conn.cardState) {
      case 'pukRequired':
      case 'pinRequired':
        var activity = new MozActivity({
          name: 'configure',
          data: {
            target: 'simpin-unlock'
          }
        });
        activity.onsuccess = function sl_unlockSuccess() {
          // Go back to the current displayed app
          WindowManager.setDisplayedApp(WindowManager.getDisplayedApp());
        };
        break;
      case 'ready':
      default:
        break;
    }
  }
};

SimLock.init();
