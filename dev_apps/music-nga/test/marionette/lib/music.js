/* global require, module */
'use strict';

var assert = require('assert');

function Music(client, origin) {
  this.client = client;
  this.origin = origin || ('app://' + Music.DEFAULT_ORIGIN);
  this.actions = client.loader.getActions();
}

module.exports = Music;

Music.DEFAULT_ORIGIN = 'music-nga.gaiamobile.org';

Music.Selector = Object.freeze({
  viewFrame: '#view-stack iframe',
  secondaryViewFrame: '#view-stack iframe:nth-child(2)',
  activeViewFrame: '#view-stack iframe.active',
  homeViewFrame: 'iframe[data-view-id="home"]',
  songsViewFrame: 'iframe[data-view-id="songs"]',
  artistsViewFrame: 'iframe[data-view-id="artists"]',
  playerViewFrame: 'iframe[src*="views/player/index.html"]',
  endpoint: '#endpoint',

  messageOverlay: '#overlay',
  firstTile: '.tile',
  tabBar: '#tab-bar',
  playlistsTab: '#tab-bar button[data-view-id="playlists"]',
  artistsTab: '#tab-bar button[data-view-id="artists"]',
  albumsTab: '#tab-bar button[data-view-id="albums"]',
  songsTab: '#tab-bar button[data-view-id="songs"]',
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
  firstSong: '#list li',
  playButton: '#player-controls-play',
  progressBar: '#player-seek-bar-progress',
  shareButton: '#player-cover-share',
  shareMenu: 'form[data-z-index-level="action-menu"]',
  pickDoneButton: '#title-done',
  header: '#header',
  titleText: '#title-text',
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

  get songsViewFrame() {
    return this.client.findElement(Music.Selector.songsViewFrame);
  },

  get playerViewFrame() {
    return this.client.findElement(Music.Selector.playerViewFrame);
  },

  get endpoint() {
    return this.client.findElement(Music.Selector.endpoint);
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

    var rating = this.client.executeScript(function (sel) {
      var value = document.querySelector(sel).
          shadowRoot.querySelector('#rating').
          shadowRoot.querySelector('#container').dataset.value;
      return value ? value : 0;
    }, [Music.Selector.playerCover]);

    this.switchToMe();
    return rating;
  },

  // Helper for the getter.
  _getListItemsData: function(frame) {
    assert.ok(frame, 'Frame must be valid.' + frame);

    this.client.switchToFrame(frame);

    var listItems = this.client.executeScript(function () {
      var list = document.getElementById('list');
      var elementsData = [];
      var elements = list.querySelectorAll('li');
      for(var i = 0; i < elements.length; i++) {
        var data = {};
        var a = elements[i].getElementsByTagName('a');
        if (a.length) {
          data.filePath = a[0].dataset.filePath;
          data.href = a[0].href;
        }
        var h3 = elements[i].getElementsByTagName('h3');
        if (h3.length) {
          data.title = h3[0].textContent;
        }
        var p = elements[i].getElementsByTagName('p');
        if (p.length) {
          data.text = p[0].textContent;
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
    this.client.switchToFrame(this.endpoint);
    this.client.waitFor(function() {
      return this.client.executeScript(function() {
        return window.wrappedJSObject.Database.initialScanComplete === true;
      });
    }.bind(this));
    this.switchToMe();
  },

  waitForFirstTile: function() {
    this.client.switchToFrame(this.homeViewFrame);
    this.client.helper.waitForElement(Music.Selector.firstTile);
    this.switchToMe();
  },

  waitForMessageOverlayShown: function(shouldBeShown) {
    this.client.waitFor(function() {
      var volumeShown = this.messageOverlay.displayed();
      return volumeShown === shouldBeShown;
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

  waitForPlayerView: function() {
    this.client.helper.waitForElement(Music.Selector.playerViewFrame);
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
  },

  switchToSongsView: function() {
    this.songsTab.tap();
    this.client.helper.waitForElement(Music.Selector.viewFrame);
  },

  switchToAlbumsView: function() {
    this.albumsTab.tap();
    this.client.helper.waitForElement(Music.Selector.viewFrame);
  },

  switchToPlaylistsView: function() {
    this.playlistsTab.tap();
    this.client.helper.waitForElement(Music.Selector.viewFrame);
  },

  _selectItem: function(name, what) {
    var frame = this.viewFrame;
    assert.ok(frame);
    this.client.switchToFrame(frame);

    var elements = this.client.findElements('#list li');
    assert.ok(elements.length > 0);

    elements.filter(function (element) {
      return element.findElement('h3').text() === name;
    })[0].tap();

    this.switchToMe();
  },

  selectAlbum: function(name) {
    this._selectItem(name, 'album');
  },

  selectArtist: function(name) {
    this._selectItem(name, 'artist');
  },

  selectPlaylist: function(name) {
    this._selectItem(name, 'playlist');
  },

  // only from a list (song list)
  playFirstSong: function(secondary) {
    var frame = secondary ? this.secondaryViewFrame : this.viewFrame;
    assert.ok(frame);
    this.client.switchToFrame(frame);
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
      return this.client.executeScript(function (sel) {
        return document.querySelector(sel).
          shadowRoot.querySelector('#container').
          classList.contains('show-overlay') === false;
      }, [Music.Selector.playerCover]);
    }.bind(this));

    this.switchToMe();
  },

  tapRating: function(rating) {
    this.showSongInfo();

    var frame = this.playerViewFrame;
    assert.ok(frame);
    this.client.switchToFrame(frame);


    this.client.executeScript(function (sel, rating) {
      document.querySelector(sel).
        shadowRoot.querySelector('#rating').
        shadowRoot.querySelector('button[value="' + rating + '"]').click();
    }, [Music.Selector.playerCover, rating]);

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
