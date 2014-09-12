/* global openDialog, openIncompatibleSettingsDialog */

define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var HotspotContext = require('modules/hotspot_context');

  return function ctor_hotspot() {
    var elements;
    var _tetheringWifiKey = 'tethering.wifi.enabled';
    var _tetheringUsbKey = 'tethering.usb.enabled';
    var _usbStorageKey = 'ums.enabled';

    return SettingsPanel({
      onInit: function(panel) {
        this._settings = navigator.mozSettings;
        this._incompatibleSettingsDialog = 'incompatible-settings-dialog';

        elements = {
          panel: panel,
          hotspotSettingBtn:
            panel.querySelector('#hotspot-settings-section button'),
          hotspotElement:
            panel.querySelector('input#tethering-wifi-enabled'),
          usbTetheringElement:
            panel.querySelector('input#tethering-usb-enabled'),
          wifiSecurityType: panel.querySelector('#wifi-security-type')
        };
      },

      onBeforeShow: function(panel, options) {
        // Wifi tethering enabled
        HotspotContext.addEventListener('wifiHotspotChange',
          this._setHotspotSettingsEnabled.bind(this));

        // USB tethering enabled
        HotspotContext.addEventListener('usbHotspotChange',
          this._setUSBTetheringCheckbox.bind(this));

        // Incompatible settings
        HotspotContext.addEventListener('incompatibleSettings',
          this._openIncompatibleSettingsDialog.bind(this));

        // Wi-fi hotspot event listener
        elements.hotspotElement.addEventListener('change',
          function(evt) {
          var checkbox = evt.target;
          HotspotContext.checkIncompatibleSettings(_tetheringWifiKey,
            checkbox.checked);
        });

        // USB tethering event listener
        elements.usbTetheringElement.addEventListener('change',
          function(evt) {
          var checkbox = evt.target;
          HotspotContext.checkIncompatibleSettings(_tetheringUsbKey,
            checkbox.checked);
        });

        this._updateUI();

        elements.hotspotSettingBtn.addEventListener('click',
          openDialog.bind(window, 'hotspot-wifiSettings'));

        // Localize WiFi security type string when setting changes
        HotspotContext.addEventListener('securityTypeChange', function(value) {
          elements.wifiSecurityType.
            setAttribute('data-l10n-id', 'hotspot-' + value);
        }.bind(this));
      },

      _setHotspotSettingsEnabled: function(enabled) {
        // disable the setting button when internet sharing is enabled
        elements.hotspotSettingBtn.disabled = enabled;
        elements.hotspotElement.checked = enabled;
      },

      _setUSBTetheringCheckbox: function(enabled) {
        elements.usbTetheringElement.checked = enabled;
      },

      _openIncompatibleSettingsDialog:
        function(newSetting, oldSetting,bothConflicts) {
          // We must check if there is two incompatibilities
          // (usb hotspot case) or just one
          if (bothConflicts) {
            openIncompatibleSettingsDialog(this._incompatibleSettingsDialog,
              _tetheringUsbKey, _tetheringWifiKey,
              this._openSecondWarning.bind(this));
          } else {
            openIncompatibleSettingsDialog(this._incompatibleSettingsDialog,
              newSetting, oldSetting, null);
          }
      },

      _openSecondWarning: function() {
        openIncompatibleSettingsDialog(this._incompatibleSettingsDialog,
            _tetheringUsbKey, _usbStorageKey, null);
      },

      _updateUI: function() {
        this._setHotspotSettingsEnabled(
          HotspotContext.wifiHotspotSetting
        );
        this._setUSBTetheringCheckbox(
          HotspotContext.usbHotspotSetting
        );
      }
    });
  };
});
