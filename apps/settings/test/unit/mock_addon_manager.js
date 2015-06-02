define(function() {
  'use strict';

  function MockObservableArray() {
    return {
      array: []
    };
  }

  var AddonManager = {
    _addons: MockObservableArray(),
    get addons() {
      return this._addons;
    }
  };

  return AddonManager;
});
