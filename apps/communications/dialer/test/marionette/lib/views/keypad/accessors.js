'use strict';
/* global module */
var SELECTORS = Object.freeze({
  keypadCallBarAddContact: '#keypad-callbar-add-contact',
});

function KeypadAccessor(client) {
  this.client = client;
}

KeypadAccessor.prototype = {
  get addContactButton() {
    return this.client.helper.waitForElement(SELECTORS.keypadCallBarAddContact);
  },

  key: function(keyNumber) {
    return this.client.helper.waitForElement(
      this.getKeypadKeySelector(keyNumber)
    );
  },

  getKeypadKeySelector: function(key) {
    return '.keypad-key[data-value="' + key +'"]';
  }
};

module.exports = KeypadAccessor;
