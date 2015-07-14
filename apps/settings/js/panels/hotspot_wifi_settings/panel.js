define(function(require) {
  'use strict';

  var DialogPanel = require('modules/dialog_panel');

  return function ctor_hotspot_wifi_settings() {
    var elements;
    var hotspotSettings;
    var _ = navigator.mozL10n.get;

    return DialogPanel({
      onInit: function(panel) {
        elements = {
          panel: panel,
          securityTypeSelector: panel.querySelector('.security-selector'),
          passwordItem: panel.querySelector('.password'),
          passwordInput: panel.querySelector('input[name="password"]'),
          submitBtn: panel.querySelector('button.save-hotspotSettings'),
          showPassword: panel.querySelector('input[name="show_password"]'),
          passwordDesc: panel.querySelector('.password-description'),
          tethering_ssid: panel.querySelector(
            '[data-setting="tethering.wifi.ssid"]'),
          allFields: panel.querySelectorAll(
            '[data-setting]:not([data-ignore])')
        };

        this._initSecurityOptions();

        elements.showPassword.addEventListener('change', function() {
          elements.passwordInput.type = this.checked ? 'text' : 'password';
        });

        elements.securityTypeSelector.addEventListener('change', (evt) => {
          this._settingsTouched = true;
          this._updatePasswordItemVisibility(evt.target.value);
          this._updateSubmitButtonState();
        });

        elements.tethering_ssid.addEventListener('input', () => {
          this._settingsTouched = true;
          this._updateSubmitButtonState();
        });

        elements.passwordInput.addEventListener('input', () => {
          this._settingsTouched = true;
          this._updateSubmitButtonState();
        });
      },

      onBeforeShow: function(panel, options) {
        hotspotSettings = options.settings;
        this._initWifiSettingsDialog();
      },

      onSubmit: function() {
        if (this._isNotSubmitable()) {
          return Promise.reject();
        } else {
          this._submit();
          return Promise.resolve();
        }
      },

      _initSecurityOptions: function() {
        var types = ['open', 'wpa-psk', 'wpa2-psk'];
        types.forEach((type) => {
          var option = document.createElement('option');
          option.value = type;
          option.setAttribute('data-l10n-id', 'hotspot-' + type);
          elements.securityTypeSelector.appendChild(option);
        });
      },

      _initWifiSettingsDialog: function() {
        elements.showPassword.checked = false;
        elements.passwordInput.type = 'password';
        this._reset();
        this._settingsTouched = false;
        this._updateSubmitButtonState();
      },

      _updateSubmitButtonState: function() {
        elements.submitBtn.disabled = this._isNotSubmitable();
      },

      _updatePasswordItemVisibility: function(securityType) {
        elements.passwordItem.hidden =
          elements.passwordDesc.hidden = (securityType === 'open');
      },

      _reset: function() {
        var fields = elements.allFields;
        this._updatePasswordItemVisibility(hotspotSettings.hotspotSecurity);
        for (var i = 0, len = fields.length; i < len; i++) {
          this._configInput(fields[i]);
        }
      },

      _isNotSubmitable: function() {
        var securityType = elements.securityTypeSelector.value;
        var pwdLength = elements.passwordInput.value.length;
        return (pwdLength < 8 || pwdLength > 63) && (securityType !== 'open') ||
          !this._settingsTouched;
      },

      _configInput: function(input) {
        var key = input.dataset.setting;
        var setting;

        switch(key) {
          case hotspotSettings.tetheringSSIDKey:
            setting = hotspotSettings.hotspotSSID;
            break;
          case hotspotSettings.tetheringPasswordKey:
            setting = hotspotSettings.hotspotPassword;
            break;
          case hotspotSettings.tetheringSecurityKey:
            setting = hotspotSettings.hotspotSecurity;
            break;
        }

        input.value = setting || '';

        // dispatch the event manually for select element
        if (input.nodeName === 'SELECT') {
          var evt = document.createEvent('Event');
          evt.initEvent('change', true, true);
          input.dispatchEvent(evt);
        }
      },

      // validate all settings in the dialog box
      _submit: function() {
        var fields = elements.allFields;

        // ensure SSID is set
        if (/^\s*$/.test(elements.tethering_ssid.value)) {
          alert(_('SSIDCannotBeEmpty'));
          this._reset(); // Reset to original values if ssid is null.
        } else {
          var ignorePassword = (elements.securityTypeSelector.value == 'open');

          // mozSettings does not support multiple keys in the cset object
          // with one set() call,
          // see https://bugzilla.mozilla.org/show_bug.cgi?id=779381
          for (var i = 0; i < fields.length; i++) {
            var input = fields[i];
            var key = input.dataset.setting;

            switch(key) {
              case hotspotSettings.tetheringSSIDKey:
                hotspotSettings.setHotspotSSID(input.value);
                break;
              case hotspotSettings.tetheringPasswordKey:
                if (!(ignorePassword &&
                  key == hotspotSettings.tetheringPasswordKey)) {
                  hotspotSettings.setHotspotPassword(input.value);
                }
                break;
              case hotspotSettings.tetheringSecurityKey:
                hotspotSettings.setHotspotSecurity(input.value);
                break;
            }
          }
        }
      }
    });
  };
});
