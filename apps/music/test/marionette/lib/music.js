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
  albumsTab: '#tabs-albums',

  // search fields
  searchTiles: '#views-tiles-search',
  searchTilesField: '#views-tiles-search-input',
  searchList: '#views-list-search',
  searchListField: '#views-list-search-input',
  // search results
  searchArtists: '#views-search-artists',
  searchAlbums: '#views-search-albums',
  searchTitles: '#views-search-titles',

  viewsList: '#views-list-anchor',
  viewsSublist: '#views-sublist-anchor',
  firstSong: '.list-item',
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

  get songsTab() {
    return this.client.helper.waitForElement(Music.Selector.songsTab);
  },

  get albumsTab() {
    return this.client.helper.waitForElement(Music.Selector.albumsTab);
  },

  get firstSong() {
    return this.client.helper.waitForElement(Music.Selector.firstSong);
  },

  get songs() {
    this.waitForSublist();

    var list = this.client.findElement(Music.Selector.viewsSublist);
    assert.ok(list);

    var list_items = list.findElements('li.list-item', 'css selector');
    assert.ok(list_items);

    return list_items;
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

  searchTiles: function(searchTerm) {
    this.client.helper.waitForElement(Music.Selector.searchTiles);

    var input = this.client.helper.waitForElement(
      Music.Selector.searchTilesField);
    assert.ok(input);

    input.clear();
    this.client.waitFor(input.displayed.bind(input));
    input.sendKeys(searchTerm);
  },

  switchToSongsView: function() {
    this.songsTab.tap();
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

  playFirstSong: function() {
    this.firstSong.click();
  },

  tapPlayButton: function() {
    this.actions.tap(this.playButton).perform();
  },

  tapHeaderActionButton: function() {
    this.header.tap(25, 25);
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
