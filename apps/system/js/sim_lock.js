/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var SimLock = {
  init: function sl_init() {
    // Do not do anything if we can't have access to MobileConnection API
    var conn = window.navigator.mozMobileConnection;
    if (!conn)
      return;

    // Watch for apps that need a mobile connection
    window.addEventListener('appopen', this);
  },
  handleEvent: function sl_handleEvent(evt) {
    switch (evt.type) {
      case 'appopen':
        // if an app needs telephony or sms permission,
        // we will launch the unlock screen if needed.

        var app = Applications.getByManifestURL(
          evt.target.getAttribute('mozapp'));

        if (!app || !app.manifest.permissions)
          return;

        // Ignore first time usage app which already ask for SIM code
        if (evt.target.classList.contains('ftu'))
          return;

        if (!('telephony' in app.manifest.permissions ||
              'sms' in app.manifest.permissions))
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
        SimPinDialog.show('unlock');
        break;
      case 'ready':
      default:
        break;
    }
  }
};

SimLock.init();
