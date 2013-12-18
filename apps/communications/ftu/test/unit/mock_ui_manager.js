'use strict';

var MockUIManager = {
  domSelectors: [
    'activation-screen',
    'progress-bar',
    'finish-screen',
    'nav-bar',
    'main-title',
    // Unlock SIM Screen
    'unlock-sim-screen',
    'unlock-sim-header',
    // PIN Screen
    'pincode-screen',
    'pin-label',
    'pin-retries-left',
    'pin-input',
    'pin-error',
    'back-sim-button',
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
    // Tutorial
    'tutorial-screen',
    'tutorial-progress',
    'lets-go-button',
    'skip-tutorial-button',
    // Navigation
    'back',
    'forward',
    'wifi-join-button'
  ],

  mSuiteSetup: function muim_mSuiteSetup() {
    this.domSelectors.forEach(function createElementRef(name) {
      if (name)
        this[toCamelCase(name)] = document.getElementById(name);
    }.bind(this));
  },

  mSuiteTeardown: function muim_mSuiteTeardown() {
    this.domSelectors.forEach(function destroyElementRef(name) {
      if (name)
        this[toCamelCase(name)] = null;
    }.bind(this));
  },

  sendNewsletter: function(callback) {return callback(true);},
  updateDataConnectionStatus: function(status) {return DataMobile.getStatus()},
  displayOfflineDialog: function() {}
};

function toCamelCase(str) {
  return str.replace(/\-(.)/g, function replacer(str, p1) {
    return p1.toUpperCase();
  });
}
