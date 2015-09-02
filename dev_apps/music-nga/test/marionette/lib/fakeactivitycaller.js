/* global module */
'use strict';

function FakeActivityCaller(client, origin) {
  this.client = client;
  this.origin = origin || ('app://' + FakeActivityCaller.DEFAULT_ORIGIN);
}

module.exports = FakeActivityCaller;

FakeActivityCaller.DEFAULT_ORIGIN = 'fakeactivity.gaiamobile.org';

FakeActivityCaller.Selector = Object.freeze({
  openButton: '#open',
  pickButton: '#pick',

  actionMenu: 'form[data-z-index-level="action-menu"]'
});

FakeActivityCaller.prototype = {
  client: null,

  get openButton() {
    return this.client.helper.waitForElement(
      FakeActivityCaller.Selector.openButton);
  },

  get pickButton() {
    return this.client.helper.waitForElement(
      FakeActivityCaller.Selector.pickButton);
  },

  get actionMenu() {
    return this.client.helper.waitForElement(
      FakeActivityCaller.Selector.actionMenu);
  },

  launch: function() {
    this.client.switchToFrame();
    this.client.apps.launch(this.origin);
    this.client.apps.switchToApp(this.origin);
  },

  close: function() {
    this.client.apps.close(this.origin);
  },

  tapOpenButton: function() {
    this.openButton.tap();
  },

  tapPickButton: function() {
    this.pickButton.tap();
  },

  selectMusicApp: function() {
    this.client.switchToFrame();

    var list = this.actionMenu.findElements('button');
    for (var i = 0; i < list.length; i++) {
      if (list[i].text() === 'Music NGA') {
        this.client.helper.waitForElement(list[i]);
        list[i].tap();
        return;
      }
    }
  }
};
