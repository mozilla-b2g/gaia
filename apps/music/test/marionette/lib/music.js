/* global require, module */
'use strict';

var Actions = require('marionette-client').Actions;

function Music(client, origin) {
  this.client = client;
  this.origin = origin;
  this.actions = new Actions(client);
}

module.exports = Music;

Music.Selector = Object.freeze({
  firstTile: '.tile',
  songsTab: '#tabs-songs',
  firstSong: '.list-item',
  playButton: '#player-controls-play'
});

Music.prototype = {
  client: null,

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

  get isPlaying() {
    return this.playButton.getAttribute('class').indexOf('is-pause') === -1;
  },

  launch: function() {
    this.client.switchToFrame();
    this.client.apps.launch(this.origin);
    this.client.apps.switchToApp(this.origin);
    this.client.helper.waitForElement('body');
  },

  switchToMe: function() {
    this.launch();
  },

  waitForFirstTile: function() {
    this.client.helper.waitForElement(this.firstTile);
  },

  swtichToSongsView: function() {
    this.songsTab.click();
  },

  playFirstSong: function() {
    this.firstSong.click();
  },

  tapPlayButton: function() {
    this.actions.tap(this.playButton).perform();
  }
};
