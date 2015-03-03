/* exported AudioCompetingHelper */

/* globals AudioContext */

(function(exports) {
  'use strict';

  /** AudioContext object reference. */
  var _ac = null;

  /** Buffer source we use for competing for the content audio channel. */
  var _silenceBufferSource = null;

  /** Array of listener function to be called once the app is muted/unmute. */
  var _listeners = {};

  var _audioChannels = [
    'normal',
    'content',
    'notification',
    'alarm',
    'ringer',
    'telephony',
    'publicnotification'
  ];

  /**
   * The AudioCompetingHelper singleton object helps the app to compete for
   * the required audio channel.
   * This helper class is used in Firefox Hello and it has
   * been tested successfully.
   */
  var AudioCompetingHelper = {
    init: function ach_init(type) {
      if (_audioChannels.indexOf(type) === -1) {
        throw new Error('Unable to create AudioContext, required type unkown');
      }

      _ac = new AudioContext(type);
    },

    /**
     * Request the helper to start competing for the use of the required audio
     * channel.
     */
    compete: function ach_compete() {
      if (!_ac) {
        return;
      }

      _silenceBufferSource = _ac.createBufferSource();
      _silenceBufferSource.buffer = _ac.createBuffer(1, 2048, _ac.sampleRate);
      _silenceBufferSource.connect(_ac.destination);
      _silenceBufferSource.loop = true;

      _silenceBufferSource.start(0);
    },

    /**
     * Request the helper to leave the competition for the use of the required
     * audio channel.
     */
    leaveCompetition: function ach_leaveCompetition(listener) {
      if (!_silenceBufferSource) {
        return;
      }
      _silenceBufferSource.stop(0);

      this.clearListeners(listener);
    },

    /**
     * Register the specified listener on the audio competing helper.
     *
     * @param {String} type A string representing the event type to listen for.
     * @param {Function} listener The function that receives a notification when
     *                            an event of the specified type occurs.
     */
    addListener: function ach_addListener(type, listener) {
      if ((type !== 'mozinterruptbegin') &&
          (type !== 'mozinterruptend')) {
        throw new Error('Unable to add the listener function');
      }

      if (!_listeners[type]) {
        _listeners[type] = [];
      }

      if (_listeners[type].indexOf(listener) == -1) {
        _listeners[type].push(listener);
        _ac.addEventListener(type, listener);
      }
    },

    /**
     * Clear the event listeners previously registered with
     * AudioCompetingHelper.addListener.
     */
    clearListeners: function ach_clearListeners(listener) {
      Object.keys(_listeners).forEach(function(type) {
        if (listener) {
          var index = _listeners[type].indexOf(listener);
          if (index != -1) {
            _ac.removeEventListener(type, _listeners[type][index]);
            _listeners[type].splice(index, 1);
          }
          return;
        }
        for (var i = 0, l = _listeners[type].length; i < l; i++) {
          _ac.removeEventListener(type, _listeners[type][i]);
        }
      });
      if (listener) {
        return;
      }
      _listeners = {};
    },

    /**
     * Release audio resources explicitly.
     */
    destroy: function ach_destroy() {
      if (_silenceBufferSource && _silenceBufferSource.buffer) {
        _silenceBufferSource.buffer = null;
      }
      _silenceBufferSource = null;
      _ac = null;
    },

    get audioContext() {
      return _ac;
    }
  };

  exports.AudioCompetingHelper = AudioCompetingHelper;
})(this);