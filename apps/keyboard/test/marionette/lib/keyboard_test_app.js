'use strict';

function KeyboardTests(client) {
  this.client = client;
}
module.exports = KeyboardTests;

KeyboardTests.ORIGIN = 'app://keyboardtestapp.gaiamobile.org';

KeyboardTests.Selector = Object.freeze({
  textInput: '#textInput',
  textInput2: '#textInput2',
  textInput3: '#textInput3',
  nonInputArea: '#nonInput',
  triggerPromptButton: '#triggerPromptButton',
  promptResult: '#promptResult'
});

KeyboardTests.prototype = {
  get textInput() {
    return this.client.findElement(KeyboardTests.Selector.textInput);
  },

  get textInput2() {
    return this.client.findElement(KeyboardTests.Selector.textInput2);
  },

  get textInput3() {
    return this.client.findElement(KeyboardTests.Selector.textInput3);
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

  launch: function() {
    var client = this.client;
    client.apps.launch(KeyboardTests.ORIGIN);
    client.apps.switchToApp(KeyboardTests.ORIGIN);
    client.helper.waitForElement('body');
  },

  triggerPromptModalDialog: function() {
    this.triggerPromptButton.tap();
  }
};
