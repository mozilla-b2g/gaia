/* global module */
'use strict';

function FakeActivityCaller(client, origin) {
  this.client = client;
  this.origin = origin || ('app://' + FakeActivityCaller.DEFAULT_ORIGIN);
}

module.exports = FakeActivityCaller;

FakeActivityCaller.DEFAULT_ORIGIN = 'fakeactivity.gaiamobile.org';

FakeActivityCaller.prototype = {
  client: null,

  launch: function() {
    this.client.switchToFrame();
    this.client.apps.launch(this.origin);
    this.client.apps.switchToApp(this.origin);
  },

  close: function() {
    this.client.apps.close(this.origin);
  }
};
