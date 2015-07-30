'use strict';

function ActivityCallerApp(client) {
  this.client = client;
}
module.exports = ActivityCallerApp;

ActivityCallerApp.ORIGIN = 'app://activitycaller.gaiamobile.org';

ActivityCallerApp.Selector = Object.freeze({
  header: 'h1',
  launchactivity: '#launchactivity',
  testchainactivity: '#testchainactivity',
  testdefaultactivity: '#testdefaultactivity',
  closeButton: '#close',
  inputElement: '#input',
  dateInputElement: '#dateinput'
});

ActivityCallerApp.prototype = {
  get header() {
    return this.client.findElement(ActivityCallerApp.Selector.header);
  },

  get launchactivity() {
    return this.client.findElement(ActivityCallerApp.Selector.launchactivity);
  },

  get testchainactivity() {
    return this.client.findElement(
      ActivityCallerApp.Selector.testchainactivity);
  },

  get testdefaultactivity() {
    return this.client.findElement(
      ActivityCallerApp.Selector.testdefaultactivity);
  },

  get closeButton() {
    return this.client.findElement(ActivityCallerApp.Selector.closeButton);
  },

  get inputElement() {
    return this.client.findElement(ActivityCallerApp.Selector.inputElement);
  },

  get dateInputElement() {
    return this.client.findElement(ActivityCallerApp.Selector.dateInputElement);
  },

  switchTo: function() {
    this.client.switchToFrame();
    this.client.apps.switchToApp(ActivityCallerApp.ORIGIN);
  },

  launch: function() {
    var client = this.client;
    client.apps.launch(ActivityCallerApp.ORIGIN);
    client.apps.switchToApp(ActivityCallerApp.ORIGIN);
    client.helper.waitForElement('body');
  },

  startActivity: function() {
    this.switchTo();
    this.launchactivity.tap();
    this.client.switchToFrame();
  },

  startChainActivity: function() {
    this.switchTo();
    this.testchainactivity.tap();
    this.client.switchToFrame();
  },

  startDefaultActivity: function() {
    this.switchTo();
    this.testdefaultactivity.tap();
    this.client.switchToFrame();
  },

  close: function() {
    this.switchTo();
    this.closeButton.tap();
    this.client.switchToFrame();
  },

  focusTextInput: function() {
    this.switchTo();
    this.inputElement.tap();
    this.client.switchToFrame();
  },

  focusDateInput: function() {
    this.switchTo();
    this.dateInputElement.tap();
    this.client.switchToFrame();
  },

  blurFocusedInput: function() {
    this.switchTo();
    this.header.tap();
    this.client.switchToFrame();
  }
};
