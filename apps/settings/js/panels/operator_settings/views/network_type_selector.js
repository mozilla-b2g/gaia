define(function(require) {
  'use strict';

  var DialogService = require('modules/dialog_service');
  var Module = require('modules/base/module');
  var CustomizedNetworkTypeMap = require('modules/customized_network_type_map');
  var ListView = require('modules/mvvm/list_view');
  var NetworkTypeItemTemplate =
    require('panels/operator_settings/views/network_type_item_template');

  var NetworkTypeSelector = Module.create(function NetworkTypeSelector(root) {
    this._root = root;
    this._manager = null;
    this._customizedNetworkTypeMap = null;
    this._networkTypeMap = null;

    var networkTypeItemTemplate =
      NetworkTypeItemTemplate(this._getTextInfoForNetworkType.bind(this));

    this._networkTypeOptions =
      ListView(this._root, null, networkTypeItemTemplate);
    
    this._root.addEventListener('blur', () => {
      this._manager.setPreferredNetworkType(this._root.value).catch(() => {
        DialogService.alert('preferredNetworkTypeAlertErrorMessage', {
          title: 'preferredNetworkTypeAlertTitle'
        });
      });
    });
    this._boundUpdateSelector = this._updateSelector.bind(this);
  });

  NetworkTypeSelector.prototype._getTextInfoForNetworkType = function(type) {
    if (this._customizedNetworkTypeMap &&
        type in this._customizedNetworkTypeMap) {
      return {
        text: this._customizedNetworkTypeMap[type]
      };
    } else if (this._networkTypeMap) {
      return {
        l10nId: this._networkTypeMap(type)
      };
    } else {
      return type;
    }
  };

  NetworkTypeSelector.prototype._updateSelector = function(type) {
    this._root.value = type;
  };

  NetworkTypeSelector.prototype.init = function(networkTypeManager) {
    this._manager = networkTypeManager;
    if (!this._manager) {
      return;
    }
    
    return CustomizedNetworkTypeMap.get().then((customizedMap) => {
      this._customizedNetworkTypeMap = customizedMap;
    }).then(() => {
      return this._manager.getSupportedNetworkInfo();
    }).then((info) => {
      this._networkTypeMap = info.l10nIdForType;
      this._networkTypeOptions.set(this._manager.networkTypes);
      this._networkTypeOptions.enabled = true;

      // When auto selection state changes, we need to update the visibility of
      // the items.
      this._manager.observe('preferredNetworkType', this._boundUpdateSelector);
      this._updateSelector(this._manager.preferredNetworkType);
    });
  };

  NetworkTypeSelector.prototype.uninit = function() {
    if (!this._manager) {
      return;
    }

    this._manager.unobserve('preferredNetworkType', this._boundUpdateSelector);

    this._networkTypeOptions.set(null);
    this._networkTypeOptions.enabled = false;

    this._manager = null;
  };

  return NetworkTypeSelector;
});
