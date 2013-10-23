/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var Hotspot = {
  init: function hotspot_init() {
    this.initHotspotPanel();
  },

  initHotspotPanel: function() {
    var settings = window.navigator.mozSettings;
    var hotspotSettingBtn =
      document.querySelector('#hotspot-settings-section button');
    var passwordItem = document.querySelector('#hotspot .password-item');

    function setHotspotSettingsEnabled(enabled) {
      // disable the setting button when internet sharing is enabled
      hotspotSettingBtn.disabled = enabled;
    }
    function updatePasswordItemVisibility(securityType) {
      passwordItem.hidden = (securityType == 'open');
    }

    // tethering enabled
    settings.addObserver('tethering.wifi.enabled', function(event) {
      setHotspotSettingsEnabled(event.settingValue);
    });

    var reqTetheringWifiEnabled =
      settings.createLock().get('tethering.wifi.enabled');

    reqTetheringWifiEnabled.onsuccess = function dt_getStatusSuccess() {
      setHotspotSettingsEnabled(
        reqTetheringWifiEnabled.result['tethering.wifi.enabled']
      );
    };

    // security type
    settings.addObserver('tethering.wifi.security.type', function(event) {
      updatePasswordItemVisibility(event.settingValue);
    });

    var reqSecurityType =
      settings.createLock().get('tethering.wifi.security.type');

    reqSecurityType.onsuccess = function dt_getStatusSuccess() {
      updatePasswordItemVisibility(
        reqSecurityType.result['tethering.wifi.security.type']
      );
    };

    hotspotSettingBtn.addEventListener('click',
      this.openWifiSettingDialog.bind(this));
  },

  openWifiSettingDialog: function() {
    var settings = window.navigator.mozSettings;

    var dialogID = 'hotspot-wifiSettings';
    var dialog = document.getElementById(dialogID);

    function updatePasswordItemVisibility(securityType) {
      var passwordItem = dialog.querySelector('.password');
      var passwordInput = passwordItem.querySelector('input[name="password"]');
      var showPassword =
          passwordItem.querySelector('input[name="show_password"]');

      passwordItem.hidden = (securityType == 'open');
      showPassword.checked = false;
      passwordInput.type = 'password';
    }

    // initialize all setting fields in the panel
    function reset() {
      if (settings) {

        var fields =
          dialog.querySelectorAll('[data-setting]:not([data-ignore])');
        var securityTypeSelector = dialog.querySelector('.security-selector');

        var reqSecurityType =
          settings.createLock().get('tethering.wifi.security.type');

        reqSecurityType.onsuccess = function dt_getStatusSuccess() {
          updatePasswordItemVisibility(
            reqSecurityType.result['tethering.wifi.security.type']
          );
        };

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
      }
    }

    // validate all settings in the dialog box
    function submit() {
      if (settings) {
        var fields =
          dialog.querySelectorAll('[data-setting]:not([data-ignore])');
        var securityTypeSelector = dialog.querySelector('.security-selector');
        var tethering_ssid_element = '[data-setting="tethering.wifi.ssid"]';
        var tethering_password = 'tethering.wifi.security.password';
        var tethering_ssid = dialog.querySelector(tethering_ssid_element);

        // ensure SSID is set
        if (/^\s*$/.test(tethering_ssid.value)) {
          var _ = navigator.mozL10n.get;
          alert(_('SSIDCannotBeEmpty'));
          reset(); // Reset to original values if ssid is null.
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
    }

    openDialog(dialogID, submit);
    reset(); // preset fields after loading the panel
  }
};

navigator.mozL10n.ready(Hotspot.init.bind(Hotspot));

