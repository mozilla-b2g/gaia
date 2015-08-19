/* global module */
'use strict';

function FakeActivityCaller(client, origin) {
  this.client = client;
  this.origin = origin || ('app://' + FakeActivityCaller.DEFAULT_ORIGIN);
}

module.exports = FakeActivityCaller;

FakeActivityCaller.DEFAULT_ORIGIN = 'fakeactivity.gaiamobile.org';

FakeActivityCaller.Selector = Object.freeze({
  actionMenu: 'form[data-z-index-level="action-menu"]'
});

FakeActivityCaller.prototype = {
  client: null,

  get actionMenuElement() {
    return this.client.findElement(FakeActivityCaller.Selector.actionMenu);
  },

  launch: function() {
    this.client.switchToFrame();
    this.client.apps.launch(this.origin);
    this.client.apps.switchToApp(this.origin);

    this.client.switchToFrame();
    this.client.helper.waitForElement(FakeActivityCaller.Selector.actionMenu);
    this.selectMusicApp();
  },

  close: function() {
    this.client.apps.close(this.origin);
  },

  selectMusicApp: function() {
    var list = this.actionMenuElement.findElements('button');
    for (var i = 0; i < list.length; i++) {
      if (list[i].text() === 'Music') {
        list[i].tap();
        return;
      }
    }
  }
};
