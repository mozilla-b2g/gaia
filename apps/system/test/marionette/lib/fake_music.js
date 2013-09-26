'use strict';

function FakeMusic(client, origin) {
  this.client = client;
  this.origin = origin;
}

module.exports = FakeMusic;

FakeMusic.Selector = Object.freeze({
  albumOneElement: '#album-one',

  playElement: '#play',
  pauseElement: '#pause',
  stopElement: '#stop',
  previousTrackElement: '#previous',
  nextTrackElement: '#next',

  pickMenu: 'form[data-z-index-level="action-menu"]'
});

FakeMusic.prototype = {
  client: null,

  get albumOneElement() {
    return this.client.findElement(FakeMusic.Selector.albumOneElement);
  },

  get playElement() {
    return this.client.findElement(FakeMusic.Selector.playElement);
  },

  get pauseElement() {
    return this.client.findElement(FakeMusic.Selector.pauseElement);
  },

  get stopElement() {
    return this.client.findElement(FakeMusic.Selector.stopElement);
  },

  get previousTrackElement() {
    return this.client.findElement(FakeMusic.Selector.previousTrackElement);
  },

  get nextTrackElement() {
    return this.client.findElement(FakeMusic.Selector.nextTrackElement);
  },

  get pickMenu() {
    // Switch to the system app first.
    this.client.switchToFrame();
    return this.client.helper.waitForElement(FakeMusic.Selector.pickMenu);
  },

  launchInBackground: function() {
    this.client.apps.launch(this.origin);
    this.client.apps.switchToApp(this.origin);

    // Wait until the app has told us it's fully loaded.
    var body = this.client.helper.waitForElement('body.loaded');

    this.client.switchToFrame();
  },

  launchAsActivity: function() {
    this.client.executeScript(function() {
      var activity = new MozActivity({
        name: 'pick',
        data: { type: 'audio/mpeg' }
      });
    });

    var list = this.pickMenu.findElements('button');
    for (var i = 0; i < list.length; i++) {
      var link = list[i];
      if (link.text() === 'Fake Music') {
        this.client.helper.wait(1000); // XXX: fix this!
        link.click();
        break;
      }
    }
  },

  close: function() {
    this.client.apps.close(this.origin);
  },

  pick: function() {
    this.client.findElement('#pick').click();
  },

  runInApp: function(callback) {
    this.client.apps.switchToApp(this.origin);
    callback();
    this.client.switchToFrame();
  }
};
