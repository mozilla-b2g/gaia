define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var SettingsService = require('modules/settings_service');

  return function ctor_hotspot_wifi_settings() {
    var elements;
    var hotspotSettings;

    return SettingsPanel({
      onInit: function(panel) {
        elements = {
          panel: panel,
          securityTypeSelector: panel.querySelector('.security-selector'),
          passwordItem: panel.querySelector('.password'),
          passwordInput: panel.querySelector('input[name="password"]'),
          submitBtn: panel.querySelector('button.save-hotspotSettings'),
          showPassword: panel.querySelector('input[name="show_password"]'),
          passwordDesc: panel.querySelector('.password-description'),
          tethering_ssid:
            panel.querySelector('[data-setting="tethering.wifi.ssid"]'),
          backBtn: panel.querySelector('button[type="reset"]')
        };

        this._initSecurityOptions();
      },

      onBeforeShow: function(panel, options) {
        hotspotSettings = options.settings;
        this._initWifiSettingsDialog();
      },

      _initSecurityOptions: function() {
        var types = ['open', 'wpa-psk', 'wpa2-psk'];
        types.forEach((type) => {
          var prefix = (type === 'open') ? '\u202b' : '\u202a' ;
          var suffix = '\u202c';
          var option = document.createElement('option');
          option.value = type;
          option.innerHTML = prefix +
            navigator.mozL10n.get('hotspot-'+ type) + suffix;
          elements.securityTypeSelector.appendChild(option);
        });
      },

      _initWifiSettingsDialog: function() {
        elements.showPassword.checked = false;
        elements.showPassword.onchange = function() {
          elements.passwordInput.type = this.checked ? 'text' : 'password';
        };

        elements.securityTypeSelector.addEventListener('change',
          function(event) {
            this._updatePasswordItemVisibility(event.target.value);
            this._updateSubmitButtonState(event.target.value,
              elements.passwordInput.value.length);
        }.bind(this));

        elements.tethering_ssid.addEventListener('input', function(event) {
          this._updateSubmitButtonState(elements.securityTypeSelector.value,
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
        }.bind(this));

        elements.backBtn.addEventListener('click', function onback(e) {
          e.preventDefault();
          this._back();
        }.bind(this));

        window.addEventListener('panelready', function(e) {
          if (e.detail.current === '#hotspot-wifiSettings') {
            this.reset();
            this._updateSubmitButtonState(elements.securityTypeSelector.value,
              elements.passwordInput.value.length);
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

        var securityType = hotspotSettings.hotspotSecurity;

        this._updatePasswordItemVisibility(securityType);

        for (var i = 0; i < fields.length; i++) {
          this._configInput(fields[i]);
        }
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
            var setting;

            switch(key) {
              case hotspotSettings.tetheringSSIDKey:
                setting = hotspotSettings.setHotspotSSID(input.value);
                break;
              case hotspotSettings.tetheringPasswordKey:
                if (!(ignorePassword &&
                  key == hotspotSettings.tetheringPasswordKey)) {
                  setting = hotspotSettings.setHotspotPassword(input.value);
                }
                break;
              case hotspotSettings.tetheringSecurityKey:
                setting = hotspotSettings.setHotspotSecurity(input.value);
                break;
            }
          }
        }

        this._back();
      },

      _back: function() {
        SettingsService.navigate('hotspot');
      }
    });
  };
});
