/* global module */
'use strict';

function FakeNotificationApp(client, origin) {
  this.client = client;
  this.origin = origin || ('app://' + FakeNotificationApp.DEFAULT_ORIGIN);
}

module.exports = FakeNotificationApp;

FakeNotificationApp.DEFAULT_ORIGIN = 'fakenotificationapp.gaiamobile.org';

FakeNotificationApp.Selector = Object.freeze({
  title : '#title'
});

FakeNotificationApp.prototype = {
  client: null,

  get title() {
    return this.client.findElement(FakeNotificationApp.Selector.title);
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
