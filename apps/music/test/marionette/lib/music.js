/* global require, module */
'use strict';

var assert = require('assert');
var Actions = require('marionette-client').Actions;
var SongsTab = require('./views/songs_tab');

function Music(client) {
  this.client = client;
  this.actions = new Actions(client);
  this.songsTab = new SongsTab(client);
}

module.exports = Music;

Music.DEFAULT_ORIGIN = 'app://music.gaiamobile.org';

Music.Selector = Object.freeze({
  messageOverlay: '#overlay',
  firstTile: '.tile',
  albumsTab: '#tabs-albums',
  coverImage: '#player-cover-image',
  viewsList: '#views-list-anchor',
  viewsSublist: '#views-sublist-anchor',
  playButton: '#player-controls-play',
  progressBar: '#player-seek-bar-progress',
  shareButton: '#player-cover-share',
  shareMenu: 'form[data-z-index-level="action-menu"]',
  pickDoneButton: '#title-done',
  header: '#title',
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

  get albumsTab() {
    return this.client.helper.waitForElement(Music.Selector.albumsTab);
  },

  get songs() {
    this.waitForSublist();
    return this.client.findElement(Music.Selector.viewsSublist)
                      .findElements('li.list-item');
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

  get header() {
    return this.client.findElement(Music.Selector.header);
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

  launch: function(options) {
    options = options || { waitForFirstTile: true };
    this.client.switchToFrame();
    this.client.apps.launch(Music.DEFAULT_ORIGIN);
    this.client.apps.switchToApp(Music.DEFAULT_ORIGIN);
    this.client.helper.waitForElement('body');
    if (options.waitForFirstTile) {
      // Wait for the first song loaded.
      this.waitForFirstTile();
    }
  },

  switchToMe: function(options) {
    options = options || {};

    this.client.switchToFrame();
    if (options.background != null && !options.background) {
      this.client.apps.launch(Music.DEFAULT_ORIGIN);
    }
    // We cannot use switchToApp here, because it will wait
    // for the app to come to foreground.
    var musicFrame =
      this.client.findElement('iframe[src*="' + Music.DEFAULT_ORIGIN + '"]');
    this.client.switchToFrame(musicFrame);
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

  waitForSublist: function() {
    this.client.waitFor(function() {
      return this.client.findElement(Music.Selector.viewsSublist).displayed();
    }.bind(this));
  },

  // In sublist view.
  // XXX allow in list view too.
  waitForSongs: function(callback) {
    this.client.waitFor(function() {
      var songs = this.songs;
      return callback(songs);
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
    this.client.findElement('#tabs-songs').tap();
  },

  switchToAlbumsView: function() {
    this.albumsTab.tap();
  },

  selectAlbum: function(name) {
    var list = this.client.helper.waitForElement(Music.Selector.viewsList);
    assert.ok(list);

    var list_items = list.findElements('li.list-item', 'css selector');
    assert.ok(list_items);

    list_items.filter(function (element) {
      return element.findElement('span.list-main-title', 'css selector')
        .text() === name;
    })[0].tap();
  },

  tapPlayButton: function() {
    this.actions.tap(this.playButton).perform();
  },

  tapHeaderActionButton: function() {
    this.header.tap(25, 25);
  },

  shareWith: function(appName) {

    // Allow findElement to fail quickly.
    var quickly = this.client.scope({
      searchTimeout: 50
    });

    var shareMenu;
    // Wait until the share menu is displayed.
    // Try to click the cover image followed by the share button in the case
    // that it hides before we get a chance to click it.
    this.client.waitFor(function() {
      this.client.helper.waitForElement(Music.Selector.coverImage).click();
      this.shareButton.tap();

      this.client.switchToFrame();
      try {
        shareMenu = quickly.findElement(Music.Selector.shareMenu);
      } catch(e) {
        this.client.apps.switchToApp(Music.DEFAULT_ORIGIN);
        return false;
      }

      var isDisplayed = shareMenu.displayed();
      this.client.apps.switchToApp(Music.DEFAULT_ORIGIN);
      return isDisplayed;
    }.bind(this));

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
