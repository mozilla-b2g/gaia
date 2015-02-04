/* exported ModeManager */
/* global TitleBar, TabBar, LazyLoader, PlayerView, App */
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

var ModeManager = {
  _modeStack: [],
  playerTitle: null,

  get currentMode() {
    return this._modeStack[this._modeStack.length - 1];
  },

  start: function(mode, callback) {
    this._modeStack = [mode];
    this._updateMode(callback);
  },

  push: function(mode, callback) {
    this._modeStack.push(mode);
    this._updateMode(callback);
  },

  pop: function() {
    if (this._modeStack.length <= 1) {
      return;
    }
    this._modeStack.pop();
    this._updateMode();
  },

  updateBackArrow: function() {
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
    var title;

    switch (this.currentMode) {
      case MODE_TILES:
        title = this.playerTitle || navigator.mozL10n.get('music');
        break;
      case MODE_LIST:
      case MODE_SUBLIST:
        switch (TabBar.option) {
          case 'playlist':
            title = navigator.mozL10n.get('playlists');
            break;
          case 'artist':
            title = navigator.mozL10n.get('artists');
            break;
          case 'album':
            title = navigator.mozL10n.get('albums');
            break;
          case 'title':
            title = navigator.mozL10n.get('songs');
            break;
        }
        break;
      case MODE_PLAYER:
        title = this.playerTitle || navigator.mozL10n.get('unknownTitle');
        break;
      case MODE_PICKER:
        title = navigator.mozL10n.get('picker-title');
        break;
    }

    // if title doesn't exist, that should be the first time launch
    // so we can just ignore changeTitleText()
    // because the title is already localized in HTML
    // And if title does exist, it should be the localized "Music"
    // so it will be just fine to update changeTitleText() again
    if (title) {
      TitleBar.changeTitleText(title);
    }
  },

  _updateMode: function(callback) {
    var mode = this.currentMode;
    var playerLoaded = (typeof PlayerView != 'undefined');

    this.updateTitle();
    this.updateBackArrow();

    if (mode === MODE_PLAYER) {
      // Here if Player is not loaded yet and we are going to play
      // load player_view.js then we can use the PlayerView object
      document.getElementById('views-player').classList.remove('hidden');
      LazyLoader.load('js/ui/views/player_view.js', function() {
        if (!playerLoaded) {
          PlayerView.init();
          PlayerView.setOptions(App.playerSettings);
        }

        // Music only share the playing file when it's in player mode.
        this._enableNFCSharing(true);

        if (callback) {
          callback();
        }
      }.bind(this));
    } else {
      if (mode === MODE_LIST || mode === MODE_PICKER) {
        document.getElementById('views-list').classList.remove('hidden');
      } else if (mode === MODE_SUBLIST) {
        document.getElementById('views-sublist').classList.remove('hidden');
      } else if (mode === MODE_SEARCH_FROM_TILES ||
                 mode === MODE_SEARCH_FROM_LIST) {
        document.getElementById('search').classList.remove('hidden');
        // XXX Please see Bug 857674 and Bug 886254 for detail.
        // There is some unwanted logic that will automatically adjust
        // the input element(search box) while users input characters
        // This only happens on sublist and player views show up,
        // so we just hide sublist and player when we are in search mode.
        document.getElementById('views-sublist').classList.add('hidden');
        document.getElementById('views-player').classList.add('hidden');
      }

      // Disable the NFC sharing when it's in the other modes.
      this._enableNFCSharing(false);

      if (callback) {
        callback();
      }
    }

    // We have to show the done button when we are in picker mode
    // and previewing the selecting song
    if (App.pendingPick) {
      document.getElementById('title-done').hidden = (mode !== MODE_PLAYER);
    }

    // Remove all mode classes before applying a new one
    var modeClasses = ['tiles-mode', 'list-mode', 'sublist-mode', 'player-mode',
                       'search-from-tiles-mode', 'search-from-list-mode',
                       'picker-mode'];

    modeClasses.forEach(function resetMode(targetClass) {
      document.body.classList.remove(targetClass);
    });

    document.body.classList.add(modeClasses[mode - 1]);
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
