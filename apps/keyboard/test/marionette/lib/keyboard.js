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

Keyboard.ORIGIN =  'app://keyboard.gaiamobile.org';
Keyboard.MANIFEST_URL =  'app://keyboard.gaiamobile.org/manifest.webapp';

// Selectors for the DOM in built-in keyboard app.
Keyboard.Selector = Object.freeze({
  currentPanel: '.keyboard-type-container[data-active]',
  imeSwitchingKey: '.keyboard-type-container[data-active] ' +
    '.keyboard-key[data-keycode="-3"]',
  returnKey: '.keyboard-type-container[data-active] ' +
    '.keyboard-key[data-l10n-id="returnKey2"]',
  dismissSuggestionsButton: '.keyboard-type-container[data-active] ' +
    '.dismiss-suggestions-button'
});

Keyboard.prototype = {
  // getters for DOM elements in keyboard app
  get imeSwitchingKey() {
    return this.client.findElement(Keyboard.Selector.imeSwitchingKey);
  },
  get returnKey() {
    return this.client.findElement(Keyboard.Selector.returnKey);
  },
  get dismissSuggestionsButton() {
    return this.client.findElement(Keyboard.Selector.dismissSuggestionsButton);
  },

  get currentPanel() {
    return this.client.findElement(Keyboard.Selector.currentPanel);
  }
};
