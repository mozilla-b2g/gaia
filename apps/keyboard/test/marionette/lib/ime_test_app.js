'use strict';

/*
 * A helper module for the testing 3rd-party IME app.
 */
function ImeTestApp(client) {
  this.client = client.scope({ searchTimeout: 20000 });
}

module.exports = ImeTestApp;

ImeTestApp.ORIGIN = 'app://imetestapp.gaiamobile.org';
ImeTestApp.MANIFEST_URL = 'app://imetestapp.gaiamobile.org/manifest.webapp';

ImeTestApp.Selector = Object.freeze({
  sendKeyButton: '#sendKey'
});

ImeTestApp.prototype = {
  get sendKeyButton() {
    return this.client.helper.waitForElement(ImeTestApp.Selector.sendKeyButton);
  }
};
