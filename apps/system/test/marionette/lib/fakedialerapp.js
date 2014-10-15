/* global module */
'use strict';

function FakeDialerApp(client, origin) {
  this.client = client;
  this.origin = origin || ('app://' + FakeDialerApp.DEFAULT_ORIGIN);
}

module.exports = FakeDialerApp;

FakeDialerApp.DEFAULT_ORIGIN = 'fakedialerapp.gaiamobile.org';

FakeDialerApp.Selector = Object.freeze({
  title : 'h1'
});

FakeDialerApp.prototype = {
  client: null,

  get title() {
    return this.client.findElement(FakeDialerApp.Selector.title);
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
