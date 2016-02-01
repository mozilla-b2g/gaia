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
    var hotspotSSID;

    return SettingsPanel({
      onInit: function(panel) {
        this._incompatibleSettingsDialog = 'incompatible-settings-dialog';

        elements = {
          panel: panel,
          hotspotSettingBtn:
            panel.querySelector('#hotspot-settings-section a'),
          hotspotElement:
            panel.querySelector('#tethering-wifi-enabled'),
          hotspotMsg:
            panel.querySelector('#wifi-hotspot-msg'),
          usbTetheringElement:
            panel.querySelector('#tethering-usb-enabled')
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
      },

      _updateHotspotSSID: function(newValue) {
        hotspotSSID = newValue;
      },

      _setHotspotSettingsEnabled: function(enabled) {
        elements.hotspotElement.checked = enabled;
        if (enabled) {
          document.l10n.setAttributes(
            elements.hotspotMsg,
            'wifi-hotspot-enabled-msg',
            { hotspotSSID: hotspotSSID }
          );
        } else {
          elements.hotspotMsg.setAttribute('data-l10n-id', 'disabled');
        }
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
          // if both conflict, ensure that two incompatible settings
          // are disabled before turning on.
          if (bothConflicts) {
            return this._openIncompatibleSettingsDialog(
              hotspot.tetheringUsbKey, hotspot.tetheringWifiKey, null)
            .then((updated) => {
              updated && this._openIncompatibleSettingsDialog(
                hotspot.tetheringUsbKey, hotspot.usbStorageKey, null);
            });
          }

          var headerL10nMap = {
            'ums.enabled': 'is-warning-storage-header',
            'tethering.usb.enabled': 'is-warning-tethering-header',
            'tethering.wifi.enabled': 'is-warning-wifi-header'
          };
          var messageL10nMap = {
            'ums.enabled': {
              'tethering.usb.enabled': 'is-warning-storage-tethering-message'
            },
            'tethering.usb.enabled': {
              'ums.enabled': 'is-warning-tethering-storage-message',
              'tethering.wifi.enabled': 'is-warning-tethering-wifi-message'
            },
            'tethering.wifi.enabled': {
              'tethering.usb.enabled': 'is-warning-wifi-tethering-message'
            }
          };

          var headerL10n = headerL10nMap[newSetting];
          var messageL10n =
            messageL10nMap[newSetting] &&
            messageL10nMap[newSetting][oldSetting];

          return DialogService.confirm(messageL10n, {
            title: headerL10n,
            submitButton: { id: 'enable', style: 'recommend' },
            cancelButton: { id: 'cancel' },
          }).then((result) => {
            var enabled = result.type === 'submit';
            var lock = navigator.mozSettings.createLock();
            var cset = {};

            cset[newSetting] = enabled;
            cset[oldSetting] = !enabled;
            lock.set(cset);

            return enabled;
          });
      },

      _updateUI: function() {
        this._setHotspotSettingsEnabled(
          hotspot.wifiHotspotSetting
        );
        this._setUSBTetheringCheckbox(
          hotspot.usbHotspotSetting
        );
        this._updateHotspotSSID(hotspotSettings.hotspotSSID);
      }
    });
  };
});
