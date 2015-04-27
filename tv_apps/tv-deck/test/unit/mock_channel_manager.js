(function(exports) {
  'use strict';

  function MockChannelManager() {
    var handler = {};
    var fetchCallback;

    this.isReady = true;
    this.playingState = {};

    this.getTuner = function() {};

    this.getSource = function() {};

    this.getChannel = function() {};

    this.scanTuners = function() {};

    this.scanSources = function() {};

    this.scanChannels = function() {};

    this.updatePinButton = function() {};

    this.switchChannel = function() {};

    this.setPlayingSource = function(callback) {
      if (callback) {
        callback();
      }
    };

    this.fetchSettingFromHash = function() {
      return {
        then: function(callback) {
          fetchCallback = callback;
        }
      };
    };

    this.mTriggerFetch = function() {
      if (fetchCallback) {
        fetchCallback();
      }
    };

    this.on = function(evt, fn) {
      if (!handler[evt]) {
        handler[evt] = [];
      }
      handler[evt].push(fn);
    };

    this.mTrigger = function(evt) {
      handler[evt].forEach(function(fn) {
        fn();
      });
    };
  }

  exports.MockChannelManager = MockChannelManager;
}(window));
