/* global module */
'use strict';

function FakeLoopApp(client, origin) {
  this.client = client;
  this.origin = origin || ('app://' + FakeLoopApp.DEFAULT_ORIGIN);
}

module.exports = FakeLoopApp;

FakeLoopApp.DEFAULT_ORIGIN = 'fakeloopapp.gaiamobile.org';

FakeLoopApp.Selector = Object.freeze({
  title : 'h1'
});

FakeLoopApp.prototype = {
  client: null,

  get title() {
    return this.client.findElement(FakeLoopApp.Selector.title);
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
