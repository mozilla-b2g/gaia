define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var DsdsSettings = require('dsds_settings');
  // Models
  var PanelModel = require('panels/operator_settings/models/panel_model');
  var NetworkTypeManager =
  require('panels/operator_settings/models/network_type_manager');
  var RoamingPreferenceManager =
    require('panels/operator_settings/models/roaming_preference_manager');
  var OperatorManager =
    require('panels/operator_settings/models/operator_manager');
  // Views
  var NetworkTypeSelector =
    require('panels/operator_settings/views/network_type_selector');
  var RoamingPreferenceSelector =
    require('panels/operator_settings/views/roaming_preference_selector');
  var AutoSelectionCheckbox =
    require('panels/operator_settings/views/auto_selection_checkbox');
  var AvailableOperatorList =
    require('panels/operator_settings/views/available_operator_list');

  return function() {
    return SettingsPanel({
      onInit: function(panel) {
        this._panel = panel;
        this._elements = {
          header: panel.querySelector('gaia-header'),
          networkTypeSelector:
            panel.querySelector('.preferred-network-type select'),
          roamingPreferenceMenuItem:
            panel.querySelector('.operator-roaming-preference'),
          roamingPreferenceSelector:
            panel.querySelector('.operator-roaming-preference select'),
          autoSelectionMenuItem: panel.querySelector('.auto-select'),
          autoSelectionCheckbox: panel.querySelector(
            '.auto-select gaia-switch'),
          availableOperators: panel.querySelector('.available-operators')
        };

        if (navigator.mozMobileConnections.length > 1) {
          this._elements.header.dataset.href = '#carrier-detail';
        } else {
          this._elements.header.dataset.href = '#carrier';
        }

        // Create the view modules for each part.
        this._networkTypeSelector =
          NetworkTypeSelector(this._elements.networkTypeSelector);
        this._roamingPreferenceSelector =
          RoamingPreferenceSelector(this._elements.roamingPreferenceSelector);
        this._autoSelectionCheckbox =
          AutoSelectionCheckbox(this._elements.autoSelectionCheckbox);
        this._availableOperatorList =
          AvailableOperatorList(this._elements.availableOperators);

        this._boundOnConnectingModeChange =
          this._onConnectingModeChange.bind(this);
      },
      onBeforeShow: function(panel) {
        var serviceId = DsdsSettings.getIccCardIndexForCellAndDataSettings();

        var panelModel = this._getInstance(PanelModel, serviceId);
        var operatorManager = this._getInstance(OperatorManager, serviceId);
        var roamingPreferenceManager =
          this._getInstance(RoamingPreferenceManager, serviceId);
        var networkTypeManager =
          this._getInstance(NetworkTypeManager, serviceId);

        // When auto selection state changes, we need to update the visibility
        // of the selectors of preferred network types and roaming preferences.
        this._setPanelModel(panelModel);

        // Link the manager corresponding to the current mobile connection to
        // the view modules.
        this._availableOperatorList.init(operatorManager);
        this._roamingPreferenceSelector.init(roamingPreferenceManager);
        this._autoSelectionCheckbox.init(operatorManager);
        // init of this._networkTypeSelector returns a promise.
        return this._networkTypeSelector.init(networkTypeManager);
      },
      onHide: function() {
        this._setPanelModel(null);

        this._networkTypeSelector.uninit();
        this._roamingPreferenceSelector.uninit();
        this._autoSelectionCheckbox.uninit();
        this._availableOperatorList.uninit();
      },
      /**
       * Returns the instance of ctor corrsponding to serviceId
       *
       * @params {Function} ctor
       *                    A constructor.
       * @params {Number} serviceId
       * @returns {Object}
       */
      _getInstance: function(ctor, serviceId) {
        if (!this._instances) {
          this._instances = new Map();
        }

        if (!this._instances.has(ctor)) {
          this._instances.set(ctor, {});
        }

        // Only create one instance per a service id.
        var instance = this._instances.get(ctor)[serviceId];
        if (!instance) {
          var conn = navigator.mozMobileConnections[serviceId];
          instance = ctor(conn);
          this._instances.get(ctor)[serviceId] = instance;
        }
        return instance;
      },
      _setPanelModel: function(panelModel) {
        if (this._panelModel) {
          this._panelModel.unobserve('connectingMode',
            this._boundOnConnectingModeChange);
        }

        this._panelModel = panelModel;

        if (this._panelModel) {
          this._panelModel = panelModel;
          panelModel.observe('connectingMode',
            this._boundOnConnectingModeChange);
          this._onConnectingModeChange(panelModel.connectingMode);
        }
      },
      _onConnectingModeChange: function(mode) {
        // Roaming preference is only available on CDMA devices and operator
        // selection is only availabe on GSM devices. For world phones we update
        // the visibility of the items based on the current connecting mode.
        this._elements.roamingPreferenceMenuItem.hidden = (mode !== 'cdma');
        this._elements.autoSelectionMenuItem.hidden =
          this._elements.availableOperators.hidden = (mode !== 'gsm');
      }
    });
  };
});
