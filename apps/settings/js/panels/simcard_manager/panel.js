define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var SimCardManager = require('panels/simcard_manager/simcard_manager');

  return function ctor_sim_manager_panel() {
    return SettingsPanel({
      onInit: function(panel) {
        var simcardManager = new SimCardManager({
          simCardContainer: panel.querySelector('.sim-card-container'),
          simCardTmpl: panel.querySelector('.sim-card-tmpl'),
          securityEntry: panel.querySelector('.sim-manager-security-entry'),
          securityDesc: panel.querySelector('.sim-manager-security-desc'),
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
