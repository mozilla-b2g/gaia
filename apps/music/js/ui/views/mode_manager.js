/* exported ModeManager */
/* global TitleBar, TabBar, LazyLoader, TilesView, ListView, SubListView,
          PlayerView, SearchView, App, asyncStorage */
'use strict';

// This Application has five modes: TILES, SEARCH, LIST, SUBLIST, and PLAYER
// Search has two "modes", depending on whether we came from TILES or LIST.
//
// Before the Music app is launched we use display: none to hide the modes so
// that Gecko will not try to apply CSS styles on those elements which seems are
// actions that slows down the startup time we will remove display: none on
// elements when we need to display them.
var MODE_TILES = 1;
var MODE_LIST = 2;
var MODE_SUBLIST = 3;
var MODE_PLAYER = 4;
var MODE_SEARCH_FROM_TILES = 5;
var MODE_SEARCH_FROM_LIST = 6;
var MODE_PICKER = 7;

// Key for store the player options of repeat and shuffle
var SETTINGS_OPTION_KEY = 'settings_option_key';

var ModeManager = {
  views: {
    1: {id: 'views-tiles', path: 'js/ui/views/tiles_view.js'},
    2: {id: 'views-list', path: 'js/ui/views/list_view.js'},
    3: {id: 'views-sublist', path: 'js/ui/views/subList_view.js'},
    4: {id: 'views-player', path: 'js/ui/views/player_view.js'},
    5: {id: 'views-search', path: 'js/ui/views/search_view.js'},
    6: {id: 'views-search', path: 'js/ui/views/search_view.js'},
    7: {id: 'views-list', path: 'js/ui/views/list_view.js'}
  },
  _modeStack: [],
  playerTitle: null,

  get currentMode() {
    return this._modeStack[this._modeStack.length - 1];
  },

  get previousMode() {
    return this._modeStack[this._modeStack.length - 2];
  },

  start: function(mode, callback) {
    this._modeStack = [];
    this._resetViews();
    this._pushMode(mode, false, function() {
      this._modeStack = [mode];
      this._updateMode(callback);
    }.bind(this));
  },

  push: function(mode, callback) {
    this._pushMode(mode, true, function() {
      this._modeStack.push(mode);
      this._updateMode(callback);
    }.bind(this));
  },

  pop: function() {
    if (this._modeStack.length <= 1) {
      return;
    }
    this._popMode();
    this._modeStack.pop();
    this._updateMode();
  },

  _resetViews: function() {
    for (var mode in this.views) {
      var sheet = document.getElementById(this.views[mode].id);
      sheet.classList.remove('animated');
      sheet.classList.remove('current');
      sheet.classList.add('next');
    }
  },

  waitForView: function(mode, callback) {
    var view = this.views[mode];
    if (view.isLoaded) {
      if (callback) {
        callback(view);
        return;
      }
    }

    LazyLoader.load(view.path).then(() => {
      // Our view might have been loaded while we were waiting so check again.
      if (view.isLoaded) {
        return;
      }

      // Remove the view's hidden style before pushing it.
      var sheet = document.getElementById(view.id);
      sheet.classList.remove('hidden');

      switch(view.id) {
        case 'views-tiles':
          TilesView.init();
          break;
        case 'views-list':
          ListView.init();
          break;
        case 'views-sublist':
          SubListView.init();
          break;
        case 'views-player':
          PlayerView.init();
          break;
        case 'views-search':
          SearchView.init();
          break;
      }

      // The PlayerView needs the settings values before use it.
      if (view.id === 'views-player') {
        asyncStorage.getItem(SETTINGS_OPTION_KEY, (settings) => {
          App.playerSettings = settings;
          PlayerView.setOptions(App.playerSettings);
        });
      } else if (view.id === 'views-search') {
        // The text normalizer is needed in search view.
        return LazyLoader.load('shared/js/text_normalizer.js');
      }
    }).then(() => {
      view.isLoaded = true;
      if (callback) {
        callback(view);
      }
    });
  },

  _pushMode: function(mode, animated, callback) {
    this.waitForView(mode, (view) => {
      var nextId = view.id;
      var currentId = this.currentMode ?
                      this.views[this.currentMode].id : null;
      var nextSheet = document.getElementById(nextId);
      var currentSheet = document.getElementById(currentId);

      if (nextSheet) {
        nextSheet.classList.toggle('animated', animated);

        nextSheet.classList.remove('previous');
        nextSheet.classList.remove('next');
        nextSheet.classList.add('current');
      }

      if (currentSheet) {
        currentSheet.classList.toggle('animated', animated);

        currentSheet.classList.remove('current');
        currentSheet.classList.add('previous');
      }

      if (callback) {
        callback();
      }
    });
  },

  _popMode: function(callback) {
    var currentId = this.views[this.currentMode].id;
    var previousId = this.views[this.previousMode].id;
    var currentSheet = document.getElementById(currentId);
    var previousSheet = document.getElementById(previousId);

    currentSheet.classList.remove('current');
    currentSheet.classList.add('next');

    previousSheet.classList.remove('previous');
    previousSheet.classList.add('current');

    if (callback) {
      callback();
    }
  },

  _updateBackArrow: function() {
    var noBackArrow = [
      MODE_TILES,
      MODE_LIST,
      MODE_SEARCH_FROM_TILES,
      MODE_SEARCH_FROM_LIST
    ];

    var hide = noBackArrow.indexOf(this.currentMode) > -1;
    TitleBar.showBackArrow(!hide);
  },

  updateTitle: function() {
    var titleL10n;

    switch (this.currentMode) {
      case MODE_TILES:
        if (this.playerTitle) {
          titleL10n = {raw: this.playerTitle};
        } else {
          titleL10n = 'music';
        }
        break;
      case MODE_LIST:
      case MODE_SUBLIST:
        switch (TabBar.option) {
          case 'playlist':
            titleL10n = 'playlists';
            break;
          case 'artist':
            titleL10n = 'artists';
            break;
          case 'album':
            titleL10n = 'albums';
            break;
          case 'title':
            titleL10n = 'songs';
            break;
        }
        break;
      case MODE_PLAYER:
        if (this.playerTitle) {
          titleL10n = {raw: this.playerTitle};
        } else {
          titleL10n = 'unknownTitle';
        }
        break;
      case MODE_PICKER:
        titleL10n = 'picker-title';
        break;
    }

    // if title doesn't exist, that should be the first time launch
    // so we can just ignore changeTitleText()
    // because the title is already localized in HTML
    // And if title does exist, it should be the localized "Music"
    // so it will be just fine to update changeTitleText() again
    if (titleL10n) {
      TitleBar.changeTitleText(titleL10n);
    }

    // Hide the title bar when music is in search modes.
    TitleBar.view.hidden =
      this.currentMode === MODE_SEARCH_FROM_TILES ||
      this.currentMode === MODE_SEARCH_FROM_LIST;
  },

  updatePlayerIcon: function() {
    var isPlayerMode = (this.currentMode === MODE_PLAYER);
    var isPlayerQueued =
      (this.views[MODE_PLAYER].isLoaded && PlayerView.dataSource.length > 0);

    TitleBar.playerIcon.hidden = isPlayerMode || !isPlayerQueued;
    // We have to show the done button when we are in picker mode
    // and previewing the selecting song
    if (App.pendingPick) {
      TitleBar.doneButton.hidden = !isPlayerMode;
    }
  },

  _updateTabs: function() {
    var hideTabs = this.currentMode === MODE_PLAYER ||
                   this.currentMode === MODE_SEARCH_FROM_TILES ||
                   this.currentMode === MODE_SEARCH_FROM_LIST;

    TabBar.view.classList.toggle('away', hideTabs);
  },

  _updateMode: function(callback) {
    this._updateBackArrow();
    this.updateTitle();
    this.updatePlayerIcon();
    this._updateTabs();

    // Music only share the playing file when it's in player mode.
    // Disable the NFC sharing when it's in the other modes.
    this._enableNFCSharing((this.currentMode === MODE_PLAYER));

    if (callback) {
      callback();
    }
  },

  _enableNFCSharing: function(enabled) {
    if (!navigator.mozNfc) {
      return;
    }

    if (enabled && !App.pendingPick) {
      // Assign the sharing function to onpeerready so that it will trigger
      // the shrinking ui to share the playing file.
      navigator.mozNfc.onpeerready = function(event) {
        var peer = event.peer;
        if (peer) {
          peer.sendFile(PlayerView.playingBlob);
        }
      };
    } else {
      // The mozNfc api will check onpeerready, if it's null, then it will not
      // trigger the shrinking ui so it won't be able to share the file.
      navigator.mozNfc.onpeerready = null;
    }
  }
};
