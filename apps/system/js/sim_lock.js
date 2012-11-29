/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var SimLock = {
  init: function sl_init() {
    // Do not do anything if we can't have access to MobileConnection API
    var conn = window.navigator.mozMobileConnection;
    if (!conn)
      return;

    this.onSuccess = this.onSuccess.bind(this);
    this.onCancel = this.onCancel.bind(this);

    // Watch for apps that need a mobile connection
    window.addEventListener('appwillopen', this);
  },

  handleEvent: function sl_handleEvent(evt) {
    switch (evt.type) {
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

    switch (conn.cardState) {
      case 'pukRequired':
      case 'pinRequired':
        SimPinDialog.show('unlock', this.onSuccess.bind(this), this.onCancel.bind(this));
        return true;
    }
    return false;
  },

  onSuccess: function sl_onSuccess() {
    // Display the app only when PIN code is valid
    if (this._lastOrigin)
      WindowManager.setDisplayedApp(this._lastOrigin);
    delete this._lastOrigin;
  },

  onCancel: function sl_onCancel() {
    delete this._lastOrigin;
  }
};

SimLock.init();
