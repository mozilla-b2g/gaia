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
    'fake-pin-input',
    'pin-error',
    'back-sim-button',
    'skip-pin-button',
    'unlock-sim-button',
    // PUK Screen
    'pukcode-screen',
    'puk-label',
    'puk-retries-left',
    'puk-input',
    'fake-puk-input',
    'puk-info',
    'puk-error',
    'newpin-input',
    'fake-newpin-input',
    'newpin-error',
    'confirm-newpin-input',
    'fake-confirm-newpin-input',
    'confirm-newpin-error',
    // XCK Screen
    'xckcode-screen',
    'xck-label',
    'xck-retries-left',
    'xck-input',
    'fake-xck-input',
    'xck-error',
    // Import contacts
    'sim-import-button',
    'no-sim',
    'sd-import-button',
    'no-memorycard'
  ],

  mSetup: function muim_mSetup() {
    this.domSelectors.forEach(function createElementRef(name) {
      if (name)
        this[toCamelCase(name)] = document.getElementById(name);
    }.bind(this));
  },

  mTeardown: function muim_mTeardown() {
    this.activationScreen = this.progressBar = this.navBar = null;
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
