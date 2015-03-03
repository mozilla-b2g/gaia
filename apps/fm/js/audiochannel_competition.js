/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* exported AudioChannelCompetition */

/* globals AudioContext */

(function(exports) {
  'use strict';

  var debug = true;

  /** App name competing for the telephony audio channel. */
  var _appName = null;

  /** AudioContext object reference. */
  var _ac = null;

  /** Buffer source we use for competing for the telephony audio channel. */
  var _silenceBufferSource = null;

  /** Object with all handlers to AudioChannels events */
  var _listeners = {};

  function _executeListener(event) {
    var handler = _listeners[event.type];
    handler && handler();
  }

  /**
   * The AudioCompetingHelper singleton object helps the callscreen to compete
   * for the telephony audio channel. After bug 1016277 apps use the telephony
   * audio channel on a LIFO basis which means apps might be muted by other
   * apps trying to use the telephony audio channel.
   */
  var AudioChannelCompetition = {

    on: function(events) {
      debug && console.log('AudioChannelCompetition.on ' + (new Date()).toString());

      Object.getOwnPropertyNames(events).forEach(function(val) {
        _listeners[val] = events[val];
      })
    },

    start: function(channel) {
      debug && console.log('AudioChannelCompetition.start ' + channel);

      if (!channel ||
          typeof channel !== 'string' ||
          channel.length === 0) {
        channel = 'normal';
      }

      if (!_ac) {
        // Let's create the AudioContext using the channel defined as a param.
        // By default we will use the low priority one, in this case 'normal'
        // For more info check [1]
        //
        // [1] https://developer.mozilla.org/en-US/docs/Web/API/AudioChannels_API/
        // Using_the_AudioChannels_API
        _ac = new AudioContext(channel);

        _ac.addEventListener('mozinterruptbegin', _executeListener);
        _ac.addEventListener('mozinterruptend', _executeListener);
      }

      if (!_silenceBufferSource) {
        // After bug [2] AudioContext is started automatically.
        // However, we will keep a buffer in order to stop & resume when requested
        // without creating a new AudioContext
        //
        // [2] https://bugzilla.mozilla.org/show_bug.cgi?id=1041594
        _silenceBufferSource = _ac.createBufferSource();
        _silenceBufferSource.buffer = _ac.createBuffer(1, 2048, _ac.sampleRate);
        _silenceBufferSource.connect(_ac.destination);
        _silenceBufferSource.loop = true;
      }

      // Start the competition!
      _silenceBufferSource.start(0);
    },

    stop: function() {
      debug && console.log('AudioChannelCompetition.stop');
      if (!_silenceBufferSource) {
        return;
      }
      _silenceBufferSource.stop(0);
    },

    resume: function() {
      debug && console.log('AudioChannelCompetition.resume');
      if (!_silenceBufferSource) {
        return;
      }
      _silenceBufferSource.stop(0);
      _silenceBufferSource.start(0);
    },

    leave: function() {
      debug && console.log('AudioChannelCompetition.leave');
      // Stop competing
      if (_silenceBufferSource) {
        _silenceBufferSource.stop(0);
        _silenceBufferSource = null;
      }

      // Remove listeners
      if (_ac) {
        _ac.removeEventListener('mozinterruptbegin', _executeListener);
        _ac.removeEventListener('mozinterruptend', _executeListener);
        // Clean all vars
        _ac = null;
      }

      _listeners = {};
    }
  };

  exports.AudioChannelCompetition = AudioChannelCompetition;
})(this);
