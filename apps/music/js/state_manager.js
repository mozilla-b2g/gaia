/*
 * This is the State Manager of the music app, it stores the states for
 * restoring itself from the crash which triggered by the telephony, e.g.
 * the incoming call mostly.
 *
 * And every time the music app launches, the State Manager will check the last
 * state in the mozSettings, it's set by the Media App Agent in the system app.
 * The key is "music.isKilledByTelephony" and the value represent the killed
 * position. Once the State Manager found the value is positive, then music app
 * is killed due to the incoming call, so the State Manager will try to restore
 * to the state before the crash.
 */

'use strict';

var LAST_STATE_KEY = 'last_state_key';

var StateManager = {
  init: function() {
    // The value of isKilledByTelephony represent the killed position.
    this.isKilledByTelephony = -1;
  },

  checkToRestore: function() {
    var lock = navigator.mozSettings.createLock();
    var request = lock.get('music.isKilledByTelephony');

    request.onsuccess = (function() {
      this.isKilledByTelephony = request.result['music.isKilledByTelephony'];

      if (this.isKilledByTelephony > -1) {
        this.resetSettings(function() {
          StateManager.restore();
        });
      } else {
        this.resetSettings();
      }
    }.bind(this));

    request.onerror = (function() {
      this.resetSettings();
    }.bind(this));
  },

  resetSettings: function(callback) {
    var settings = {
      'music.isKilledByTelephony': -1
    };
    var lock = navigator.mozSettings.createLock();
    var result = lock.set(settings);

    result.onsuccess = function() {
      if (callback)
        callback();
    };

    result.onerror = function() {
      console.error('Reset music.isKilledByTelephony failed!');
    };
  },

  save: function() {
    var state = {
      modeStack: ModeManager._modeStack,
      tabOption: TabBar.option,
      listInfo: ListView.info,
      subListInfo: SubListView.info,
      sourceType: PlayerView.sourceType,
      dataSource: PlayerView.dataSource,
      shuffledList: PlayerView.shuffledList,
      shuffleIndex: PlayerView.shuffleIndex,
      lastIndex: PlayerView.currentIndex,
      DBInfo: PlayerView.DBInfo
    };

    asyncStorage.setItem(LAST_STATE_KEY, state);
  },

  restore: function() {
    asyncStorage.getItem(LAST_STATE_KEY, function(state) {
      if (state) {
        this._constructUI(state);
      }
    }.bind(this));
  },

  _constructUI: function(state) {
    // Since music app is just restored from the crash, we should already have
    // the knownSongs from the MediaDB, and to avoid the overlay display wrong,
    // we simply set the length to 1 which means the MediaDB is not empty.
    knownSongs.length = 1;

    state.modeStack.forEach(function(mode, index) {
      if (index === 0) {
        ModeManager.start(mode);
      } else {
        ModeManager.push(mode);
      }
    });

    this._renderTab(state.tabOption);
    this._renderListView(state.listInfo);
    this._renderSubListView(state.subListInfo);
    this._renderPlayerView(state);
  },

  _renderTab: function(option) {
    var optionsTable = {
      'mix': 'mix',
      'playlist': 'playlists',
      'artist': 'artists',
      'album': 'albums',
      'title' : 'songs'
    };

    window.location.hash = '#' + optionsTable[option];
    TabBar.option = option;
  },

  _renderListView: function(info) {
    ListView.activate(info);

    if (!info) {
      TabBar.playlistArray.forEach(function(playlist) {
        ListView.update('playlist', playlist);
      });
    }
  },

  _renderSubListView: function(info) {
    if (info) {
      SubListView.activate(
        info.option, info.data, info.index, info.keyRange, info.direction
      );
    }
  },

  _renderPlayerView: function(state) {
    var playerLoaded = (typeof PlayerView !== 'undefined');

    LazyLoader.load('js/Player.js', function() {
      if (!playerLoaded) {
        PlayerView.init();
        PlayerView.setOptions(playerSettings);
      }

      if (state.DBInfo) {
        PlayerView.setDBInfo(state.DBInfo);
      }

      PlayerView.setSourceType(state.sourceType);
      PlayerView.dataSource = state.dataSource;
      PlayerView.shuffledList = state.shuffledList;
      PlayerView.shuffleIndex = state.shuffleIndex;
      PlayerView.play(state.lastIndex);

      // After canplay event fires we are able to set currentTime to the audio.
      // Also mute the audio because we don't want the sound to be heard before
      // the seek finished.
      PlayerView.audio.muted = true;
      PlayerView.audio.addEventListener(
        'canplay', StateManager._setLastCurrentTime
      );
    }.bind(this));
  },

  _setLastCurrentTime: function() {
    PlayerView.audio.removeEventListener(
      'canplay', StateManager._setLastCurrentTime
    );

    PlayerView.audio.currentTime = StateManager.isKilledByTelephony;
    PlayerView.audio.muted = false;
  }
};

StateManager.init();
