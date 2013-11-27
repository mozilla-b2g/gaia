'use strict';

var MockSimSettingsHelper = {
  _getOption: null,
  _defaultCards: {
    outgoingCall: 0,
    outgoingMessages: 1,
    outgoingData: 0
  },
  getCardIndexFrom: function() {

  },
  get: function(option) {
    // we will cache our option in _getOption to for later test
    // to make sure we get from right option
    this._getOption = option;
    return this;
  },
  onWhichCard: function(callback) {
    var self = this;
    setTimeout(function() {
      var defaultCardIndex = self._defaultCards[self._getOption];
      callback(defaultCardIndex);
    });
  },
  getFromSettingsDB: function() { },
  // --
  setServiceOnCard: function() { },
  set: function() { },
  on: function() { },
  setToSettingsDB: function() { }
};
