'use strict';

(function(exports) {
  function MockAudioChannelController(app, audioChannel) {
    this.app = app;
    this.name = audioChannel.name;
    this.instanceID = this.app.instanceID + '_' + this.name;
    this._policy = {};
  }

  MockAudioChannelController.prototype = {
    isActive: function() {},
    isPlaying: function() {},
    isFadingOut: function() {},
    setPolicy: function(policy) {
      this._policy = policy;
      return this;
    },
    getPolicy: function() {
      return this._policy;
    },
    proceedPolicy: function() {
      return this;
    },
    destroy: function() {}
  };

  exports.MockAudioChannelController = MockAudioChannelController;
}(window));
