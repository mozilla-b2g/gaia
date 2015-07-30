define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var SimCardManager = require('panels/simcard_manager/simcard_manager');

  return function ctor_sim_manager_panel() {
    return SettingsPanel({
      onInit: function(panel) {
        var simcardManager = new SimCardManager({
          simCardContainer: panel.querySelector('.sim-card-container'),
          simSettingsHeader:
            panel.querySelector('.sim-manager-settings-header'),
          simSettingsList: panel.querySelector('.sim-manager-select-list'),
          outgoingCallSelect:
            panel.querySelector('.sim-manager-outgoing-call-select'),
          outgoingMessagesSelect:
            panel.querySelector('.sim-manager-outgoing-messages-select'),
          outgoingDataSelect:
            panel.querySelector('.sim-manager-outgoing-data-select'),
        });
        simcardManager.init();
      }
    });
  };
});
