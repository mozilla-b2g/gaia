/* global module */
'use strict';

function FakeLoopApp(client, origin) {
  this.client = client;
  this.origin = origin || ('app://' + FakeLoopApp.DEFAULT_ORIGIN);
}

module.exports = FakeLoopApp;

FakeLoopApp.DEFAULT_ORIGIN = 'fakeloopapp.gaiamobile.org';

FakeLoopApp.Selector = Object.freeze({
  title: 'h1',
  toaster: '.attentionWindow.toaster-mode[toaster-transition-state="opened"]',
  mainWindow: '.attentionWindow.top-most.active'
});

FakeLoopApp.prototype = {
  client: null,

  get title() {
    return this.client.findElement(FakeLoopApp.Selector.title);
  },

  get toaster() {
    return this.client.helper.waitForElement(FakeLoopApp.Selector.toaster);
  },

  get mainWindow() {
    return this.client.helper.waitForElement(FakeLoopApp.Selector.mainWindow);
  },

  launch: function() {
    this.client.switchToFrame();
    this.client.apps.launch(this.origin);
    this.client.apps.switchToApp(this.origin);
  },

  waitForTitleShown: function(shouldBeShown) {
    this.client.waitFor(function() {
      var shown = this.title.displayed();
      return shown === shouldBeShown;
    }.bind(this));
  },

  close: function() {
    this.client.apps.close(this.origin);
  }
};
