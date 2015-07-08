/* exported App */
/* global Database, MusicComms, TitleBar, TabBar, TilesView, ListView,
          PlayerView, ModeManager, MODE_PICKER, MODE_TILES, MODE_LIST,
          LazyLoader */
'use strict';

/*
 * This is Music Application of Gaia
 */

var App = (function() {
  var app;
  var chromeInteractive = false;
  // initialize the app object
  init();

  function init() {
    navigator.mozL10n.once(function onLocalizationInit() {
      // Tell performance monitors that our chrome is visible.
      window.performance.mark('navigationLoaded');

      Database.init();
      TitleBar.init();
      TabBar.init();

      setStartMode();

      // Do this now and on each language change in the future
      navigator.mozL10n.ready(function() {
        ModeManager.updateTitle();

        if (!chromeInteractive) {
          chromeInteractive = true;
          // Tell performance monitors that our chrome is interactive.
          window.performance.mark('navigationInteractive');
        }
      });
    });
  }

  function setStartMode() {
    // If the URL contains '#pick', we will handle the pick activity
    // or just start the Music app from Mix page
    if (document.URL.indexOf('#pick') !== -1) {
      navigator.mozSetMessageHandler('activity', function activityHandler(a) {
        var activityName = a.source.name;

        if (activityName === 'pick') {
          // Display the correct ui for the pick activity.
          document.body.classList.add('picker-mode');
          app.pendingPick = a;

          // If the overlay is displayed during a pick, let the user get out of
          // it.
          document.getElementById('overlay-cancel-button')
            .addEventListener('click', function() {
              if (App.pendingPick) {
                App.pendingPick.postError('pick cancelled');
              }
            });
        }

        TabBar.option = 'title';
        ModeManager.start(MODE_PICKER);
      });
    } else {
      // The done button must be removed when we are not in picker mode
      // because the rules of the header building blocks
      TitleBar.doneButton.parentNode.removeChild(TitleBar.doneButton);

      TabBar.option = 'mix';
      ModeManager.start(MODE_TILES);
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
    } else {
      app.showOverlay('empty');
    }
  }

  function dbEnumerable(callback) {
    // If we've been upgrading, hide that now
    if (app.currentOverlay === 'upgrade') {
      app.showOverlay(null);
    }

    // Display music that we already know about
    refreshViews(function() {
      // Tell performance monitors that the content is displayed and is
      // ready to interact with. We won't send the final fullyLoaded
      // mark until we're completely stable and have finished scanning.
      //
      // XXX: Maybe we could emit these marks earlier, when we've just
      // finished the "above the fold" content. That's hard to do on
      // arbitrary screen resolutions, though.
      window.performance.mark('visuallyLoaded');
      window.performance.mark('contentInteractive');

      // For performance optimization, we disable the font-fit logic in
      // gaia-header to speed up the startup times, and here we have to
      // remove the no-font-fit attribute to trigger the font-fit logic.
      TitleBar.view.removeAttribute('no-font-fit');

      // Hide the spinner once we've displayed the initial screen.
      // The setTimeout is a workaround for Bug 1166500.
      document.getElementById('spinner').classList.add('hidden');
      setTimeout(function() {
        document.getElementById('spinner-overlay').classList.add('hidden');
      }, 100);

      // Only init the communication when music is not in picker mode.
      if (document.URL.indexOf('#pick') === -1) {
        // We need to wait to init the music comms until the UI is fully loaded
        // because the init of music comms could slow down the startup time.
        setupCommunications();
      }

      if (callback) {
        callback();
      }
    });
  }

  function setupCommunications() {
    var files = [
      'shared/js/bluetooth_helper.js',
      'shared/js/media/remote_controls.js',
      'js/communications.js',
    ];

    LazyLoader.load(files).then(() => {
      MusicComms.init();
    });
  }

  function dbReady(refresh, callback) {
    // Hide the nocard or pluggedin overlay if it is displayed
    if (app.currentOverlay === 'nocard' || app.currentOverlay === 'pluggedin') {
      app.showOverlay(null);
    }

    if (refresh) {
      refreshViews(callback);
    } else if (callback) {
      callback();
    }
  }

  function dbUnavailable(why) {
    // Stop and reset the player then back to tiles mode to avoid
    // crash.  We could be smarter here by looking at the currently
    // playing song and only stopping it if its volume is not in the
    // list of available volumes. But that could potentially cause
    // problems if we are playing a playlist and some songs are on one
    // storage area and some in another. Yanking out an sdcard is
    // uncommon enough that it should be fine to always stop playing.
    if (typeof PlayerView !== 'undefined') {
      PlayerView.stop();
    }

    // TabBar should be set to "mix" to sync with the tab selection.
    if (!app.pendingPick) {
      TabBar.option = 'mix';
      ModeManager.start(MODE_TILES, function() {
        TilesView.hideSearch();
      });
    }

    if (why === 'nocard') {
      app.showOverlay('nocard');
    } else if (why === 'unmounted') {
      app.showOverlay('pluggedin');
    }
  }

  // This tracks if we've automatically hidden the search box on startup yet (it
  // should only be done once!)
  var hidSearchBox = false;

  function refreshViews(callback) {
    function showListView() {
      var option = TabBar.option;
      var info = {
        key: 'metadata.' + option,
        range: null,
        direction: (option === 'title') ? 'next' : 'nextunique',
        option: option
      };

      ModeManager.waitForView(MODE_PICKER, () => {
        ListView.activate(info);
      });
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

    // If music is not in tiles mode and refreshViews is called, that might be
    // because the user has (un)mounted his SD card and modified the songs.
    // The database will be updated, and then we should update the list view if
    // music app is in list mode.
    if (ModeManager.currentMode === MODE_LIST &&
        TabBar.option !== 'playlist') {
      showListView();
    }

    ModeManager.waitForView(MODE_TILES, () => {
      TilesView.activate(function(songs) {
        // If there are no songs, disable the TabBar to prevent users switching
        // to other pages.
        TabBar.setDisabled(!songs.length);
        app.knownSongs = songs;

        app.showCorrectOverlay();
        if (app.currentOverlay === null && !hidSearchBox) {
          hidSearchBox = true;

          // After updating the tiles view, hide the search bar. However, we
          // want to let it stay visible for a short duration so that the user
          // knows it exists.
          window.setTimeout(function() { TilesView.hideSearch(); }, 1000);
        }
        if (callback) {
          callback();
        }
      });
    });
  }

  app = {
    // Pick activity
    pendingPick: null,
    // Settings for the player view
    playerSettings: null,
    // The id of the current overlay or null if none.
    currentOverlay: null,
    // To display a correct overlay, record the known songs from the database.
    knownSongs: [],
    // Exported functions
    showOverlay: showOverlay,
    showCorrectOverlay: showCorrectOverlay,
    dbEnumerable: dbEnumerable,
    dbReady: dbReady,
    dbUnavailable: dbUnavailable,
    refreshViews: refreshViews
  };

  return app;
})();
