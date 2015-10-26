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
    },
    getAddonTargets: function() {
      return Promise.resolve();
    },
    canDelete: function(addon) {
      return addon.instance.removable === true;
    }
  };

  return AddonManager;
});
