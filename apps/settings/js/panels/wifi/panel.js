define(function(require) {
  'use strict';

  var SettingsUtils = require('modules/settings_utils');
  var SettingsPanel = require('modules/settings_panel');
  var SettingsListener = require('shared/settings_listener');
  var WifiWps = require('panels/wifi/wifi_wps');
  var WifiContext = require('modules/wifi_context');
  var WifiHelper = require('shared/wifi_helper');
  var WifiNetworkList = require('panels/wifi/wifi_network_list');
  var wifiManager = WifiHelper.getWifiManager();

  return function ctor_wifi() {
    var elements;

    return SettingsPanel({
      onInit: function(panel) {
        this._settings = navigator.mozSettings;
        this._wifiSectionVisible = true;
        this._scanPending = false;

        elements = {
          panel: panel,
          wifi: panel,
          wpsColumn: panel.querySelector('#wps-column'),
          wpsInfoBlock: panel.querySelector('#wps-column small'),
          wpsPbcLabelBlock: panel.querySelector('#wps-column a'),
          manageNetworksBtn: panel.querySelector('#manageNetworks'),
          wifiCheckbox: panel.querySelector('#wifi-enabled input'),
          manageCertificatesBtn: panel.querySelector('#manageCertificates'),
          wifiAvailableNetworks: panel.querySelector('#wifi-availableNetworks'),
        };

        elements.infoItem = elements.wifiAvailableNetworks.querySelector(
          'li[data-state="on"]');
        elements.scanItem = elements.wifiAvailableNetworks.querySelector(
          'li[data-state="ready"]');
        elements.wifiItem = elements.wifiAvailableNetworks.querySelector(
          'li:not([data-state])');

        elements.networklist = {
          infoItem: elements.infoItem,
          scanItem: elements.scanItem,
          wifiAvailableNetworks: elements.wifiAvailableNetworks
        };

        elements.wps = {
          wpsColumn: elements.wpsColumn,
          wpsInfoBlock: elements.wpsInfoBlock,
          wpsPbcLabelBlock: elements.wpsPbcLabelBlock
        };

        this._networkList = WifiNetworkList(elements.networklist);
        this._wps = WifiWps();
        this._wps.addEventListener('statusreset', function() {
          elements.wps.wpsPbcLabelBlock.setAttribute('data-l10n-id',
                                                     'wpsMessage');
          setTimeout(function resetWpsInfoBlock() {
            elements.wps.wpsPbcLabelBlock.setAttribute('data-l10n-id',
                                                       'wpsDescription2');
          }, 1500);
        });

        SettingsListener.observe('wifi.enabled', true, function(enabled) {
          this._setMozSettingsEnabled(enabled);
          if (enabled) {
            this._updateNetworkState();
            this._networkList.scan();
          }
        }.bind(this));

        // element related events
        elements.scanItem.addEventListener('click',
          this._onScanItemClick.bind(this));

        elements.wifiCheckbox.addEventListener('click',
          this._onWifiCheckboxClick.bind(this));

        elements.wpsColumn.addEventListener('click',
          this._onWpsColumnClick.bind(this));

        elements.manageCertificatesBtn.addEventListener('click', function() {
          SettingsUtils.openDialog('wifi-manageCertificates');
        });

        elements.manageNetworksBtn.addEventListener('click', function() {
          SettingsUtils.openDialog('wifi-manageNetworks');
        });

        // wifiContext related events
        WifiContext.addEventListener('wifiEnabled', function() {
          elements.wifiCheckbox.disabled = false;
          this._updateNetworkState();
          this._networkList.scan();
        }.bind(this));

        WifiContext.addEventListener('wifiDisabled', function() {
          elements.wifiCheckbox.disabled = false;
          // Re-enable UI toggle
          this._networkList.clear(false);
          this._networkList.autoscan = false;
        }.bind(this));

        WifiContext.addEventListener('wifiStatusChange', function(event) {
          var scanStates =
            new Set(['connected', 'connectingfailed', 'disconnected']);

          this._updateNetworkState();
          if (scanStates.has(event.status)) {
            if (this._wifiSectionVisible) {
              this._networkList.scan();
            } else {
              this._scanPending = true;
            }
          }
        }.bind(this));
      },
      onBeforeShow: function() {
        this._wifiSectionVisible = true;
        this._updateVisibilityStatus();
      },
      onBeforeHide: function() {
        this._wifiSectionVisible = false;
      },
      _onWpsColumnClick: function() {
        var self = this;
        if (this._wps.inProgress) {
          this._wps.cancel({
            onSuccess: function() {
              elements.wpsInfoBlock.setAttribute('data-l10n-id',
                                                 'fullStatus-wps-canceled');
            },
            onError: function(error) {
              navigator.mozL10n.setAttributes(elements.wpsInfoBlock,
                                              'wpsCancelFailedMessageError',
                                              { error: error.name });
            }
          });
        } else {
          SettingsUtils.openDialog('wifi-wps', {
            onSubmit: function() {
              self._wps.connect({
                onSuccess: function() {
                  elements.wps.wpsPbcLabelBlock.setAttribute('data-l10n-id',
                    'wpsCancelMessage');
                  elements.wps.wpsInfoBlock.setAttribute('data-l10n-id',
                    'fullStatus-wps-inprogress');
                },
                onError: function(error) {
                  navigator.mozL10n.setAttributes(elements.wpsInfoBlock,
                    'fullStatus-wps-failed-error', { error: error.name });
                }
              });
            },
            wpsAvailableNetworks: self._networkList.getWpsAvailableNetworks()
          });
        }
      },
      _onWifiCheckboxClick: function() {
        // `this` is Wifi Object
        var checkbox = elements.wifiCheckbox;
        this._settings.createLock().set({
          'wifi.enabled': checkbox.checked
        }).onerror = function() {
          // Fail to write mozSettings, return toggle control to the user.
          checkbox.disabled = false;
        };
        checkbox.disabled = true;
      },
      _onScanItemClick: function() {
        this._networkList.clear(true);
        this._networkList.scan();
      },
      _updateVisibilityStatus: function() {
        if (this._scanPending) {
          this._networkList.scan();
          this._scanPending = false;
        }
      },
      _setMozSettingsEnabled: function(enabled) {
        elements.wifiCheckbox.checked = enabled;
        if (enabled) {
          /**
           * wifiManager may not be ready (enabled) at this moment.
           * To be responsive, show 'initializing' status and 'search...' first.
           * A 'scan' would be called when wifiManager is enabled.
           */
          this._networkList.clear(true);
          elements.wpsColumn.hidden = false;
        } else {
          if (this._wps.inProgress) {
            elements.wpsInfoBlock.
              setAttribute('data-l10n-id', WifiContext.wifiStatusText.id);
            if (WifiContext.wifiStatusText.args) {
              elements.wpsInfoBlock.
                setAttribute('data-l10n-args',
                             JSON.stringify(WifiContext.wifiStatusText.args));
            } else {
              elements.wpsInfoBlock.removeAttribute('data-l10n-args');
            }
          }
          this._networkList.clear(false);
          this._networkList.autoscan = false;
          elements.wpsColumn.hidden = true;
        }
      },
      _updateNetworkState: function() {
        // update network state, called only when wifi enabled.
        var networkStatus = wifiManager.connection.status;

        if (this._wps.inProgress) {
          if (networkStatus !== 'disconnected') {
            elements.wpsInfoBlock.
              setAttribute('data-l10n-id', WifiContext.wifiStatusText.id);
            if (WifiContext.wifiStatusText.args) {
              elements.wpsInfoBlock.
                setAttribute('data-l10n-args',
                             JSON.stringify(WifiContext.wifiStatusText.args));
            } else {
              elements.wpsInfoBlock.removeAttribute('data-l10n-args');
            }
          }
          if (networkStatus === 'connected' ||
            networkStatus === 'wps-timedout' ||
            networkStatus === 'wps-failed' ||
            networkStatus === 'wps-overlapped') {
              this._wps.inProgress = false;
              this._wps.statusReset();
          }
        }
      }
    });
  };
});
