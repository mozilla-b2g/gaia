/* global DsdsSettings */

define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var CallBarring = require('panels/call_barring/call_barring');

  return function ctor_call_barring() {
    var _callBarring = CallBarring();
    var _options = {
      mobileConnection: null,
      voiceServiceClassMask: null
    };
    var refresh;

    function refresh_on_load(e) {
      // Refresh when:
      //  - we load the panel from #call
      //  - we re-load the panel after hide (screen off or change app)
      // But NOT when:
      //  - we come back from changing the password
      if (e.detail.current === '#call-cbSettings' &&
          e.detail.previous === '#call-cb-passcode') {
            refresh = false;
      }
    }

    return SettingsPanel({
      onInit: function cb_onInit(panel) {
        this._panel = panel;

        _options.mobileConnection = window.navigator.mozMobileConnections[
          DsdsSettings.getIccCardIndexForCallSettings()
        ];
        _options.voiceServiceClassMask =
          _options.mobileConnection.ICC_SERVICE_CLASS_VOICE;

        _callBarring.init(_options);
      },

      onBeforeShow: function cb_onBeforeShow() {
        refresh = true;
        window.addEventListener('panelready', refresh_on_load);
      },

      onShow: function cb_onShow() {
        if (refresh) {
          _callBarring.refresh();
        }
      },

      onHide: function cb_onHide() {
        window.removeEventListener('panelready', refresh_on_load);
      }

    });
  };
});
