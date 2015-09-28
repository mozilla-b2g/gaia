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
  viewFrame: '#view-stack iframe',
  secondaryViewFrame: '#view-stack iframe:nth-child(2)',
  activeViewFrame: '#view-stack iframe.active',
  homeViewFrame: 'iframe[src*="/views/home/index.html"]',
  songsViewFrame: 'iframe[src*="/views/songs/index.html"]',
  artistsViewFrame: 'iframe[src*="/views/artists/index.html"]',
  artistDetailViewFrame: 'iframe[src*="/views/artist-detail/index.html"]',
  albumsViewFrame: 'iframe[src*="/views/albums/index.html"]',
  albumDetailViewFrame: 'iframe[src*="/views/album-detail/index.html"]',
  playlistsViewFrame: 'iframe[src*="/views/playlists/index.html"]',
  playlistDetailViewFrame: 'iframe[src*="/views/playlist-detail/index.html"]',
  playerViewFrame: 'iframe[src*="/views/player/index.html"]',

  homeViewFrameActive:
    'iframe.active[src*="/views/home/index.html"]',
  songsViewFrameActive:
    'iframe.active[src*="/views/songs/index.html"]',
  artistsViewFrameActive:
    'iframe.active[src*="/views/artists/index.html"]',
  artistDetailViewFrameActive:
    'iframe.active[src*="/views/artist-detail/index.html"]',
  albumsViewFrameActive:
    'iframe.active[src*="/views/albums/index.html"]',
  albumDetailViewFrameActive:
    'iframe.active[src*="/views/album-detail/index.html"]',
  playlistsViewFrameActive:
    'iframe.active[src*="/views/playlists/index.html"]',
  playlistDetailViewFrameActive:
    'iframe.active[src*="/views/playlist-detail/index.html"]',
  playerViewFrameActive:
    'iframe.active[src*="/views/player/index.html"]',

  messageOverlay: '#empty-overlay',
  firstTile: '.tile',
  tabBar: '#tab-bar',
  playlistsTab: '#tab-bar button[value="playlists"]',
  artistsTab: '#tab-bar button[value="artists"]',
  albumsTab: '#tab-bar button[value="albums"]',
  songsTab: '#tab-bar button[value="songs"]',
  playerCover: '#artwork',

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
  firstSong: '#list a',
  playButton: '#player-controls-play',
  progressBar: '#player-seek-bar-progress',
  shareButton: 'button[data-action="share"]',
  shareMenu: 'form[data-z-index-level="action-menu"]',
  pickDoneButton: '#title-done',
  header: '#header',
  titleText: '#header-title',
  sublistShuffleButton: '#views-sublist-controls-shuffle',
  playerIcon: '#player-button'
});

Music.prototype = {
  client: null,

  // debug function.
  debugDocument: function() {
    var debug = this.client.executeScript(function() {
      return document.documentElement.innerHTML;
    });
    console.log('debug', debug);
  },

  get viewFrame() {
    return this.client.findElement(Music.Selector.viewFrame);
  },

  get secondaryViewFrame() {
    return this.client.findElement(Music.Selector.secondaryViewFrame);
  },

  get activeViewFrame() {
    return this.client.findElement(Music.Selector.activeViewFrame);
  },

  get homeViewFrame() {
    return this.client.findElement(Music.Selector.homeViewFrame);
  },

  get artistsViewFrame() {
    return this.client.findElement(Music.Selector.artistsViewFrame);
  },

  get artistDetailViewFrame() {
    return this.client.findElement(Music.Selector.artistDetailViewFrame);
  },

  get albumsViewFrame() {
    return this.client.findElement(Music.Selector.albumsViewFrame);
  },

  get albumDetailViewFrame() {
    return this.client.findElement(Music.Selector.albumDetailViewFrame);
  },

  get songsViewFrame() {
    return this.client.findElement(Music.Selector.songsViewFrame);
  },

  get playlistsViewFrame() {
    return this.client.findElement(Music.Selector.playlistsViewFrame);
  },

  get playlistDetailViewFrame() {
    return this.client.findElement(Music.Selector.playlistDetailViewFrame);
  },

  get playerViewFrame() {
    return this.client.findElement(Music.Selector.playerViewFrame);
  },

  get messageOverlay() {
    return this.client.findElement(Music.Selector.messageOverlay);
  },

  get firstTile() {
    var homeView = this.homeViewFrame;
    this.client.switchToFrame(homeView);
    var element = this.client.findElement(Music.Selector.firstTile);
    this.switchToMe();
    return element;
  },

  get playlistsTab() {
    return this.client.helper.waitForElement(Music.Selector.playlistsTab);
  },

  get artistsTab() {
    return this.client.helper.waitForElement(Music.Selector.artistsTab);
  },

  get albumsTab() {
    return this.client.helper.waitForElement(Music.Selector.albumsTab);
  },

  get songsTab() {
    return this.client.helper.waitForElement(Music.Selector.songsTab);
  },

  // get the first song from the active frame.
  get firstSong() {
    return this.client.helper.waitForElement(Music.Selector.firstSong);
  },

  getStarRating: function() {
    var frame = this.playerViewFrame;
    assert.ok(frame);

    this.client.switchToFrame(frame);

    this.client.switchToShadowRoot(
      this.client.findElement(Music.Selector.playerCover));
    var ratingEl = this.client.findElement('#rating');
    this.client.switchToShadowRoot(ratingEl);
    var container = this.client.findElement('#container');
    var value = container.getAttribute('data-value');
    this.client.switchToShadowRoot();
    this.client.switchToShadowRoot();

    this.switchToMe();

    return value ? parseInt(value, 10) : 0;
  },

  // Helper for the getter.
  _getListItemsData: function(frame) {
    assert.ok(frame, 'Frame must be valid.' + frame);

    this.client.switchToFrame(frame);

    var listItems = this.client.executeScript(function () {
      var list = document.getElementById('list');
      var elementsData = [];
      var elements = list.querySelectorAll('a');
      for(var i = 0; i < elements.length; i++) {
        var data = {};
        var a = elements[i];
        data.filePath = a.dataset.filePath;
        data.href = a.href;
        var em = elements[i].getElementsByTagName('em');
        if (em.length) {
          data.index = em[0].textContent;
        }
        var h3 = elements[i].getElementsByTagName('h3');
        if (h3.length) {
          data.title = h3[0].textContent;
        }
        var p = elements[i].getElementsByTagName('p');
        if (p.length) {
          data.text = p[0].textContent;
        }
        var img = elements[i].getElementsByTagName('img');
        if (img.length) {
          data.img = img[0].src;
        }
        elementsData.push(data);
      }
      return elementsData;
    });
    this.switchToMe();
    return listItems;
  },

  get firstListItem() {
    return this.client.helper.waitForElement(Music.Selector.firstListItem);
  },

  get albumsListItemsData() {
    return this._getListItemsData(this.albumsViewFrame);
  },

  get artistsListItemsData() {
    return this._getListItemsData(this.artistsViewFrame);
  },

  get songsListItemsData() {
    return this._getListItemsData(this.songsViewFrame);
  },

  get songs() {
    return this._getListItemsData(this.activeViewFrame);
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

  waitForListEnumerate: function(frameSelector) {
    var frame = this.client.findElement(frameSelector);
    assert.ok(frame, 'Frame must be valid.' + frameSelector);

    this.client.waitFor(function() {
      var selector = frameSelector;
      return this.client.executeScript(function(selector) {
        return document.querySelector(selector);
      }, [selector]);
    }.bind(this));

    this.client.switchToFrame(frame);

    this.client.waitFor(function() {
      return this.client.executeScript(function() {
        return document.readyState === 'complete';
      });
    }.bind(this));

    this.client.waitFor(function() {
      return this.client.executeScript(function() {
        var el = document.querySelector('#list');
        return el; //.state === 'complete';
      });
    }.bind(this));

    this.switchToMe();
  },

  waitFinishedScanning: function() {
    this.client.waitFor(function() {
      return this.client.executeScript(function() {
        return window.wrappedJSObject.Database.initialScanComplete === true;
      });
    }.bind(this));
  },

  waitForFirstTile: function() {
    this.client.switchToFrame(this.homeViewFrame);
    this.client.helper.waitForElement(Music.Selector.firstTile);
    this.switchToMe();
  },

  waitForMessageOverlayShown: function(shouldBeShown) {
    this.client.waitFor(function() {
      var shown = this.messageOverlay.displayed();
      return shown === shouldBeShown;
    }.bind(this));
  },

  waitForAList: function(frame) {
    assert.ok(frame, 'Frame must be valid ' + frame);
    this.client.switchToFrame(frame);
    this.client.waitFor(function() {
      return this.client.executeScript(function() {
        return document.querySelector('#list');
      });
    }.bind(this));
    this.switchToMe();
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
    this.client.helper.waitForElement(Music.Selector.viewFrame);
  },

  waitForSecondaryListView: function() {
    this.client.helper.waitForElement(Music.Selector.secondaryViewFrame);
  },

  waitForSongsView: function() {
    this.client.helper.waitForElement(
      Music.Selector.songsViewFrameActive);
  },

  waitForArtistsView: function() {
    this.client.helper.waitForElement(
      Music.Selector.artistsViewFrameActive);
  },

  waitForArtistDetailView: function() {
    this.client.helper.waitForElement(
      Music.Selector.artistDetailViewFrameActive);
  },

  waitForAlbumsView: function() {
    this.client.helper.waitForElement(
      Music.Selector.albumsViewFrameActive);
  },

  waitForAlbumDetailView: function() {
    this.client.helper.waitForElement(
      Music.Selector.albumDetailViewFrameActive);
  },

  waitForPlaylistsView: function() {
    this.client.helper.waitForElement(
      Music.Selector.playlistsViewFrameActive);
  },

  waitForPlaylistDetailView: function() {
    this.client.helper.waitForElement(
      Music.Selector.playlistDetailViewFrameActive);
  },

  waitForPlayerView: function() {
    this.client.helper.waitForElement(
      Music.Selector.playerViewFrameActive);
  },

  // we check for the attribute "hidden"
  checkPlayerIconShown: function(shouldBeShown) {
    var hidden = this.playerIcon.getAttribute('hidden');
    var result = (hidden === 'false');
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
    this.waitForArtistsView();
  },

  switchToSongsView: function() {
    this.songsTab.tap();
    this.waitForSongsView();
  },

  switchToAlbumsView: function() {
    this.albumsTab.tap();
    this.waitForAlbumsView();
  },

  switchToPlaylistsView: function() {
    this.playlistsTab.tap();
    this.waitForPlaylistsView();
  },

  _selectItem: function(name, frame) {
    this.client.switchToFrame(frame);

    var elements = this.client.findElements('#list a');
    assert.ok(elements.length > 0);

    var matching = elements.filter(function (element) {
      return element.findElement('h3').text() === name;
    });
    assert.ok(matching.length > 0);
    matching[0].tap();

    this.switchToMe();
  },

  selectAlbum: function(name) {
    this._selectItem(name, this.albumsViewFrame);
  },

  selectArtist: function(name) {
    this._selectItem(name, this.artistsViewFrame);
  },

  selectPlaylist: function(name) {
    this._selectItem(name, this.playlistsViewFrame);
  },

  // only from a list (song list)
  playFirstSong: function() {
    this.client.switchToFrame(this.songsViewFrame);
    this.firstSong.click();
    this.switchToMe();
  },

  playFirstSongByArtist: function() {
    this.client.switchToFrame(this.artistDetailViewFrame);
    this.firstSong.click();
    this.switchToMe();
  },

  playFirstSongByAlbum: function() {
    this.client.switchToFrame(this.albumDetailViewFrame);
    this.firstSong.click();
    this.switchToMe();
  },

  playFirstSongByPlaylist: function() {
    this.client.switchToFrame(this.playlistDetailViewFrame);
    this.firstSong.click();
    this.switchToMe();
  },

  tapPlayButton: function() {
    this.actions.tap(this.playButton).perform();
  },

  tapHeaderActionButton: function() {
    this.header.tap(25, 25);
  },

  showSongInfo: function() {
    var frame = this.playerViewFrame;
    assert.ok(frame);
    this.client.switchToFrame(frame);

    this.client.helper.waitForElement(Music.Selector.playerCover).click();

    this.switchToMe();
  },

  waitForRatingOverlayHidden: function() {
    var frame = this.playerViewFrame;
    assert.ok(frame);
    this.client.switchToFrame(frame);

    this.client.waitFor(function() {
      var cover = this.client.findElement(Music.Selector.playerCover);
      assert.ok(cover);
      this.client.switchToShadowRoot(cover);
      var container = this.client.findElement('#container');
      assert.ok(container);
      var isHidden = (container.getAttribute('class').split(' ').
                      indexOf('show-overlay') === -1);
      this.client.switchToShadowRoot();
      return isHidden;
    }.bind(this));

    this.switchToMe();
  },

  tapRating: function(rating) {
    this.showSongInfo();

    var frame = this.playerViewFrame;
    assert.ok(frame);
    this.client.switchToFrame(frame);

    var cover = this.client.findElement(Music.Selector.playerCover);
    this.client.switchToShadowRoot(cover);
    assert.ok(cover);
    var ratingEl = this.client.findElement('#rating');
    assert.ok(rating);
    this.client.switchToShadowRoot(ratingEl);
    var star = this.client.findElement('button[value="' + rating + '"]');
    assert.ok(star);
    star.click();
    this.client.switchToShadowRoot();
    this.client.switchToShadowRoot();

    this.switchToMe();
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
      var frame = this.playerViewFrame;
      assert.ok(frame);
      this.client.switchToFrame(frame);

      var cover = this.client.findElement(Music.Selector.playerCover);
      this.client.switchToShadowRoot(cover);
      assert.ok(cover);

      this.shareButton.tap();

      this.client.switchToShadowRoot();
      this.client.switchToShadowRoot();
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
