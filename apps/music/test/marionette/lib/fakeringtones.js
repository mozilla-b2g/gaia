/* global module */
'use strict';

function FakeRingtones(client, origin) {
  this.client = client;
  this.origin = origin || ('app://' + FakeRingtones.DEFAULT_ORIGIN);
}

module.exports = FakeRingtones;

FakeRingtones.DEFAULT_ORIGIN = 'fakeringtones.gaiamobile.org';

FakeRingtones.prototype = {
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
