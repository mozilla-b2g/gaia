/* global module */
'use strict';

function FakeGlobalOverlayApp(client, origin) {
  this.client = client;
  this.origin = origin || ('app://' + FakeGlobalOverlayApp.DEFAULT_ORIGIN);
}

module.exports = FakeGlobalOverlayApp;

FakeGlobalOverlayApp.DEFAULT_ORIGIN = 'fakeglobaloverlayapp.gaiamobile.org';

FakeGlobalOverlayApp.Selector = Object.freeze({
  title : 'h1'
});

FakeGlobalOverlayApp.prototype = {
  client: null,

  get title() {
    return this.client.findElement(FakeGlobalOverlayApp.Selector.title);
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
