'use strict';

var Base = require('./base');


function KeyboardTests(client) {
  Base.call(this, client, KeyboardTests.ORIGIN, null);
}
module.exports = KeyboardTests;

KeyboardTests.ORIGIN = 'app://keyboardtestapp.gaiamobile.org';

KeyboardTests.Selector = Object.freeze({
  textInput:            '#textInput',
  textareaInput:        '#textareaInput',
  urlInput:             '#urlInput',
  emailInput:           '#emailInput',
  passwordInput:        '#passwordInput',
  searchInput:          '#searchInput',
  numberInput:          '#numberInput',
  telInput:             '#telInput',
  nonInputArea:         '#nonInput',
  triggerPromptButton:  '#triggerPromptButton',
  promptResult:         '#promptResult'
});

KeyboardTests.prototype = {
  __proto__: Base.prototype,

  get textInput() {
    return this.client.findElement(KeyboardTests.Selector.textInput);
  },

  get textareaInput() {
    return this.client.findElement(KeyboardTests.Selector.textareaInput);
  },

  get urlInput() {
    return this.client.findElement(KeyboardTests.Selector.urlInput);
  },

  get emailInput() {
    return this.client.findElement(KeyboardTests.Selector.emailInput);
  },

  get passwordInput() {
    return this.client.findElement(KeyboardTests.Selector.passwordInput);
  },

  get searchInput() {
    return this.client.findElement(KeyboardTests.Selector.searchInput);
  },

  get numberInput() {
    return this.client.findElement(KeyboardTests.Selector.numberInput);
  },

  get telInput() {
    return this.client.findElement(KeyboardTests.Selector.telInput);
  },

  get nonInputArea() {
    return this.client.findElement(KeyboardTests.Selector.nonInputArea);
  },

  get triggerPromptButton() {
    return this.client.findElement(KeyboardTests.Selector.triggerPromptButton);
  },

  get promptResult() {
    return this.client.findElement(KeyboardTests.Selector.promptResult);
  },

  triggerPromptModalDialog: function() {
    this.triggerPromptButton.tap();
  }
};
