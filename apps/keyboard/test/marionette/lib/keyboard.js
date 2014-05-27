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
  imeSwitchingKey: '.keyboard-type-container[data-active] ' +
    '.keyboard-key[data-keycode="-3"]'
});

Keyboard.prototype = {
  // getters for DOM elements in keyboard app
  get imeSwitchingKey() {
    return this.client.findElement(Keyboard.Selector.imeSwitchingKey);
  }
};
