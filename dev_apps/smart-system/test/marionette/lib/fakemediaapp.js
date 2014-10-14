/* global module */
'use strict';

function FakeMediaApp(client, origin) {
  this.client = client;
  this.origin = origin || ('app://' + FakeMediaApp.DEFAULT_ORIGIN);
}

module.exports = FakeMediaApp;

FakeMediaApp.DEFAULT_ORIGIN = 'fakemediaapp.gaiamobile.org';

FakeMediaApp.Selector = Object.freeze({
  title : '#title'
});

FakeMediaApp.prototype = {
  client: null,

  get title() {
    return this.client.findElement(FakeMediaApp.Selector.title);
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
