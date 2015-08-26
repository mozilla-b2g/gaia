/* global asyncStorage, Database */
/* exported PlaybackQueue */
'use strict';

var PlaybackQueue = (function() {

  // The key for storing the repeat and shuffle options.
  var SETTINGS_OPTION_KEY = 'settings_option_key';

  var Repeat = {
    OFF: 0,
    LIST: 1,
    SONG: 2,

    /**
     * Return the "next" repeat setting in its canonical order; OFF -> LIST ->
     * SONG -> OFF.
     *
     * @param {Repeat} val The current value.
     * @return {Repeat} The next value.
     */
    next: function(val) {
      return (val + 1) % 3;
    }
  };

  /**
   * Return a % b, ensuring that the result is always positive.
   *
   * @param {Number} a The dividend.
   * @param {Number} b The divisor.
   * @return {Number} The positive remainder.
   */
  function posmod(a, b) {
    var r = a % b;
    return r < 0 ? r + b : r;
  }

  /**
   * Fill an array with values from 0..n.
   *
   * @param {Number} length The length of the array.
   * @return {Array} The array.
   */
  function fillIndices(length) {
    var indices = new Array(length);
    for (var i = 0; i < length; i++) {
      indices[i] = i;
    }
    return indices;
  }

  /**
   * Shuffle the elements of an array in-place using Yates shuffle. See:
   * <http://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle>.
   *
   * @param {Array} list The array to shuffle.
   */
  function shuffle(list) {
    for (var i = list.length - 1; i >= 1; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      if (j < i) {
        var tmp = list[j];
        list[j] = list[i];
        list[i] = tmp;
      }
    }
  }

  /**
   * The base for playback queue types.
   */
  function BaseQueue() {
    this._index = null;
  }

  BaseQueue.prototype = {
    /**
     * Initialize the playback queue.
     *
     * @param {Number} [index] The index of the queue to start at.
     */
    _init: function(index) {
      if (this.length === 0) {
        throw Error('cannot have an empty queue');
      }
      this._index = index || 0;
      this._shuffle(playbackSettings.shuffle, index !== undefined);
    },

    /**
     * Shuffle or unshuffle the playback queue. If the queue is already
     * shuffled, this will reshuffle it.
     *
     * @param {Boolean} enabled True if the queue should be shuffled, false
     *        otherwise.
     * @param {Boolean} keepIndex True if the current queue index should be
     *        retained, false otherwise.
     */
    _shuffle: function(enabled, keepIndex = true) {
      this._shuffleTime = Date.now();
      if (!enabled) {
        if (keepIndex) {
          this._index = this.index;
        }
        delete this._shuffledList;
        return;
      }

      this._shuffledList = fillIndices(this.length);
      var oldIndex = null;
      if (keepIndex) {
        oldIndex = this._shuffledList.splice(this._index, 1)[0];
        this._index = 0;
      }

      shuffle(this._shuffledList);

      if (keepIndex) {
        this._shuffledList.unshift(oldIndex);
      }
    },

    /**
     * Move the queue's current pointer to the next track.
     *
     * @param {Boolean} automatic True if this action is happening automatically
     *        (i.e. when a track ends).
     */
    next: function(automatic = false) {
      return this.advance(1, automatic);
    },

    /**
     * Move the queue's current pointer to the previous track.
     */
    previous: function() {
      this.advance(-1);
    },

    /**
     * Move the queue's current pointer to another track.
     *
     * @param {Number} offset The offset to move by.
     * @param {Boolean} automatic True if this action is happening automatically
     *        (i.e. when a track ends).
     */
    advance: function(offset, automatic = false) {
      var next;
      var justShuffled = false;

      // If the shuffle setting was changed after we last updated, shuffle
      // (or unshuffle, as necessary).
      if (this._shuffleTime < shuffleTime) {
        this._shuffle(playbackSettings.shuffle);
        justShuffled = true;
      }

      switch (PlaybackQueue.repeat) {
      case Repeat.OFF:
        next = Math.max(this._index + offset, 0);
        break;
      case Repeat.LIST:
        next = posmod(this._index + offset, this.length);
        var cycled = next !== this._index + offset;
        // If we cycled around the list, reshuffle if necessary.
        if (playbackSettings.shuffle && cycled && !justShuffled) {
          this._shuffle(true);
        }
        break;
      case Repeat.SONG:
        next = automatic ? this._index : Math.max(this._index + offset, 0);
        break;
      default:
        throw new Error('unexpected repeat status: ' + this.repeat);
      }

      // If we hit the end, just invalidate the queue and return.
      if (next >= this.length) {
        this._index = null;
        return false;
      }

      this._index = next;
      return true;
    },

    /**
     * Get the index of the current track.
     */
    get index() {
      return this._shuffledList ? this._shuffledList[this._index] : this._index;
    },

    /**
     * Get the raw index of the current track (i.e. don't shuffle the items).
     */
    get rawIndex() {
      return this._index;
    }
  };

  /**
   * A playback queue for statically-defined queues.
   *
   * @param {Array} fileinfos An array of file infos for the tracks.
   * @param {Number} [index] The index of the queue to start at.
   */
  function StaticQueue(fileinfos, index) {
    this._fileinfos = fileinfos;
    this._init(index);
  }

  StaticQueue.prototype = new BaseQueue();

  /**
   * Get the number of tracks in this queue.
   */
  Object.defineProperty(StaticQueue.prototype, 'length', { get: function() {
    return this._fileinfos.length;
  }});

  /**
   * Get the file info for the current track.
   *
   * @return {Promise} A Promise resolving to the file info.
   */
  StaticQueue.prototype.current = function() {
    return Promise.resolve(this._fileinfos[this.index]);
  };

  /**
   * A playback queue for statically-defined queues.
   *
   * @param {Object} query A Database query to run for each track.
   * @param {Number} [index] The index of the queue to start at.
   */
  function DynamicQueue(query, index) {
    this._query = query;
    this._init(index);
  }

  DynamicQueue.prototype = new BaseQueue();

  /**
   * Get the number of tracks in this queue.
   */
  Object.defineProperty(DynamicQueue.prototype, 'length', { get: function() {
    return this._query.count;
  }});

  /**
   * Get the file info for the current track.
   *
   * @return {Promise} A Promise resolving to the file info.
   */
  DynamicQueue.prototype.current = function() {
    var query = this._query;
    return new Promise((resolve, reject) => {
      var handle = Database.advancedEnumerate(
        query.key, query.range, query.direction, this.index, (record) => {
          Database.cancelEnumeration(handle);
          resolve(record);
        }
      );
    });
  };

  var playbackSettings = null;
  var shuffleTime = 0;

  /**
   * Load the persisted settings for queues (repeat and shuffle).
   *
   * @return {Promise} A Promise resolving once the settings have been loaded.
   */
  function loadSettings() {
    return new Promise((resolve, reject) => {
      asyncStorage.getItem(SETTINGS_OPTION_KEY, (settings) => {
        if (settings) {
          playbackSettings = settings;
        } else {
          playbackSettings = {
            repeat: Repeat.OFF,
            shuffle: false
          };
        }
        resolve();
      });
    });
  }

  /**
   * Save the persisted settings for queues (repeat and shuffle).
   *
   * @return {Promise} A Promise resolving once the settings have been saved.
   */
  function saveSettings() {
    return new Promise((resolve, reject) => {
      asyncStorage.setItem(SETTINGS_OPTION_KEY, playbackSettings, () => {
        resolve();
      });
    });
  }

  return {
    StaticQueue: StaticQueue,
    DynamicQueue: DynamicQueue,
    Repeat: Repeat,

    loadSettings: loadSettings,

    get repeat() {
      return playbackSettings.repeat;
    },

    set repeat(val) {
      playbackSettings.repeat = val;
      saveSettings();
      return val;
    },

    get shuffle() {
      return playbackSettings.shuffle;
    },

    set shuffle(val) {
      playbackSettings.shuffle = val;
      shuffleTime = Date.now();
      saveSettings();
      return val;
    },
  };

})();
