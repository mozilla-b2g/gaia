/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var HotspotWifiSettings = {
  init: function hws_init() {
    this.initWifiSettingDialog();
  },

  initWifiSettingDialog: function() {
    var settings = window.navigator.mozSettings;

    var wifiSettingsSection = document.getElementById('hotspot-wifiSettings');
    var securityTypeSelector =
        wifiSettingsSection.querySelector('.security-selector');
    var passwordItem = wifiSettingsSection.querySelector('.password');
    var passwordInput = passwordItem.querySelector('input[name="password"]');
    var submitBtn = wifiSettingsSection.querySelector('button[type="submit"]');

    var showPassword =
        passwordItem.querySelector('input[name="show_password"]');
    showPassword.checked = false;
    showPassword.onchange = function() {
      passwordInput.type = this.checked ? 'text' : 'password';
    };

    function updatePasswordItemVisibility(securityType) {
      passwordItem.hidden = (securityType === 'open');
    }

    function updateSubmitButtonState(securityType, pwdLength) {
      submitBtn.disabled =
        (pwdLength < 8 || pwdLength > 63) && (securityType !== 'open');
    }

    securityTypeSelector.addEventListener('change', function(event) {
      updatePasswordItemVisibility(this.value);
      updateSubmitButtonState(this.value, passwordInput.value.length);
    });

    passwordInput.addEventListener('input', function(event) {
      updateSubmitButtonState(securityTypeSelector.value, this.value.length);
    });
  }
};

navigator.mozL10n.ready(HotspotWifiSettings.init.bind(HotspotWifiSettings));
