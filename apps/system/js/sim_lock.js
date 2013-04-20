/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var SimLock = {
  init: function sl_init() {
    // Do not do anything if we can't have access to MobileConnection API
    var conn = window.navigator.mozMobileConnection;
    if (!conn)
      return;

    this.onClose = this.onClose.bind(this);

    // Watch for apps that need a mobile connection
    window.addEventListener('appwillopen', this);

    // Display the dialog only after lockscreen is unlocked
    // To prevent keyboard being displayed behind it.
    window.addEventListener('unlock', this);

    // always monitor card state change
    conn.addEventListener('cardstatechange', this.showIfLocked.bind(this));
  },

  handleEvent: function sl_handleEvent(evt) {
    switch (evt.type) {
      case 'unlock':
        // Check whether the lock screen was unlocked from the camera or not.
        // If the former is true, the SIM PIN dialog should not displayed after
        // unlock, because the camera will be opened (Bug 849718)
        if (evt.detail && evt.detail.areaCamera)
          return;

        this.showIfLocked();
        break;
      case 'appwillopen':
        // If an app needs 'telephony' or 'sms' permissions (i.e. mobile
        // connection) and the SIM card is locked, the SIM PIN unlock screen
        // should be launched

        var app = Applications.getByManifestURL(
          evt.target.getAttribute('mozapp'));

        if (!app || !app.manifest.permissions)
          return;

        // Ignore first time usage app which already ask for SIM code
        if (evt.target.classList.contains('ftu'))
          return;

        // Ignore apps that don't require a mobile connection
        if (!('telephony' in app.manifest.permissions ||
              'sms' in app.manifest.permissions))
          return;

        // Ignore second 'appwillopen' event when showIfLocked eventually opens
        // the app on valid PIN code
        var origin = evt.target.dataset.frameOrigin;
        if (origin == this._lastOrigin) {
          delete this._lastOrigin;
          return;
        }
        this._lastOrigin = origin;

        // If SIM is locked, cancel app opening in order to display
        // it after the SIM PIN dialog is shown
        if (this.showIfLocked())
          evt.preventDefault();

        break;
    }
  },

  showIfLocked: function sl_showIfLocked() {
    var conn = window.navigator.mozMobileConnection;
    if (!conn)
      return false;

    if (LockScreen.locked)
      return false;

    switch (conn.cardState) {
      // do nothing in either absent, unknown or null card states
      case null:
      case 'absent':
      case 'unknown':
        break;
      case 'pukRequired':
      case 'pinRequired':
        SimPinDialog.show('unlock', this.onClose);
        return true;
      case 'networkLocked':
      case 'corporateLocked':
      case 'serviceProviderLocked':
        SimPinDialog.show('unlock', SimLock.onClose);
        return true;
    }
    return false;
  },

  onClose: function sl_onClose(reason) {
    // Display the app only when PIN code is valid and when we click
    // on `X` button
    if (this._lastOrigin && (reason == 'success' || reason == 'skip'))
      WindowManager.setDisplayedApp(this._lastOrigin);
    delete this._lastOrigin;
  }

};

SimLock.init();
