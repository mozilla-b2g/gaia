/* global module */
'use strict';

function FakeAlarmApp(client, origin) {
  this.client = client;
  this.origin = origin || ('app://' + FakeAlarmApp.DEFAULT_ORIGIN);
}

module.exports = FakeAlarmApp;

FakeAlarmApp.DEFAULT_ORIGIN = 'fakealarmapp.gaiamobile.org';

FakeAlarmApp.Selector = Object.freeze({
  title : '#title'
});

FakeAlarmApp.prototype = {
  client: null,

  get title() {
    return this.client.findElement(FakeAlarmApp.Selector.title);
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
