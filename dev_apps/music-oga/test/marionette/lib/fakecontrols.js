/* global module */
'use strict';

function FakeControls(client, origin) {
  this.client = client;
  this.origin = origin || ('app://' + FakeControls.DEFAULT_ORIGIN);
}

module.exports = FakeControls;

FakeControls.DEFAULT_ORIGIN = 'fakecontrols.gaiamobile.org';

FakeControls.Selector = Object.freeze({
  playPause: '#playpause'
});

FakeControls.prototype = {
  client: null,

  get playPauseElement() {
    return this.client.findElement(FakeControls.Selector.playPause);
  },

  launch: function() {
    this.client.switchToFrame();
    this.client.apps.launch(this.origin);
    this.client.apps.switchToApp(this.origin);
  },

  close: function() {
    this.client.apps.close(this.origin);
  },

  playPause: function() {
    this.playPauseElement.click();
  }
};
