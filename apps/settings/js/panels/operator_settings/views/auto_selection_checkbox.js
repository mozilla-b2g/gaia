define(function(require) {
  'use strict';

  var Module = require('modules/base/module');
  var OperatorManager =
    require('panels/operator_settings/models/operator_manager');

  var AutoSelectionCheckbox =
    Module.create(function AutoSelectionCheckbox(root) {
      this._root = root;
      this._manager = null;
      
      this._root.addEventListener('change', () => {
        this._manager.setAutoSelection(this._root.checked);
      });
      this._boundUpdate = this._update.bind(this); 
  });

  AutoSelectionCheckbox.prototype._update = function(state) {
    this._root.checked =
      state === OperatorManager.AUTO_SELECTION_STATE.ENABLED ||
      state === OperatorManager.AUTO_SELECTION_STATE.ENABLING;
  };

  AutoSelectionCheckbox.prototype.init = function(manager) {
    this._manager = manager;
    if (!this._manager) {
      return;
    }
    this._manager.observe('autoSelectionState', this._boundUpdate);
    this._boundUpdate(this._manager.autoSelectionState);
  };

  AutoSelectionCheckbox.prototype.uninit = function() {
    if (!this._manager) {
      return;
    }
    this._manager.unobserve('autoSelectionState', this._boundUpdate);
    this._manager = null;
  };

  return AutoSelectionCheckbox;
});
