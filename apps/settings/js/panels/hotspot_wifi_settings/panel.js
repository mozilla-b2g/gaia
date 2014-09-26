
define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var HotspotContext = require('modules/hotspot_context');

  return function ctor_hotspot_wifi_settings() {
    var elements;

    return SettingsPanel({
      onInit: function(panel) {
        this._tetheringPasswordKey = 'tethering.wifi.security.password';
        this._tetheringSecurityKey = 'tethering.wifi.security.type';

        elements = {
          panel: panel,
          securityTypeSelector: panel.querySelector('.security-selector'),
          passwordItem: panel.querySelector('.password'),
          passwordInput: panel.querySelector('input[name="password"]'),
          submitBtn: panel.querySelector('button[type="submit"]'),
          showPassword: panel.querySelector('input[name="show_password"]'),
          passwordDesc: panel.querySelector('.password-description'),
          tethering_ssid:
            panel.querySelector('[data-setting="tethering.wifi.ssid"]')
        };
      },

      onBeforeShow: function(panel, options) {
        this._initWifiSettingsDialog();
      },

      _initWifiSettingsDialog: function() {
        elements.submitBtn.checked = false;
        elements.showPassword.onchange = function() {
          elements.passwordInput.type = this.checked ? 'text' : 'password';
        };

        elements.securityTypeSelector.addEventListener('change',
          function(event) {
          this._updatePasswordItemVisibility(event.target.value);
          this._updateSubmitButtonState(event.target.value,
            elements.passwordInput.value.length);
        }.bind(this));

        elements.passwordInput.type = 'password';
        elements.passwordInput.addEventListener('input', function(event) {
          this._updateSubmitButtonState(elements.securityTypeSelector.value,
            elements.passwordInput.value.length);
        }.bind(this));

        elements.submitBtn.addEventListener('click', function onsubmit(e) {
          e.preventDefault();
          this.submit();
          Settings.currentPanel = 'hotspot';
        }.bind(this));

        window.addEventListener('panelready', function(e) {
          if (e.detail.current === '#hotspot-wifiSettings') {
            this.reset();
          }
        }.bind(this));
      },

      _updateSubmitButtonState: function(securityType, pwdLength) {
        elements.submitBtn.disabled =
          (pwdLength < 8 || pwdLength > 63) && (securityType !== 'open');
      },

      _updatePasswordItemVisibility: function(securityType) {
        elements.passwordItem.hidden =
          elements.passwordDesc.hidden = (securityType == 'open');
      },

      reset: function() {
        var fields = elements.panel.
          querySelectorAll('[data-setting]:not([data-ignore])');

        var reqSecurityType =
          HotspotContext.getMozSetting(this._tetheringSecurityKey);

        this._updatePasswordItemVisibility(reqSecurityType);

        for (var i = 0; i < fields.length; i++) {
          this._configInput(fields[i]);
        }
      },

      _configInput: function(input) {
        var key = input.dataset.setting;
        var setting = HotspotContext.getMozSetting(key);
        setting.then(function(value) {
          input.value = value || '';

          // dispatch the event manually for select element
          if (input.nodeName === 'SELECT') {
            var evt = document.createEvent('Event');
            evt.initEvent('change', true, true);
            input.dispatchEvent(evt);
          }
        });
      },

      // validate all settings in the dialog box
      submit: function() {
        var fields = elements.panel.
          querySelectorAll('[data-setting]:not([data-ignore])');

        // ensure SSID is set
        if (/^\s*$/.test(elements.tethering_ssid.value)) {
          var _ = navigator.mozL10n.get;
          alert(_('SSIDCannotBeEmpty'));
          this.reset(); // Reset to original values if ssid is null.
        } else {
          var ignorePassword = (elements.securityTypeSelector.value == 'open');

          // mozSettings does not support multiple keys in the cset object
          // with one set() call,
          // see https://bugzilla.mozilla.org/show_bug.cgi?id=779381
          for (var i = 0; i < fields.length; i++) {
            var input = fields[i];
            var key = input.dataset.setting;

            if (!(ignorePassword && key == this._tetheringPasswordKey)) {
              HotspotContext.setMozSetting(key, input.value);
            }
          }
        }
      }

    });
  };
});
