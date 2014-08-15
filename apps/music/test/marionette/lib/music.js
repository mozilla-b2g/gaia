/* global require, module */
'use strict';

var assert = require('assert');
var Actions = require('marionette-client').Actions;

function Music(client, origin) {
  this.client = client;
  this.origin = origin || ('app://' + Music.DEFAULT_ORIGIN);
  this.actions = new Actions(client);
}

module.exports = Music;

Music.DEFAULT_ORIGIN = 'music.gaiamobile.org';

Music.Selector = Object.freeze({
  messageOverlay: '#overlay',
  firstTile: '.tile',
  songsTab: '#tabs-songs',
  firstSong: '.list-item',
  playButton: '#player-controls-play',
  progressBar: '#player-seek-bar-progress',
  shareButton: '#player-cover-share',
  shareMenu: 'form[data-z-index-level="action-menu"]',
  pickDoneButton: '#title-done',
  backButton: '#title-back',
  playerIcon: '#title-player'
});

Music.prototype = {
  client: null,

  get messageOverlay() {
    return this.client.findElement(Music.Selector.messageOverlay);
  },

  get firstTile() {
    return this.client.findElement(Music.Selector.firstTile);
  },

  get songsTab() {
    return this.client.helper.waitForElement(Music.Selector.songsTab);
  },

  get firstSong() {
    return this.client.helper.waitForElement(Music.Selector.firstSong);
  },

  get playButton() {
    return this.client.findElement(Music.Selector.playButton);
  },

  get shareButton() {
    return this.client.findElement(Music.Selector.shareButton);
  },

  // TODO(gareth): Move this shareMenu stuff into the helper.
  get shareMenu() {
    // Switch to the system app first.
    this.client.switchToFrame();
    return this.client.helper.waitForElement(Music.Selector.shareMenu);
  },

  get progressBar() {
    return this.client.findElement(Music.Selector.progressBar);
  },

  get pickDoneButton() {
    return this.client.findElement(Music.Selector.pickDoneButton);
  },

  get backButton() {
    return this.client.findElement(Music.Selector.backButton);
  },

  get playerIcon() {
    return this.client.findElement(Music.Selector.playerIcon);
  },

  get isPlaying() {
    return this.playButton.getAttribute('class').indexOf('is-pause') === -1;
  },

  get songProgress() {
    return parseFloat(this.progressBar.getAttribute('value'));
  },

  launch: function() {
    this.client.switchToFrame();
    this.client.apps.launch(this.origin);
    this.client.apps.switchToApp(this.origin);
    this.client.helper.waitForElement('body');
  },

  switchToMe: function(options) {
    options = options || {};

    this.client.switchToFrame();

    // Switch to music even when it is in background.
    // We cannot use switchToApp here, because it will wait
    // for the app to come to foreground.
    if (options.background) {
      var musicFrame = this.client.findElement('iframe[src*="' +
                                          this.origin + '"]');
      this.client.switchToFrame(musicFrame);
    } else {
      this.client.apps.switchToApp(this.origin);
    }
  },

  waitForFirstTile: function() {
    this.client.helper.waitForElement(this.firstTile);
  },

  waitForMessageOverlayShown: function(shouldBeShown) {
    this.client.waitFor(function() {
      var volumeShown = this.messageOverlay.displayed();
      return volumeShown === shouldBeShown;
    }.bind(this));
  },

  // Because bug 862156 so we couldn't get the correct displayed value for the
  // player icon, instead we use the display property to check the visibility
  // of the player icon.
  checkPlayerIconShown: function(shouldBeShown) {
    var display = this.playerIcon.cssProperty('display');
    var result = (display !== 'none');
    assert.equal(shouldBeShown, result);
  },

  switchToSongsView: function() {
    this.songsTab.click();
  },

  playFirstSong: function() {
    this.firstSong.click();
  },

  tapPlayButton: function() {
    this.actions.tap(this.playButton).perform();
  },

  tapBackButton: function() {
    this.actions.tap(this.backButton).perform();
  },

  shareWith: function(appName) {
    var shareButton = this.shareButton;
    this.client.waitFor(function() {
      return shareButton.displayed();
    });
    shareButton.tap();

    var list = this.shareMenu.findElements('button');
    for (var i = 0; i < list.length; i++) {
      if (list[i].text() === appName) {
        list[i].tap();
        return;
      }
    }
  },

  finishPick: function() {
    this.actions.tap(this.pickDoneButton).perform();
  }
};
