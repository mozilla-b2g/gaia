'use strict';

/*
 * A helper module for the built-in keyboard app.
 */

var Marionette = require('marionette-client');

function Keyboard(client) {
  this.client = client.scope({ searchTimeout: 20000 });
  this.actions = new Marionette.Actions(client);
}

module.exports = Keyboard;

Keyboard.ORIGIN = 'app://keyboard.gaiamobile.org';
Keyboard.MANIFEST_URL = 'app://keyboard.gaiamobile.org/manifest.webapp';

// Selectors for the DOM in built-in keyboard app.
Keyboard.Selector = Object.freeze({
  returnKey: '.keyboard-type-container[data-active] ' +
    '.keyboard-key[data-l10n-id="returnKey2"]'
});

Keyboard.prototype = {
  // getters for DOM elements in keyboard app
  get returnKey() {
    return this.client.helper.waitForElement(Keyboard.Selector.returnKey);
  },

  tapReturnKey: function() {
    this.actions.tap(this.returnKey).perform();
  }
};
