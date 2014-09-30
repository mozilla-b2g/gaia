'use strict';

/*
 * This is Music Application of Gaia
 */

// strings for localization
var musicTitle;
var playlistTitle;
var artistTitle;
var albumTitle;
var songTitle;
var pickerTitle;
var unknownAlbum;
var unknownArtist;
var unknownTitle;
var shuffleAllTitle;
var highestRatedTitle;
var recentlyAddedTitle;
var mostPlayedTitle;
var leastPlayedTitle;

var unknownTitleL10nId = 'unknownTitle';
var unknownArtistL10nId = 'unknownArtist';
var unknownAlbumL10nId = 'unknownAlbum';
var shuffleAllTitleL10nId = 'playlists-shuffle-all';
var highestRatedTitleL10nId = 'playlists-highest-rated';
var recentlyAddedTitleL10nId = 'playlists-recently-added';
var mostPlayedTitleL10nId = 'playlists-most-played';
var leastPlayedTitleL10nId = 'playlists-least-played';

// Pick activity
var pendingPick;
// Key for store the player options of repeat and shuffle
var SETTINGS_OPTION_KEY = 'settings_option_key';
var playerSettings;

var chromeInteractive = false;
//
// Overlay messages
//
var currentOverlay;  // The id of the current overlay or null if none.
// To display a correct overlay, we need to record the known songs from musicdb
var knownSongs = [];
// We need handles here to cancel enumerations for
// tilesView, listView, sublistView and playerView
var tilesHandle = null;
var listHandle = null;
var sublistHandle = null;
var playerHandle = null;

var App = {
  localize: function app_localize() {
    // Get prepared for the localized strings, these will be used later
    navigator.mozL10n.ready(function onLanguageChange() {
      musicTitle = navigator.mozL10n.get('music');
      playlistTitle = navigator.mozL10n.get('playlists');
      artistTitle = navigator.mozL10n.get('artists');
      albumTitle = navigator.mozL10n.get('albums');
      songTitle = navigator.mozL10n.get('songs');
      pickerTitle = navigator.mozL10n.get('picker-title');
      unknownAlbum = navigator.mozL10n.get(unknownAlbumL10nId);
      unknownArtist = navigator.mozL10n.get(unknownArtistL10nId);
      unknownTitle = navigator.mozL10n.get(unknownTitleL10nId);
      shuffleAllTitle = navigator.mozL10n.get(shuffleAllTitleL10nId);
      highestRatedTitle = navigator.mozL10n.get(highestRatedTitleL10nId);
      recentlyAddedTitle = navigator.mozL10n.get(recentlyAddedTitleL10nId);
      mostPlayedTitle = navigator.mozL10n.get(mostPlayedTitleL10nId);
      leastPlayedTitle = navigator.mozL10n.get(leastPlayedTitleL10nId);
    });
  },

  init: function app_init() {
    this.localize();

    navigator.mozL10n.once(function onLocalizationInit() {
      // Tell performance monitors that our chrome is visible.
      window.dispatchEvent(new CustomEvent('moz-chrome-dom-loaded'));

      initDB();

      TitleBar.init();
      TilesView.init();
      ListView.init();
      SubListView.init();
      SearchView.init();
      TabBar.init();

      this.setStartMode();

      // Do this now and on each language change in the future
      navigator.mozL10n.ready(function() {
        ModeManager.updateTitle();
        TabBar.playlistArray.localize();

        if (!chromeInteractive) {
          chromeInteractive = true;
          // Tell performance monitors that our chrome is interactible.
          window.dispatchEvent(new CustomEvent('moz-chrome-interactive'));
        }
      });
    }.bind(this));

    window.addEventListener('scrollstart', function onScroll(e) {
      var views = document.getElementById('views');
      views.classList.add('scrolling');
    });

    window.addEventListener('scrollend', function onScroll(e) {
      var views = document.getElementById('views');
      views.classList.remove('scrolling');
    });
  },

  setStartMode: function app_setStartMode() {
    // If the URL contains '#pick', we will handle the pick activity
    // or just start the Music app from Mix page
    if (document.URL.indexOf('#pick') !== -1) {
      navigator.mozSetMessageHandler('activity', function activityHandler(a) {
        var activityName = a.source.name;

        if (activityName === 'pick') {
          pendingPick = a;
        }
      });

      TabBar.option = 'title';
      ModeManager.start(MODE_PICKER);
    } else {
      TabBar.option = 'mix';
      ModeManager.start(MODE_TILES);

      // The player options will be used later,
      // so let's get them first before the player is loaded.
      asyncStorage.getItem(SETTINGS_OPTION_KEY, function(settings) {
        playerSettings = settings;
      });

      // The done button must be removed when we are not in picker mode
      // because the rules of the header building blocks
      var doneButton = document.getElementById('title-done');
      doneButton.parentNode.removeChild(doneButton);
    }
  },

  showOverlay: function app_showOverlay(id) {
    //
    // If id is null then hide the overlay. Otherwise, look up the localized
    // text for the specified id and display the overlay with that text.
    // Supported ids include:
    //
    //   nocard: no sdcard is installed in the phone
    //   pluggedin: the sdcard is being used by USB mass storage
    //   empty: no songs found
    //
    // Localization is done using the specified id with "-title" and "-text"
    // suffixes.
    //
    currentOverlay = id;

    if (id === null) {
      document.getElementById('overlay').classList.add('hidden');
      return;
    }

    var menu = document.getElementById('overlay-menu');
    if (pendingPick) {
      menu.classList.remove('hidden');
    } else {
      menu.classList.add('hidden');
    }

    var title, text;
    var l10nIds = {'title': id + '-title', 'text': id + '-text'};
    if (id === 'nocard') {
      l10nIds.title = 'nocard2-title';
      l10nIds.text = 'nocard3-text';
    }

    var titleElement = document.getElementById('overlay-title');
    var textElement = document.getElementById('overlay-text');

    titleElement.dataset.l10nId = l10nIds.title;
    textElement.dataset.l10nId = l10nIds.text;

    document.getElementById('overlay').classList.remove('hidden');
  },

  showCorrectOverlay: function app_showCorrectOverlay() {
    // If we don't know about any songs, display the 'empty' overlay.
    // If we do know about songs and the 'empty overlay is being displayed
    // then hide it.
    if (knownSongs.length > 0) {
      if (currentOverlay === 'empty')
        this.showOverlay(null);
    } else {
      this.showOverlay('empty');
    }
  },

  showCurrentView: function app_showCurrentView(callback) {
    // We will need getThumbnailURL()
    // to display thumbnails in TilesView
    // it's possibly not loaded so load it
    LazyLoader.load('js/metadata_scripts.js', function() {
      function showListView() {
        var option = TabBar.option;
        var info = {
          key: 'metadata.' + option,
          range: null,
          direction: (option === 'title') ? 'next' : 'nextunique',
          option: option
        };

        ListView.activate(info);
      }
      // If it's in picking mode we will just enumerate all the songs
      // and don't need to enumerate data for TilesView
      // because mix page is not needed in picker mode
      if (pendingPick) {
        showListView();

        if (callback)
          callback();

        return;
      }

      // If music is not in tiles mode and showCurrentView is called
      // that might be an user has mount/unmount his sd card
      // and modified the songs so musicdb will be updated
      // then we should update the list view if music app is in list mode
      if (ModeManager.currentMode === MODE_LIST && TabBar.option !== 'playlist')
        showListView();

      // Enumerate existing song entries in the database
      // List them all, and sort them in ascending order by album.
      // Use enumerateAll() here so that we get all the results we want
      // and then pass them synchronously to the update() functions.
      // If we do it asynchronously, then we'll get one redraw for
      // every song.
      // * Note that we need to update tiles view every time this happens
      // because it's the top level page and an independent view
      tilesHandle = musicdb.enumerateAll(
        'metadata.album', null, 'nextunique',
        function(songs) {
          // Add null to the array of songs
          // this is a flag that tells update()
          // to show or hide the 'empty' overlay
          songs.push(null);
          TilesView.clean();

          knownSongs.length = 0;
          songs.forEach(function(song) {
            TilesView.update(song);
            // Push the song to knownSongs then
            // we can display a correct overlay
            knownSongs.push(song);
          });

          // Tell performance monitors that the content is displayed and is
          // ready to interact with. We won't send the final moz-app-loaded
          // event until we're completely stable and have finished scanning.
          //
          // XXX: Maybe we could emit these events earlier, when we've just
          // finished the "above the fold" content. That's hard to do on
          // arbitrary screen resolutions, though.
          window.dispatchEvent(new CustomEvent('moz-app-visually-complete'));
          window.dispatchEvent(new CustomEvent('moz-content-interactive'));

          if (callback)
            callback();
        }
      );
    });
  }
};

App.init();
