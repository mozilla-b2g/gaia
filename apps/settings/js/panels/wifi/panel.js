define(function(require) {
  'use strict';

  var DialogService = require('modules/dialog_service');
  var SettingsPanel = require('modules/settings_panel');
  var SettingsListener = require('shared/settings_listener');
  var WifiWps = require('panels/wifi/wifi_wps');
  var WifiContext = require('modules/wifi_context');
  var WifiHelper = require('shared/wifi_helper');
  var wifiManager = WifiHelper.getWifiManager();

  return function ctor_wifi() {
    var elements;

    return SettingsPanel({
      onInit: function(panel) {
        this._settings = navigator.mozSettings;
        this._wifiSectionVisible = true;
        this._scanPending = false;
        this._networkListPromise = null;
        this._initialized = false;

        elements = {
          panel: panel,
          wifi: panel,
          wpsColumn: panel.querySelector('.wps-column'),
          wpsInfoBlock: panel.querySelector('.wps-column small'),
          wpsPbcLabelBlock: panel.querySelector('.wps-column span'),
          wifiCheckbox: panel.querySelector('.wifi-enabled gaia-switch'),
          wifiAvailableNetworks: panel.querySelector('.wifi-availableNetworks'),
          dialogElement: panel.querySelector('.wifi-bad-credentials-dialog'),
          okBtn: panel.querySelector('.wifi-bad-credentials-confirm'),
          cancelBtn: panel.querySelector('.wifi-bad-credentials-cancel')
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

        this._wps = WifiWps();
        this._wps.addEventListener('statusreset', function() {
          elements.wps.wpsPbcLabelBlock.setAttribute('data-l10n-id',
            'wpsMessage');
          setTimeout(function resetWpsInfoBlock() {
            elements.wps.wpsPbcLabelBlock.setAttribute('data-l10n-id',
              'wpsDescription2');
          }, 1500);
        });

        // element related events
        elements.scanItem.addEventListener('click',
          this._onScanItemClick.bind(this));

        elements.wifiCheckbox.addEventListener('change',
          this._onWifiCheckboxChange.bind(this));

        elements.wpsColumn.addEventListener('click',
          this._onWpsColumnClick.bind(this));

        // wifiContext related events
        WifiContext.addEventListener('wifiEnabled', function() {
          elements.wifiCheckbox.removeAttribute('disabled');
          this._updateNetworkState();
          this._networkList().then((networkList) => {
            networkList.scan();
          });
        }.bind(this));

        WifiContext.addEventListener('wifiDisabled', function() {
          elements.wifiCheckbox.removeAttribute('disabled');
          // Re-enable UI toggle
          this._networkList().then((networkList) => {
            networkList.clear(false);
            networkList.autoscan = false;
          });
        }.bind(this));

        WifiContext.addEventListener('wifiStatusChange', function(event) {
          var scanStates =
            new Set(['connected', 'connectingfailed', 'disconnected']);
          this._updateNetworkState();
          if (scanStates.has(event.status)) {
            if (this._wifiSectionVisible) {
              this._networkList().then((networkList) => {
                networkList.scan();
              });
            } else {
              this._scanPending = true;
            }
          }
        }.bind(this));

        WifiContext.addEventListener('wifiWrongPassword', function(event) {
          var currentNetwork = WifiContext.currentNetwork;
          if (currentNetwork.known === false) {
            this._openBadCredentialsDialog(currentNetwork);
          }
        }.bind(this));

        window.performance.mark('wifiListStart');
      },
      onBeforeShow: function() {
        this._wifiSectionVisible = true;
        this._updateVisibilityStatus();
      },
      onShow: function() {
        if (!this._initialized) {
          this._initialized = true;
          SettingsListener.observe('wifi.enabled', true, function(enabled) {
            this._setMozSettingsEnabled(enabled);
            if (enabled) {
              this._updateNetworkState();
              this._networkList().then((networkList) => {
                networkList.scan();
              });
            }
          }.bind(this));
        }
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
                'wpsCancelFailedMessageError', { error: error.name });
            }
          });
        } else {
          DialogService.show('wifi-wps', {
            // wifi-wps needs these wps related networks
            wpsAvailableNetworks: function() {
              return self._networkList().then((networkList) => {
                return networkList.getWpsAvailableNetworks();
              });
            }
          }).then(function(result) {
            var type = result.type;
            var value = result.value;

            if (type === 'submit') {
              self._wps.connect({
                pin: value.pin,
                selectedAp: value.selectedAp,
                selectedMethod: value.selectedMethod,
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
            }
          });
        }
      },
      _onWifiCheckboxChange: function(e) {
        // `this` is Wifi Object
        var checkbox = elements.wifiCheckbox;
        this._settings.createLock().set({
          'wifi.enabled': checkbox.checked
        }).onerror = function() {
          // Fail to write mozSettings, return toggle control to the user.
          checkbox.removeAttribute('disabled');
        };
        checkbox.setAttribute('disabled', true);
      },
      _onScanItemClick: function() {
        this._networkList().then((networkList) => {
          networkList.clear(true);
          networkList.scan();
        });
      },
      _updateVisibilityStatus: function() {
        this._networkList().then((networkList) => {
          if (this._scanPending) {
            networkList.scan();
            this._scanPending = false;
          }
        });
      },
      _setMozSettingsEnabled: function(enabled) {
        this._networkList().then((networkList) => {
          elements.wifiCheckbox.checked = enabled;
          if (enabled) {
            /**
             * wifiManager may not be ready (enabled) at this moment.
             * To be responsive, show 'initializing' status and 'search...'
             * first. A 'scan' would be called when wifiManager is enabled.
             */
            networkList.clear(true);
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
            networkList.clear(false);
            networkList.autoscan = false;
            elements.wpsColumn.hidden = true;
          }
        });
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
      },
      _openBadCredentialsDialog: function(network) {
        var self = this;
        var dialogElement = elements.dialogElement;

        var onConfirm = function onConfirm() {
          self._networkList().then((networkList) => {
            networkList._toggleNetwork(network);
            enableDialog(false);
          });
        };

        var onCancel = function onCancel() {
          enableDialog(false);
        };

        var enableDialog = function enableDialog(enabled) {
          if (enabled) {
            navigator.mozL10n.setAttributes(
              dialogElement.querySelector('p'),
              'wifi-bad-credentials-confirm',
              { ssid : network.ssid });
            elements.okBtn.addEventListener('click', onConfirm);
            elements.cancelBtn.addEventListener('click', onCancel);
            dialogElement.hidden = false;
          } else {
            elements.okBtn.removeEventListener('click', onConfirm);
            elements.cancelBtn.removeEventListener('click', onCancel);
            dialogElement.hidden = true;
          }
        };

        enableDialog(true);
      },
      _networkList: function() {
        if (!this._networkListPromise) {
          this._networkListPromise = new Promise((resolve) => {
            require(['panels/wifi/wifi_network_list'], (WifiNetworkList) => {
              resolve(WifiNetworkList(elements.networklist));
            });
          });
        }
        return this._networkListPromise;
      }
    });
  };
});
