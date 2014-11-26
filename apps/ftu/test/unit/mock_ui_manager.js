'use strict';

var MockUIManager = {
  domSelectors: [
    'container',
    'splash-screen',
    'activation-screen',
    'finish-screen',
    'update-screen',
    'main-title',
    'back-button',
    // Unlock SIM Screen
    'unlock-sim-screen',
    'unlock-sim-header',
    'unlock-sim-action',
    // PIN Screen
    'pincode-screen',
    'pin-label',
    'pin-retries-left',
    'pin-input',
    'back-sim-button',
    'pin-error',
    'skip-pin-button',
    'unlock-sim-button',
    // PUK Screen
    'pukcode-screen',
    'puk-label',
    'puk-retries-left',
    'puk-input',
    'puk-info',
    'puk-error',
    'newpin-input',
    'newpin-error',
    'confirm-newpin-input',
    'confirm-newpin-error',
    // XCK Screen
    'xckcode-screen',
    'xck-label',
    'xck-retries-left',
    'xck-input',
    'xck-error',
    // SIM info
    'sim-info-screen',
    'sim-info-back',
    'sim-info-forward',
    'sim-info-1',
    'sim-info-2',
    'sim-number-1',
    'sim-number-2',
    'sim-carrier-1',
    'sim-carrier-2',
    // Import contacts
    'sim-import',
    'sim-import-button',
    'no-sim',
    'sd-import-button',
    'no-memorycard',
    // Fxa Intro
    'fxa-create-account',
    'fxa-intro',
    'fxa-options',
    'fxa-no',
    // Wifi
    'networks',
    'wifi-refresh-button',
    'wifi-join-button',
    'join-hidden-button',
    'no-result-container',
    // Hidden Wifi
    'hidden-wifi-authentication',
    'hidden-wifi-ssid',
    'hidden-wifi-security',
    'hidden-wifi-password',
    'hidden-wifi-identity',
    'hidden-wifi-identity-box',
    'hidden-wifi-show-password',
    'hidden-wifi-join-button',
    //Date & Time
    'date-configuration',
    'time-configuration',
    'date-configuration-label',
    'time-configuration-label',
    'time-form',
    // 3G
    'enable-data',
    'disable-data',
    // Geolocation
    'enable-geolocation',
    'disable-geolocation',
    // Tutorial
    'lets-go-button',
    'update-lets-go-button',
    'skip-tutorial-button',
    'update-skip-tutorial-button',
    // Privacy Settings
    'share-performance',
    'offline-error-dialog',
    // Browser privacy newsletter subscription
    'newsletter-form',
    'newsletter-input',
    'newsletter-submit',
    'newsletter-success-screen',
    'offline-newsletter-error-dialog',
    'invalid-email-error-dialog'
  ],
  DARK_THEME: '#242d33',
  LIGHT_THEME: '#eeeeee',

  mSetup: function muim_mSuiteSetup() {
    this.domSelectors.forEach(function createElementRef(name) {
      if (name) {
        var element = document.getElementById(name);
        if (!element) {
            element = document.createElement('div');
            element.id = name;
        }
        this[toCamelCase(name)] = element;
      }
    }.bind(this));
  },

  mTeardown: function muim_mSuiteTeardown() {
    this.domSelectors.forEach(function destroyElementRef(name) {
      if (name) {
        this[toCamelCase(name)] = null;
      }
    }.bind(this));
  },

  timeZoneNeedsConfirmation: true,
  sendNewsletter: function(callback) {return callback(true);},
  updateDataConnectionStatus: function(status) {return DataMobile.getStatus();},
  displayOfflineDialog: function() {},
  hideActivationScreenFromScreenReader: function() {},
  init: function() {},
  initTZ: function() {},
  changeStatusBarColor: function(color) {}
};

function toCamelCase(str) {
  return str.replace(/\-(.)/g, function replacer(str, p1) {
    return p1.toUpperCase();
  });
}
