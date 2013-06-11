/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var SimLock = {
  //XXX: A hack to remember ftu state.
  _ftuEnabled: null,
  _duringCall: false,

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
    conn.addEventListener('cardstatechange', this._bypassFTU.bind(this));

    window.addEventListener('skipftu', function() {
      this._ftuEnabled = false;
    }.bind(this));

    // Listen to callscreenwillopen and callscreenwillclose event
    // to discard the cardstatechange event.
    window.addEventListener('callscreenwillopen', this);
    window.addEventListener('callscreenwillclose', this);
  },

  handleEvent: function sl_handleEvent(evt) {
    switch (evt.type) {
      case 'callscreenwillopen':
        this._duringCall = true;
        break;
      case 'callscreenwillclose':
        this._duringCall = false;
        break;
      case 'unlock':
        // Check whether the lock screen was unlocked from the camera or not.
        // If the former is true, the SIM PIN dialog should not displayed after
        // unlock, because the camera will be opened (Bug 849718)
        if (evt.detail && evt.detail.areaCamera)
          return;

        this._bypassFTU();
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

        // If the Settings app will open, don't prompt for SIM PIN entry
        // although it has 'telephony' permission (Bug 861206)
        var settingsManifestURL =
          'app://settings.gaiamobile.org/manifest.webapp';
        if (app.manifestURL == settingsManifestURL)
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

  // XXX: This is a hack.
  // Because FTU tries to disable lockscreen,
  // and lockscreen fires 'unlock' event immediately.
  // after the setting value is change and
  // the device is rebooting.
  _bypassFTU: function sl__bypassFTU() {
    if (this._ftuEnabled === false) {
      this.showIfLocked();
    }

    // Furthermore checking ftu.enabled state.

    var showFunc = this.showIfLocked.bind(this);

    window.asyncStorage.getItem('ftu.enabled',
      function getItem(launchFTU) {
        if (launchFTU === false) {
          showFunc();
        }
      });
  },

  showIfLocked: function sl_showIfLocked() {
    var conn = window.navigator.mozMobileConnection;
    if (!conn)
      return false;

    if (LockScreen.locked)
      return false;

    if (this._duringCall)
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
