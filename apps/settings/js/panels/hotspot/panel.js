/* global openIncompatibleSettingsDialog */

define(function(require) {
  'use strict';

  var DialogService = require('modules/dialog_service');
  var SettingsPanel = require('modules/settings_panel');
  var Hotspot = require('panels/hotspot/hotspot');
  var HotspotSettings =
    require('panels/hotspot/hotspot_settings');

  return function ctor_hotspot() {
    var elements;
    var hotspot = Hotspot();
    var hotspotSettings = HotspotSettings();

    return SettingsPanel({
      onInit: function(panel) {
        this._incompatibleSettingsDialog = 'incompatible-settings-dialog';

        elements = {
          panel: panel,
          hotspotSettingBtn:
            panel.querySelector('#hotspot-settings-section a'),
          hotspotElement:
            panel.querySelector('#tethering-wifi-enabled'),
          usbTetheringElement:
            panel.querySelector('#tethering-usb-enabled'),
          hotspotSecurityType: panel.querySelector('#wifi-security-type'),
          hotspotSSID: panel.querySelector('span.hotspotSSID')
        };

        this.incompatibleSettingsHandler =
          this._openIncompatibleSettingsDialog.bind(this);

        hotspot.init();
      },

      onBeforeShow: function(panel, options) {
        // Wifi tethering enabled
        hotspot.addEventListener('wifiHotspotChange',
          this._setHotspotSettingsEnabled);

        // USB tethering enabled
        hotspot.addEventListener('usbHotspotChange',
          this._setUSBTetheringCheckbox);

        // Incompatible settings
        hotspot.addEventListener('incompatibleSettings',
          this.incompatibleSettingsHandler);

        // Wi-fi hotspot event listener
        elements.hotspotElement.addEventListener('change',
          this._onWifiHotspotChange);

        // USB tethering event listener
        elements.usbTetheringElement.addEventListener('change',
          this._onUsbHotspotChange);

        elements.hotspotSettingBtn.addEventListener('click',
          this._onHotspotSettingsClick);

        hotspotSettings.observe('hotspotSSID', this._updateHotspotSSID);

        // Localize WiFi security type string when setting changes
        hotspotSettings.observe('hotspotSecurity',
          this._updateHotspotSecurity);

        this._updateUI();
      },

      onBeforeHide: function(panel, options) {
        // Wifi tethering
        hotspot.removeEventListener('wifiHotspotChange',
          this._setHotspotSettingsEnabled);

        // USB tethering
        hotspot.removeEventListener('usbHotspotChange',
          this._setUSBTetheringCheckbox);

        // Incompatible settings
        hotspot.removeEventListener('incompatibleSettings',
          this.incompatibleSettingsHandler);

        // Wi-fi hotspot event listener
        elements.hotspotElement.removeEventListener('change',
          this._onWifiHotspotChange);

        // USB tethering event listener
        elements.usbTetheringElement.removeEventListener('change',
          this._onUsbHotspotChange);

        elements.hotspotSettingBtn.removeEventListener('click',
          this._onHotspotSettingsClick);

        hotspotSettings.unobserve('hotspotSSID');
        hotspotSettings.unobserve('hotspotSecurity');
      },

      _updateHotspotSecurity: function(newValue) {
        if (newValue) {
          elements.hotspotSecurityType.setAttribute('data-l10n-id',
            'hotspot-' + newValue);
        }
      },

      _updateHotspotSSID: function(newValue) {
        elements.hotspotSSID.textContent = newValue;
      },

      _setHotspotSettingsEnabled: function(enabled) {
        elements.hotspotElement.checked = enabled;
      },

      _setUSBTetheringCheckbox: function(enabled) {
        elements.usbTetheringElement.checked = enabled;
      },

      _onWifiHotspotChange: function(event) {
        var checkbox = event.target;
        hotspot.checkIncompatibleSettings(
          hotspot.tetheringWifiKey, checkbox.checked);
      },

      _onUsbHotspotChange: function(event) {
        var checkbox = event.target;
        hotspot.checkIncompatibleSettings(
          hotspot.tetheringUsbKey, checkbox.checked);
      },

      _onHotspotSettingsClick: function() {
        DialogService.show('hotspot-wifiSettings', {
          settings: hotspotSettings
        }).then((result) => {
          if (result.type === 'submit') {
            // reconnect hotspot settings to make new settings take effect.
            hotspot.reEnableWifiTetheringSetting();
          }
        });
      },

      _openIncompatibleSettingsDialog:
        function(newSetting, oldSetting, bothConflicts) {
          // We must check if there is two incompatibilities
          // (usb hotspot case) or just one
          if (bothConflicts) {
            openIncompatibleSettingsDialog(this._incompatibleSettingsDialog,
              hotspot.tetheringUsbKey, hotspot.tetheringWifiKey,
              this._openSecondWarning.bind(this));
          } else {
            openIncompatibleSettingsDialog(this._incompatibleSettingsDialog,
              newSetting, oldSetting, null);
          }
      },

      _openSecondWarning: function() {
        openIncompatibleSettingsDialog(this._incompatibleSettingsDialog,
            hotspot.tetheringUsbKey, hotspot.usbStorageKey,
            null);
      },

      _updateUI: function() {
        this._setHotspotSettingsEnabled(
          hotspot.wifiHotspotSetting
        );
        this._setUSBTetheringCheckbox(
          hotspot.usbHotspotSetting
        );
        this._updateHotspotSSID(hotspotSettings.hotspotSSID);
        this._updateHotspotSecurity(hotspotSettings.hotspotSecurity);
      }
    });
  };
});
