define(function(require) {
  'use strict';

  var Module = require('modules/base/module');

  var RoamingPreferenceSelector =
    Module.create(function RoamingPreferenceSelector(root) {
      this._root = root;
      this._manager = null;
      
      this._root.addEventListener('blur', () => {
        this._manager.setRoamingPreference(this._root.value);
      });
      this._boundUpdateSelector = this._updateSelector.bind(this);
  });

  RoamingPreferenceSelector.prototype._updateSelector = function(preference) {
    this._root.value = preference;
  };

  RoamingPreferenceSelector.prototype.init = function(manager) {
    this._manager = manager;
    if (!this._manager) {
      return;
    }
    this._manager.observe('preference', this._boundUpdateSelector);
    this._boundUpdateSelector(this._manager.preference);
  };

  RoamingPreferenceSelector.prototype.uninit = function() {
    if (!this._manager) {
      return;
    }
    this._manager.unobserve('preference', this._boundUpdateSelector);
    this._manager = null;
  };

  return RoamingPreferenceSelector;
});
