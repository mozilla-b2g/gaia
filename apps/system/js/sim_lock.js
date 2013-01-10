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

        // Ignore second `appwillopen` event when showIfLocked ends up
        // eventually opening the app on valid pin code
        var origin = evt.target.dataset.frameOrigin;
        if (origin == this._lastOrigin) {
          delete this._lastOrigin;
          return;
        }
        this._lastOrigin = origin;

        // if sim is locked, cancel app opening in order to display
        // it after PIN dialog
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
      // do nothing in absent and null card states
      case null:
      case 'absent':
        break;
      case 'pukRequired':
      case 'pinRequired':
        SimPinDialog.show('unlock', this.onClose);
        return true;
      case 'networkLocked':
        // XXXX: After unlocking the SIM the cardState is
        //       'networkLocked' but it changes inmediately to 'ready'
        //       if the phone is not SIM-locked. If the cardState
        //       is still 'networkLocked' after two seconds we unlock
        //       the network control key lock (network personalization).
        setTimeout(function checkState() {
          if (conn.cardState == 'networkLocked') {
            SimPinDialog.show('unlock', SimLock.onClose);
          }
        }, 5000);
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
