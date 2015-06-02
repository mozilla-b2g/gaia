(function(exports) {
  'use strict';

  function MockCardManager() {
    this.init = function() {
      return {
        then: function(callback) {}
      };
    };

    var callbacks = {};
    this.on = function(name, callback) {
      callbacks[name] = callback;
    };

    this.mTriggerChange = function(name) {
      if (callbacks[name]) {
        callbacks[name]();
      }
    };

    this.getCardList = function() {
      return {
        then: function(callback) {
          if (this.cards) {
            callback(this.cards);
          }
        }.bind(this)
      };
    };
  }

  exports.MockCardManager = MockCardManager;
}(window));
