'use strict';

/*
 * A helper module for the testing 3rd-party IME app.
 */
var Base = require('./base');

function ImeTestApp(client) {
  Base.call(this, client, ImeTestApp.ORIGIN);
}

module.exports = ImeTestApp;

ImeTestApp.ORIGIN = 'app://imetestapp.gaiamobile.org';
ImeTestApp.MANIFEST_URL = 'app://imetestapp.gaiamobile.org/manifest.webapp';

ImeTestApp.Selectors = Object.freeze({
  sendKeyButton: '#sendKey',
  switchLayoutButton: '#switchLayout'
});

ImeTestApp.prototype = {
  __proto__: Base.prototype,

  get sendKeyButton() {
    return this.client.helper.waitForElement(
      ImeTestApp.Selectors.sendKeyButton);
  },

  get switchLayoutButton() {
    return this.client.helper.waitForElement(
      ImeTestApp.Selectors.switchLayoutButton);
  },

  switchTo: function() {
    var systemInputMgmt = this.client.loader.getAppClass(
      'system', 'input_management');
    var imeKeyboard;

    systemInputMgmt.waitForKeyboardFrameDisplayed();
    systemInputMgmt.switchToActiveKeyboardFrame();

    imeKeyboard = this.client.helper.waitForElement('#keyboard.ime-test-app');
    this.client.waitFor(() => {
      return imeKeyboard.displayed();
    });
  }
};
