/* global require, module */
'use strict';

var assert = require('assert');

function Music(client, origin) {
  this.client = client;
  this.origin = origin || ('app://' + Music.DEFAULT_ORIGIN);
  this.actions = client.loader.getActions();
}

module.exports = Music;

Music.DEFAULT_ORIGIN = 'music.gaiamobile.org';

Music.Selector = Object.freeze({
  messageOverlay: '#overlay',
  firstTile: '.tile',
  playlistsTab: '#tabs-playlists',
  artistsTab: '#tabs-artists',
  songsTab: '#tabs-songs',
  albumsTab: '#tabs-albums',
  playerCover: '#player-cover',

  // search fields
  searchField: '#views-search-input',
  searchTiles: '#views-tiles-search',
  searchTilesField: '#views-tiles-search-input',
  searchList: '#views-list-search',
  searchListField: '#views-list-search-input',
  // search results
  searchArtists: '#views-search-artists',
  searchAlbums: '#views-search-albums',
  searchTitles: '#views-search-titles',
  searchNoResult: '#views-search-no-result',

  tilesView: '#views-tiles',
  listView: '#views-list',
  viewsList: '#views-list-anchor',
  sublistView: '#views-sublist',
  viewsSublist: '#views-sublist-anchor',
  firstListItem: '.list-item',
  firstSong: '.list-item',
  firstSongSublist: '#views-sublist .list-item',
  playerView: '#views-player',
  playButton: '#player-controls-play',
  progressBar: '#player-seek-bar-progress',
  shareButton: '#player-cover-share',
  ratingBar: '#player-album-rating',
  ratingStarsOn: 'button.star-on',
  shareMenu: 'form[data-z-index-level="action-menu"]',
  pickDoneButton: '#title-done',
  header: '#title',
  titleText: '#title-text',
  sublistShuffleButton: '#views-sublist-controls-shuffle',
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

  get playlistsTab() {
    return this.client.helper.waitForElement(Music.Selector.playlistsTab);
  },

  get artistsTab() {
    return this.client.helper.waitForElement(Music.Selector.artistsTab);
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

  get firstSongSublist() {
    return this.client.helper.waitForElement(Music.Selector.firstSongSublist);
  },

  // Helper for the getter.
  _getListItems: function(selector) {
    this.waitForAList(selector);

    var list = this.client.findElement(selector);
    assert.ok(list, 'Couldn\'t find element ' + selector);

    var list_items = list.findElements('li.list-item', 'css selector');
    assert.ok(list_items, 'Coudln\'t find list-items for ' + selector);

    return list_items;
  },

  get firstListItem() {
    return this.client.helper.waitForElement(Music.Selector.firstListItem);
  },

  get listItems() {
    return this._getListItems(Music.Selector.viewsList);
  },

  get songs() {
    return this._getListItems(Music.Selector.viewsSublist);
  },

  get playButton() {
    return this.client.findElement(Music.Selector.playButton);
  },

  get shareButton() {
    return this.client.findElement(Music.Selector.shareButton);
  },

  get title() {
    var header = this.client.findElement(Music.Selector.header);
    return header.findElement(Music.Selector.titleText);
  },

  get sublistShuffleButton() {
    return this.client.helper.waitForElement(
      Music.Selector.sublistShuffleButton);
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

  close: function() {
    this.client.apps.close(this.origin);
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

  waitForListEnumerate: function() {
    this.client.waitFor(function() {
      return this.client.executeScript(function() {
        return window.wrappedJSObject.ListView.handle.state === 'complete';
      });
    }.bind(this));
  },

  waitFinishedScanning: function() {
    this.client.waitFor(function() {
      return this.client.executeScript(function() {
        return window.wrappedJSObject.Database.initialScanComplete === true;
      });
    }.bind(this));
  },

  waitForFirstTile: function() {
    this.client.helper.waitForElement(Music.Selector.firstTile);
  },

  waitForMessageOverlayShown: function(shouldBeShown) {
    this.client.waitFor(function() {
      var volumeShown = this.messageOverlay.displayed();
      return volumeShown === shouldBeShown;
    }.bind(this));
  },

  waitForAList: function(selector) {
    this.client.waitFor(function() {
      return this.client.findElement(selector).displayed();
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

  waitForListView: function() {
    this.client.helper.waitForElement(Music.Selector.listView);
  },

  waitForSubListView: function() {
    this.client.helper.waitForElement(Music.Selector.sublistView);
  },

  waitForPlayerView: function() {
    this.client.helper.waitForElement(Music.Selector.playerView);
  },

  // Because bug 862156 so we couldn't get the correct displayed value for the
  // player icon, instead we use the display property to check the visibility
  // of the player icon.
  checkPlayerIconShown: function(shouldBeShown) {
    var display = this.playerIcon.cssProperty('display');
    var result = (display !== 'none');
    assert.equal(shouldBeShown, result);
  },

  showSearchInput: function(viewSelector) {
    var tilesView = this.client.findElement(viewSelector);
    var chain = this.actions.press(tilesView, 10, 10).perform();
    chain.moveByOffset(0, 110).perform();
    chain.release().perform();
  },

  searchArtists: function(searchTerm) {
    this.search(Music.Selector.searchList, searchTerm);
  },

  searchTiles: function(searchTerm) {
    this.search(Music.Selector.searchTiles, searchTerm);
  },

  search: function(viewSelector, searchTerm) {
    this.client.findElement(viewSelector).tap();

    var input = this.client.helper.waitForElement(Music.Selector.searchField);
    assert.ok(input);

    input.clear();
    this.client.waitFor(input.displayed.bind(input));
    input.sendKeys(searchTerm);
  },

  switchToArtistsView: function() {
    this.artistsTab.tap();
  },

  switchToSongsView: function() {
    this.songsTab.tap();
  },

  switchToAlbumsView: function() {
    this.albumsTab.tap();
  },

  switchToPlaylistsView: function() {
    this.playlistsTab.tap();
  },

  selectAlbum: function(name) {
    var list_items = this.listItems;

    list_items.filter(function (element) {
      return element.findElement('.list-main-title', 'css selector')
        .text() === name;
    })[0].tap();
  },

  selectArtist: function(name) {
    var list_items = this.listItems;

    list_items.filter(function (element) {
      return element.findElement('.list-single-title', 'css selector')
        .text() === name;
    })[0].tap();
  },

  selectPlaylist: function(name) {
    var list_items = this.listItems;

    list_items.filter(function (element) {
      return element.findElement('.list-playlist-title', 'css selector')
        .text() === name;
    })[0].tap();
  },

  // only from a list (song list)
  playFirstSong: function() {
    this.firstSong.click();
  },

  // only from a sublist (artist, albums, playlists)
  playFirstSongSublist: function() {
    this.firstSongSublist.click();
  },

  tapPlayButton: function() {
    this.actions.tap(this.playButton).perform();
  },

  tapHeaderActionButton: function() {
    this.header.tap(25, 25);
  },

  showSongInfo: function() {
    this.client.helper.waitForElement(Music.Selector.playerCover).click();
  },

  tapRating: function(rating) {
    this.showSongInfo();
    this.client.helper.waitForElement('button.rating-star[data-rating="' +
                                      rating + '"]').tap();
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
      this.showSongInfo();
      this.shareButton.tap();

      this.client.switchToFrame();
      try {
        shareMenu = quickly.findElement(Music.Selector.shareMenu);
      } catch(e) {
        this.client.apps.switchToApp(this.origin);
        return false;
      }

      var isDisplayed = shareMenu.displayed();
      this.client.apps.switchToApp(this.origin);
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
