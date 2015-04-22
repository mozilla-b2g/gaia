/* exported App */
/* global initDB, musicdb, LazyLoader, TitleBar, TabBar, asyncStorage,
          TilesView, ListView, SubListView, SearchView, ModeManager,
          MODE_PICKER, MODE_TILES, MODE_LIST, reparsingMetadata */
'use strict';

/*
 * This is Music Application of Gaia
 */

// Key for store the player options of repeat and shuffle
var SETTINGS_OPTION_KEY = 'settings_option_key';

var App = (function() {
  var app;
  var chromeInteractive = false;
  // initialize the app object
  init();

  function init() {
    navigator.mozL10n.once(function onLocalizationInit() {
      // Tell performance monitors that our chrome is visible.
      window.performance.mark('navigationLoaded');
      window.dispatchEvent(new CustomEvent('moz-chrome-dom-loaded'));

      initDB();

      TitleBar.init();
      TilesView.init();
      ListView.init();
      SubListView.init();
      SearchView.init();
      TabBar.init();

      setStartMode();

      // Do this now and on each language change in the future
      navigator.mozL10n.ready(function() {
        ModeManager.updateTitle();

        if (!chromeInteractive) {
          chromeInteractive = true;
          // Tell performance monitors that our chrome is interactible.
          window.performance.mark('navigationInteractive');
          window.dispatchEvent(new CustomEvent('moz-chrome-interactive'));
        }
      });
    });

    window.addEventListener('scrollstart', function onScroll(e) {
      var views = document.getElementById('views');
      views.classList.add('scrolling');
    });

    window.addEventListener('scrollend', function onScroll(e) {
      var views = document.getElementById('views');
      views.classList.remove('scrolling');
    });
  }

  function setStartMode() {
    // If the URL contains '#pick', we will handle the pick activity
    // or just start the Music app from Mix page
    if (document.URL.indexOf('#pick') !== -1) {
      navigator.mozSetMessageHandler('activity', function activityHandler(a) {
        var activityName = a.source.name;

        if (activityName === 'pick') {
          app.pendingPick = a;
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
        app.playerSettings = settings;
      });

      // The done button must be removed when we are not in picker mode
      // because the rules of the header building blocks
      var doneButton = document.getElementById('title-done');
      doneButton.parentNode.removeChild(doneButton);
    }
  }

  function showOverlay(id) {
    // Blurring the active element to dismiss the keyboard.
    document.activeElement.blur();
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
    app.currentOverlay = id;

    function setVisibility(visible) {
      // hide or show the overlay container and toggle aria-hidden on all other
      // children of <body>
      Array.forEach(document.body.children, function(elt) {
        if (elt.id === 'overlay') {
          elt.classList.toggle('hidden', !visible);
        } else {
          elt.setAttribute('aria-hidden', visible);
        }
      });
    }

    if (id === null) {
      setVisibility(false);
      return;
    }

    var menu = document.getElementById('overlay-menu');
    if (app.pendingPick) {
      menu.classList.remove('hidden');
    } else {
      menu.classList.add('hidden');
    }

    var l10nIds = {'title': id + '-title', 'text': id + '-text'};
    if (id === 'nocard') {
      l10nIds.title = 'nocard2-title';
      l10nIds.text = 'nocard3-text';
    }

    var titleElement = document.getElementById('overlay-title');
    var textElement = document.getElementById('overlay-text');

    titleElement.dataset.l10nId = l10nIds.title;
    textElement.dataset.l10nId = l10nIds.text;

    setVisibility(true);
  }

  function showCorrectOverlay() {
    // If we don't know about any songs, display the 'empty' overlay.
    // If we do know about songs and the 'empty overlay is being displayed
    // then hide it.
    if (app.knownSongs.length > 0) {
      if (app.currentOverlay === 'empty' || app.currentOverlay === 'upgrade') {
        app.showOverlay(null);
      }
    } else if (reparsingMetadata) {
      app.showOverlay('upgrade');
    } else {
      app.showOverlay('empty');
    }
  }

  function showCurrentView(callback) {
    // We need AlbumArtCache.getCoverURL() to display thumbnails; it might not
    // have been loaded yet, so make sure we load it first. This should prevent
    // us from having to worry about loading it anywhere else in the code, since
    // showCurrentView is called pretty early in the startup process.
    LazyLoader.load('js/metadata/album_art_cache.js', function() {
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
      // If it's in picking mode, we will just enumerate all the songs. We don't
      // need to enumerate data for TilesView because the mix page is not needed
      // in picker mode.
      if (app.pendingPick) {
        showListView();
        if (callback) {
          callback();
        }
        return;
      }

      // If music is not in tiles mode and showCurrentView is called, that might
      // be because the user has (un)mounted his SD card and modified the
      // songs. musicdb will be updated, and then we should update the list view
      // if music app is in list mode.
      if (ModeManager.currentMode === MODE_LIST &&
          TabBar.option !== 'playlist') {
        showListView();
      }

      // Enumerate existing song entries in the database. List them all, and
      // sort them in ascending order by album. Use enumerateAll() here so that
      // we get all the results we want and then pass them synchronously to the
      // update() functions. If we do it asynchronously, then we'll get one
      // redraw for every song.
      //
      // Note: we need to update tiles view every time this happens because it's
      // the top level page and an independent view
      TilesView.handle = musicdb.enumerateAll(
        'metadata.album', null, 'nextunique',
        function(songs) {
          // Add null to the array of songs. This is a flag that tells update()
          // to show or hide the 'empty' overlay.
          songs.push(null);
          TilesView.clean();

          app.knownSongs.length = 0;
          songs.forEach(function(song) {
            TilesView.update(song);
            // Push the song to knownSongs. Then we can display a correct
            // overlay.
            app.knownSongs.push(song);
          });

          // Tell performance monitors that the content is displayed and is
          // ready to interact with. We won't send the final moz-app-loaded
          // event until we're completely stable and have finished scanning.
          //
          // XXX: Maybe we could emit these events earlier, when we've just
          // finished the "above the fold" content. That's hard to do on
          // arbitrary screen resolutions, though.
          window.performance.mark('visuallyLoaded');
          window.dispatchEvent(new CustomEvent('moz-app-visually-complete'));
          window.performance.mark('contentInteractive');
          window.dispatchEvent(new CustomEvent('moz-content-interactive'));
          // For performance optimization, we disable the font-fit logic in
          // gaia-header to speed up the startup times, and here we have to
          // remove the no-font-fit attribute to trigger the font-fit logic.
          TitleBar.view.removeAttribute('no-font-fit');

          if (callback) {
            callback();
          }
        }
      );
    });
  }

  app = {
    // Pick activity
    pendingPick: null,
    // Settings for the player view
    playerSettings: null,
    // The id of the current overlay or null if none.
    currentOverlay: null,
    // To display a correct overlay, record the known songs from musicdb
    knownSongs: [],
    // Exported functions
    showOverlay: showOverlay,
    showCorrectOverlay: showCorrectOverlay,
    showCurrentView: showCurrentView
  };

  return app;
})();
