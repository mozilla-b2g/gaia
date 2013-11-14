/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var HotspotWifiSettings = {
  init: function() {
    this.dialog = document.getElementById('hotspot-wifiSettings');
    this.initWifiSettingDialog();
    this.reset(); // preset fields after loading the panel
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

    function updateSubmitButtonState(securityType, pwdLength) {
      submitBtn.disabled =
        (pwdLength < 8 || pwdLength > 63) && (securityType !== 'open');
    }

    securityTypeSelector.addEventListener('change', function(event) {
      this.updatePasswordItemVisibility(event.target.value);
      updateSubmitButtonState(event.target.value, passwordInput.value.length);
    }.bind(this));

    passwordInput.type = 'password';
    passwordInput.addEventListener('input', function(event) {
      updateSubmitButtonState(securityTypeSelector.value, this.value.length);
    });

    submitBtn.addEventListener('click', function onsubmit(e) {
      e.preventDefault();
      this.submit();
      Settings.currentPanel = 'hotspot';
    }.bind(this));

    window.addEventListener('panelready', function(e) {
      if (e.detail.current === '#hotspot-wifiSettings') {
        HotspotWifiSettings.reset();
      }
    });
  },

  updatePasswordItemVisibility: function(securityType) {
    var passwordItem = this.dialog.querySelector('.password');
    passwordItem.hidden = (securityType == 'open');
  },

  // initialize all setting fields in the panel
  reset: function() {
    var settings = window.navigator.mozSettings;
    var fields =
      this.dialog.querySelectorAll('[data-setting]:not([data-ignore])');

    var reqSecurityType =
      settings.createLock().get('tethering.wifi.security.type');

    reqSecurityType.onsuccess = (function dt_getStatusSuccess() {
      this.updatePasswordItemVisibility(
        reqSecurityType.result['tethering.wifi.security.type']
      );
    }).bind(this);

    var lock = settings.createLock();
    for (var i = 0; i < fields.length; i++) {
      (function(input) {
        var key = input.dataset.setting;
        var request = lock.get(key);
        request.onsuccess = function() {
          input.value = request.result[key] || '';

          // dispatch the event manually for select element
          if (input.nodeName === 'SELECT') {
            var evt = document.createEvent('Event');
            evt.initEvent('change', true, true);
            input.dispatchEvent(evt);
          }
        };
      })(fields[i]);
    }
  },

  // validate all settings in the dialog box
  submit: function() {
    var settings = window.navigator.mozSettings;
    var fields =
      this.dialog.querySelectorAll('[data-setting]:not([data-ignore])');
    var securityTypeSelector = this.dialog.querySelector('.security-selector');
    var tethering_ssid_element = '[data-setting="tethering.wifi.ssid"]';
    var tethering_password = 'tethering.wifi.security.password';
    var tethering_ssid = this.dialog.querySelector(tethering_ssid_element);

    // ensure SSID is set
    if (/^\s*$/.test(tethering_ssid.value)) {
      var _ = navigator.mozL10n.get;
      alert(_('SSIDCannotBeEmpty'));
      this.reset(); // Reset to original values if ssid is null.
    } else {
      var ignorePassword = (securityTypeSelector.value == 'open');

      // mozSettings does not support multiple keys in the cset object
      // with one set() call,
      // see https://bugzilla.mozilla.org/show_bug.cgi?id=779381
      var lock = settings.createLock();
      for (var i = 0; i < fields.length; i++) {
        var input = fields[i];
        var cset = {};
        var key = input.dataset.setting;

        if (!(ignorePassword && key == tethering_password)) {
          cset[key] = input.value;
          lock.set(cset);
        }
      }
    }
  }
};

navigator.mozL10n.ready(HotspotWifiSettings.init.bind(HotspotWifiSettings));
