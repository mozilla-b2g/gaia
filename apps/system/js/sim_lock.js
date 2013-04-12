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

        // Ignore first time usage (FTU) app which already asks for the PIN code
        // XXX: We should have a better way to detect this app is FTU or not.
        if (evt.target.dataset.frameOrigin == FtuLauncher.getFtuOrigin())
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

    // FTU has its specific SIM PIN UI
    if (FtuLauncher.isFtuRunning())
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
        // XXXX: After unlocking the SIM the cardState is
        //       'networkLocked' but it changes inmediately to 'ready'
        //       if the phone is not SIM-locked. If the cardState
        //       is still 'networkLocked' after 20 seconds we unlock
        //       the network control key lock (network personalization).
        setTimeout(function checkState() {
          if (conn.cardState == 'networkLocked' ||
              conn.cardState === 'serviceProviderLocked' ||
              conn.cardState === 'corporateLocked') {
            SimPinDialog.show('unlock', SimLock.onClose);
          }
        }, 20000);
        break;
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
