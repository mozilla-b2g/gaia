/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* exported AudioCompetingHelper */

/* globals AudioContext */

(function(exports) {
  'use strict';

  /** App name competing for the telephony audio channel. */
  var _appName = null;

  /** AudioContext object reference. */
  var _ac = null;

  /** Buffer source we use for competing for the telephony audio channel. */
  var _silenceBufferSource = null;

  /** onmozinterruptbegin event handler reference. */
  var _onmozinterruptbegin = null;

  /** _onmozinterruptend event handler reference*/
  var _onmozinterruptend = null;

  /** Array of listener function to be called once the app is muted/unmute. */
  var _listeners = {
    mozinterruptbegin: [],
    mozinterruptend: []
  };

  /** Flag */
  var _addListenersBeforeCompeting = true;

  /**
   * Fire the given event on the audio competing helper.
   *
   * @param {String} type A string representing the event type being fired.
   */
  function _fireEvent(type) {
    if (!_listeners[type]) {
      return;
    }

    for (var i = 0; i <_listeners[type].length; i++) {
      if(_listeners[type][i] && (typeof _listeners[type][i] === 'function')) {
        _listeners[type][i].call(null);
      }
    }
  }

  /**
   * The AudioCompetingHelper singleton object helps the callscreen to compete
   * for the telephony audio channel. After bug 1016277 apps use the telephony
   * audio channel on a LIFO basis which means apps might be muted by other
   * apps trying to use the telephony audio channel.
   */
  var AudioCompetingHelper = {
    /**
     * Init function.
     */
    init: function ach_init(appName) {
      _appName = appName;
    },

    /**
     * Request the helper to start competing for the use of the telephony audio
     * channel.
     */
    compete: function ach_compete() {
      _ac = new AudioContext('telephony');

      _silenceBufferSource = _ac.createBufferSource();
      _silenceBufferSource.buffer = _ac.createBuffer(1, 2048, _ac.sampleRate);
      _silenceBufferSource.connect(_ac.destination);
      _silenceBufferSource.loop = true;

      if (_addListenersBeforeCompeting) {
        _onmozinterruptbegin = _fireEvent.bind(null, 'mozinterruptbegin');
        _ac.addEventListener('mozinterruptbegin', _onmozinterruptbegin);
        _onmozinterruptend = _fireEvent.bind(null, 'mozinterruptend');
        _ac.addEventListener('mozinterruptend', _onmozinterruptend);
        _addListenersBeforeCompeting = false;
      }

      _silenceBufferSource.start(0);
    },

    /**
     * Request the helper to leave the competition for the use of the telephony
     * audio channel.
     */
    leaveCompetition: function ach_leaveCompetition() {
      if (!_silenceBufferSource) {
        return;
      }
      _silenceBufferSource.stop(0);
      _ac.removeEventListener('mozinterruptbegin', _onmozinterruptbegin);
      _ac.removeEventListener('mozinterruptend', _onmozinterruptend);
      _addListenersBeforeCompeting = true;
      _silenceBufferSource.buffer = null;
      _silenceBufferSource = null;
      _ac = null;
    },

    /**
     * Register the specified listener on the audio competing helper.
     *
     * @param {String} type A string representing the event type to listen for.
     * @param {Function} listener The function that receives a notification when
     *                            an event of the specified type occurs.
     */
    addListener: function ach_addEventListener(type, listener) {
      if ((type !== 'mozinterruptbegin') && (type !== 'mozinterruptend') ) {
        // TODO: Should we throw an exception?
        return;
      }
      if (listener && (typeof listener !== 'function')) {
        // TODO: Should we throw an exception?
        return;
      }
      _listeners[type].push(listener);
    },

    /**
     * Clear the event listeners previously registered with
     * AudioCompetingHelper.addEventListener.
     *
     * @param {String} type A string representing the event type being removed.
     */
    clearListeners: function ach_clearListeners(type) {
      if (type) {
        _listeners[type] = [];
        return;
      }
      _listeners.mozinterruptbegin = [];
      _listeners.mozinterruptend = [];
    },

    /**
     * Getter function.
     */
    get audioContext() {
      return _ac;
    }
  };

  exports.AudioCompetingHelper = AudioCompetingHelper;
})(this);
