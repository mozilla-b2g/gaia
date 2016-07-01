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
  testactivitynoreturnvaluewpostresult: '#testactivitynoreturnvaluewpostresult',
  closeButton: '#close',
  inputElement: '#input',
  dateInputElement: '#dateinput',
  selectElement: '#select'
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

  get testactivitynoreturnvaluewpostresult() {
    return this.client.findElement(
      ActivityCallerApp.Selector.testactivitynoreturnvaluewpostresult);
  },


  get closeButton() {
    return this.client.findElement(ActivityCallerApp.Selector.closeButton);
  },

  get inputElement() {
    return this.client.findElement(ActivityCallerApp.Selector.inputElement);
  },

  get selectElement() {
    return this.client.findElement(ActivityCallerApp.Selector.selectElement);
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

  startActivityNoReturnValue: function() {
    this.switchTo();
    this.testactivitynoreturnvaluewpostresult.tap();
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

  focusSelect: function() {
    this.switchTo();
    this.selectElement.tap();
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
