define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');

  return function ctor_wifiEnterCertificateNickname() {
    var elements = {};

    return SettingsPanel({
      onInit: function(panel) {
        elements.panel = panel;
        elements.nicknameInput =
          panel.querySelector('.certificate-file-nickname');
      },
      onBeforeShow: function(panel, options) {
        elements.nicknameInput.value = options.certificateName;
      }
    });
  };
});
