/**
 * The Bluetooth panel
 *
 * Bluetooth v2 panel, still on working..
 */
define(function(require) {
  'use strict';

  var BtContext = require('modules/bluetooth/bluetooth_context');
  var BtConnectionManager =
    require('modules/bluetooth/bluetooth_connection_manager');
  var BtTemplateFactory = require('panels/bluetooth/bt_template_factory');
  var DialogService = require('modules/dialog_service');
  var ListView = require('modules/mvvm/list_view');
  var SettingsPanel = require('modules/settings_panel');

  var L10n = window.navigator.mozL10n;
  var Settings = window.navigator.mozSettings;

  // A timeout which is defined in system app to set discoverable property false
  // after 2 mins.
  const DISCOVERABLE_TIMEOUT_TIME = 120000;
  // Interval update discoverable remaining time.
  const INTERVAL_UPDATE_DISCOVERABLE_REMAINING_TIME = 1000;

  var _debug = false;
  var Debug = function() {};
  if (_debug) {
    Debug = function btp_debug(msg) {
      console.log('--> [Bluetooth][Panel]: ' + msg);
    };
  }

  var Localize = L10n.setAttributes;

  return function ctor_bluetooth() {
    var elements;
    var pairedDeviceTemplate;
    var foundDeviceTemplate;
    var _pairedDevicesListView;
    var _foundDevicesListView;

    return SettingsPanel({
      onInit: function(panel) {
        Debug('onInit():');

        // Init state for checking left app or not.
        this._leftApp = false;
        // Init an instance to maintain interval of visibility remaining time.
        this._visibleInterval = null;
        // Init an variable to maintain the disable timestamp.
        // The timestamp is set from system app.
        this._disableTimestamp = null;
        // Init bounding instances for observe/un-observe property.
        this._boundUpdateEnableCheckbox = this._updateEnableCheckbox.bind(this);
        this._boundUpdateVisibleItem = this._updateVisibleItem.bind(this);
        this._boundUpdateVisibleCheckbox =
          this._updateVisibleCheckbox.bind(this);
        this._boundUpdateVisibilityDisabledMsg =
          this._updateVisibilityDisabledMsg.bind(this);
        this._boundUpdateVisibilityEnabledCountdownMsg =
          this._updateVisibilityEnabledCountdownMsg.bind(this);
        this._boundUpdateRenameItem = this._updateRenameItem.bind(this);
        this._boundUpdateRenameDesc = this._updateRenameDesc.bind(this);
        this._boundUpdatePairedDevicesHeader =
         this._updatePairedDevicesHeader.bind(this);
        this._boundUpdatePairedDevicesList =
          this._updatePairedDevicesList.bind(this);
        this._boundUpdateFoundDevicesList =
          this._updateFoundDevicesList.bind(this);
        this._boundUpdateSearchItem = this._updateSearchItem.bind(this);
        this._boundUpdateSearchingItem = this._updateSearchingItem.bind(this);

        elements = {
          panel: panel,
          enableCheckbox: panel.querySelector('.bluetooth-status input'),
          enableCheckboxMsg: panel.querySelector('.bluetooth-enable-msg'),
          visible: {
            visibleItem: panel.querySelector('.device-visible'),
            visibleCheckBox: panel.querySelector('.device-visible input'),
            visibleMsg: panel.querySelector('.bluetooth-visibility-msg')
          },
          rename: {
            renameItem: panel.querySelector('.bluetooth-rename'),
            renameMenu: panel.querySelector('.menuItem-rename'),
            renameDescription:
              panel.querySelector('.bluetooth-device-name-desc')
          },
          paired: {
            pairedDevicesHeader: panel.querySelector('.bluetooth-paired-title'),
            pairedDevicesList: panel.querySelector('.bluetooth-paired-devices')
          },
          found: {
            foundDevicesHeader: panel.querySelector('.bluetooth-found-title'),
            foundDevicesList: panel.querySelector('.bluetooth-devices')
          },
          search: {
            searchingItem: panel.querySelector('.bluetooth-searching'),
            searchItem: panel.querySelector('.bluetooth-search'),
            searchButton: panel.querySelector('.search-device')
          },
          actionMenu: {
            actionMenuDialog: panel.querySelector('.paired-device-option'),
            connectOption: panel.querySelector('.connect-option'),
            disconnectOption: panel.querySelector('.disconnect-option'),
            unpairOption: panel.querySelector('.unpair-option'),
            cancelOption: panel.querySelector('.cancel-option')
          }
        };

        // element related events
        elements.enableCheckbox.addEventListener('click',
          this._onEnableCheckboxClick.bind(this));

        elements.visible.visibleCheckBox.addEventListener('click',
          this._onVisibleCheckBoxClick.bind(this));

        elements.rename.renameMenu.addEventListener('click',
          this._onRenameMenuClick.bind(this));

        elements.search.searchButton.addEventListener('click',
          this._onSearchButtonClick.bind(this));

        // paired devices list item click events
        pairedDeviceTemplate =
          BtTemplateFactory('paired', this._onPairedDeviceItemClick.bind(this));

        // create found devices list view
        _pairedDevicesListView = ListView(elements.paired.pairedDevicesList,
                                         BtContext.getPairedDevices(),
                                         pairedDeviceTemplate);

        // found devices list item click events
        foundDeviceTemplate =
          BtTemplateFactory('remote', this._onFoundDeviceItemClick.bind(this));

        // create found devices list view
        _foundDevicesListView = ListView(elements.found.foundDevicesList,
                                         BtContext.getRemoteDevices(),
                                         foundDeviceTemplate);
      },

      onBeforeShow: function() {
        Debug('onBeforeShow():');

        // enable/disable
        BtContext.observe('state', this._boundUpdateEnableCheckbox);
        this._updateEnableCheckbox(BtContext.state);

        // visible
        BtContext.observe('state', this._boundUpdateVisibleItem);
        this._updateVisibleItem(BtContext.state);

        BtContext.observe('discoverable', this._boundUpdateVisibleCheckbox);
        this._updateVisibleCheckbox(BtContext.discoverable);

        BtContext.observe('discoverable',
          this._boundUpdateVisibilityDisabledMsg);
        this._updateVisibilityDisabledMsg(BtContext.discoverable);

        Settings.addObserver('bluetooth.discoverable.disableTimestamp',
          this._boundUpdateVisibilityEnabledCountdownMsg);

        // rename
        BtContext.observe('state', this._boundUpdateRenameItem);
        this._updateRenameItem(BtContext.state);

        BtContext.observe('name', this._boundUpdateRenameDesc);
        this._updateRenameDesc(BtContext.name);

        // paired devices header
        BtContext.observe('hasPairedDevice',
          this._boundUpdatePairedDevicesHeader);
        this._updatePairedDevicesHeader(BtContext.hasPairedDevice);

        // paired devices list
        BtContext.observe('state', this._boundUpdatePairedDevicesList);
        this._updatePairedDevicesList(BtContext.state);

        // found devices list
        BtContext.observe('state', this._boundUpdateFoundDevicesList);
        this._updateFoundDevicesList(BtContext.state);

        _pairedDevicesListView.enabled = true;
        _foundDevicesListView.enabled = true;

        // search
        BtContext.observe('state', this._boundUpdateSearchItem);
        this._updateSearchItem(BtContext.state);

        BtContext.observe('discovering', this._boundUpdateSearchingItem);
        this._updateSearchingItem(BtContext.discovering);
      },

      onShow: function() {
        Debug('onShow():');

        if (!this._leftApp) {
          // If settings app is still in the forground,
          // we start discovering device automatically
          // while Bluetooth panel is onShow.
          BtContext.startDiscovery().then(() => {
            Debug('onShow(): startDiscovery successfully');
          }, (reason) => {
            Debug('onShow(): startDiscovery failed, ' +
                  'reason = ' + reason);
          });
        }
        this._leftApp = false;
      },

      onBeforeHide: function() {
        Debug('onBeforeHide():');
        BtContext.unobserve('state', this._boundUpdateEnableCheckbox);
        BtContext.unobserve('state', this._boundUpdateVisibleItem);
        BtContext.unobserve('discoverable', this._boundUpdateVisibleCheckbox);
        BtContext.unobserve('discoverable',
          this._boundUpdateVisibilityDisabledMsg);
        Settings.removeObserver('bluetooth.discoverable.disableTimestamp',
          this._boundUpdateVisibilityEnabledCountdownMsg);
        BtContext.unobserve('state', this._boundUpdateRenameItem);
        BtContext.unobserve('name', this._boundUpdateRenameDesc);
        BtContext.unobserve('hasPairedDevice',
          this._boundUpdatePairedDevicesHeader);
        BtContext.unobserve('state', this._boundUpdatePairedDevicesList);
        BtContext.unobserve('state', this._boundUpdateFoundDevicesList);
        BtContext.unobserve('state', this._boundUpdateSearchItem);
        BtContext.unobserve('discovering', this._boundUpdateSearchingItem);
      },

      onHide: function() {
        Debug('onHide():');
        this._leftApp = document.hidden;

        if (!this._leftApp) {
          // If settings app is still in the forground,
          // we stop discovering device automatically
          // while Bluetooth panel is onHide.
          BtContext.stopDiscovery();
        }

        if (_pairedDevicesListView) {
          _pairedDevicesListView.enabled = false;
        }

        if (_foundDevicesListView) {
          _foundDevicesListView.enabled = false;
        }
      },

      _onEnableCheckboxClick: function() {
        var checkbox = elements.enableCheckbox;
        Debug('_onEnableCheckboxClick(): checked = ' + checkbox.checked);
        BtContext.setEnabled(checkbox.checked).then(() => {
          Debug('_onEnableCheckboxClick(): setEnabled ' +
                checkbox.checked + ' successfully');
        }, (reason) => {
          Debug('_onEnableCheckboxClick(): setEnabled ' +
                checkbox.checked + ' failed, reason = ' + reason);
        });
      },

      _onVisibleCheckBoxClick: function() {
        var checkbox = elements.visible.visibleCheckBox;
        Debug('_onVisibleCheckBoxClick(): checked = ' + checkbox.checked);
        BtContext.setDiscoverable(checkbox.checked).then(() => {
          Debug('_onVisibleCheckBoxClick(): setDiscoverable ' +
                checkbox.checked + ' successfully');
        }, (reason) => {
          Debug('_onVisibleCheckBoxClick(): setDiscoverable ' +
                checkbox.checked + ' failed, reason = ' + reason);
        });
      },

      _onRenameMenuClick: function() {
        Debug('_onRenameMenuClick():');
        DialogService.show('bluetooth-renameSettings');
      },

      _updateEnableCheckbox: function(state) {
        Debug('_updateEnableCheckbox(): ' +
              'callback from observe "state" = ' + state);
        // Update Bluetooth enable checkbox
        elements.enableCheckbox.checked =
          (state === 'enabled') || (state === 'enabling');
        elements.enableCheckbox.disabled =
          (state === 'enabling') || (state === 'disabling');

        // Update Bluetooth enable checkbox message
        elements.enableCheckboxMsg.hidden =
          (state === 'enabled') || (state === 'enabling');
      },

      _updateVisibleItem: function(state) {
        Debug('_updateVisibleItem(): ' +
              'callback from observe "state" = ' + state);
        elements.visible.visibleItem.hidden =
          !((state === 'enabled') || (state === 'enabling'));
        elements.visible.visibleItem.disabled = (state === 'enabled');
      },

      _updateVisibleCheckbox: function(discoverable) {
        Debug('_updateVisibleCheckbox(): ' +
              'callback from observe "discoverable" = ' + discoverable);
        elements.visible.visibleCheckBox.checked = discoverable;
      },

      _updateVisibilityDisabledMsg: function(discoverable) {
        Debug('_updateVisibilityDisabledMsg(): ' +
              'callback from observe "discoverable" = ' + discoverable);
        if (!discoverable) {
          Localize(elements.visible.visibleMsg,
                   'bluetooth-visibility-enable-msg');
        }
      },

      _updateVisibilityEnabledCountdownMsg: function(event) {
        Debug('_updateVisibilityEnabledCountdownMsg(): disableTimestamp = ' +
              event.settingValue);
        var disableTimestamp = event.settingValue;
        if (disableTimestamp === null) {
          this._setIntervalToUpdateRemainingTime(false);
          this._disableTimestamp = null;
          Localize(elements.visible.visibleMsg,
                   'bluetooth-visibility-enable-msg');
          return;
        }

        // Set interval to update remaining time.
        this._disableTimestamp = disableTimestamp;
        this._setIntervalToUpdateRemainingTime(true);
      },

      _setIntervalToUpdateRemainingTime: function(enabled) {
        Debug('_setIntervalToUpdateRemainingTime(): enabled = ' + enabled);
        // Remaining time will be updated per 1 second.
        if (enabled && !this._visibleInterval) {
          Debug('_setIntervalToUpdateRemainingTime(): set interval ' +
                'to update remaining time per 1 second');

          this._visibleInterval = setInterval(() => {
            // Update remaining time.
            this._updateVisibilityRemainingTime();
          }, INTERVAL_UPDATE_DISCOVERABLE_REMAINING_TIME);
          // Early return here since already set interval.
          return;
        }

        // Clear interval for disabled.
        if (!enabled && this._visibleInterval) {
          Debug('_setIntervalToUpdateRemainingTime(): clearInterval');
          clearInterval(this._visibleInterval);
          this._visibleInterval = null;
        }
      },

      _updateVisibilityRemainingTime: function() {
        Debug('_updateVisibilityRemainingTime(): ');
        if (this._disableTimestamp === null) {
          // Early return if disable timestamp is not set.
          return;
        }

        var remaining = DISCOVERABLE_TIMEOUT_TIME -
          ((new Date()).getTime() - this._disableTimestamp);
        var remainingTimeText = this._formatToMS(Math.round(remaining / 1000));
        Debug('_updateVisibilityRemainingTime(): remainingTimeText = ' +
              remainingTimeText);
        Localize(elements.visible.visibleMsg,
                 'bluetooth-visibility-disable-countdown-msg',
                 {remainingTime: remainingTimeText});
      },

      _formatToMS: function(sec, format) {
        var min = 0;
        if (sec >= 3600) {
          return 'unexpected';
        }

        if (sec >= 60) {
          min = Math.floor(sec / 60);
          sec -= min * 60;
        }

        sec = (sec < 10) ? '0' + sec : sec;
        return min + ':' + sec;
      },

      _updateRenameItem: function(state) {
        Debug('_updateRenameItem(): ' +
              'callback from observe "state" = ' + state);
        elements.rename.renameItem.hidden =
          ((state === 'enabled') || (state === 'enabling')) ? false : true;
      },

      _updateRenameDesc: function(name) {
        Debug('_updateRenameDesc(): ' +
              'callback from observe "name" = ' + name);
        elements.rename.renameDescription.textContent = name;
      },

      _updatePairedDevicesHeader: function(hasPairedDevice) {
        Debug('_updatePairedDevicesHeader(): ' +
              'callback from observe "hasPairedDevice" = ' + hasPairedDevice);
        elements.paired.pairedDevicesHeader.hidden =
          (hasPairedDevice && (BtContext.state === 'enabled')) ? false : true;
      },

      _updatePairedDevicesList: function(state) {
        Debug('_updatePairedDevicesList(): ' +
              'callback from observe "state" = ' + state);
        elements.paired.pairedDevicesHeader.hidden =
          ((state === 'enabled') && (BtContext.hasPairedDevice)) ? false : true;
        elements.paired.pairedDevicesList.hidden =
          (state === 'enabled') ? false : true;
      },

      _updateFoundDevicesList: function(state) {
        Debug('_updateFoundDevicesList(): ' +
              'callback from observe "state" = ' + state);
        elements.found.foundDevicesHeader.hidden =
          (state === 'enabled') ? false : true;
        elements.found.foundDevicesList.hidden =
          (state === 'enabled') ? false : true;
      },

      _updateSearchItem: function(state) {
        Debug('_updateSearchItem(): ' +
              'callback from observe "state" = ' + state);
        elements.search.searchItem.hidden =
          (state === 'enabled') ? false : true;
      },

      _updateSearchingItem: function(discovering) {
        Debug('_updateSearchingItem(): ' +
              'callback from observe "discovering" = ' + discovering);
        elements.search.searchingItem.hidden = !discovering;
        elements.search.searchButton.disabled = discovering;
      },

      _onSearchButtonClick: function() {
        Debug('_onSearchButtonClick():');
        BtContext.startDiscovery().then(() => {
          Debug('_onSearchButtonClick(): startDiscovery successfully');
        }, (reason) => {
          Debug('_onSearchButtonClick(): startDiscovery failed, ' +
                'reason = ' + reason);
        });
      },

      _onPairedDeviceItemClick: function(deviceItem) {
        Debug('_onPairedDeviceItemClick(): deviceItem.address = ' +
              deviceItem.address);
        Debug('_onPairedDeviceItemClick(): deviceItem.paired = ' +
              deviceItem.paired);
        // Pop out dialog and show operation correspond to device paired device
        // type.
        switch (deviceItem.type) {
          case 'audio-card':
          case 'audio-input-microphone':
            // We only support 'audio-card', 'audio-input-microphone' device 
            // to connect. Before pop out a dialog for operation, we should
            // check the paired device is connected or not.
            this._showActionMenu(deviceItem);
            break;
          default:
            // These devices are supported to pair/unpair only.
            // Pop confirmation dialog to make sure user's decision.
            this._confirmUserWantToUnpairDevice(deviceItem);
            break;
        }
      },

      _showActionMenu: function(deviceItem) {
        if (deviceItem.connectionStatus === 'connected') {
          elements.actionMenu.connectOption.style.display = 'none';
          elements.actionMenu.disconnectOption.style.display = 'block';
          elements.actionMenu.disconnectOption.onclick = () => {
            BtConnectionManager.disconnect(deviceItem.data);
            elements.actionMenu.actionMenuDialog.hidden = true;
          };
          elements.actionMenu.unpairOption.onclick = () => {
            // Show a confirmation dialog while a user wants to unpair 
            // the connected device. Because the device is connected to use now.
            this._confirmUserWantToUnpairDeviceWhileItisConnected(deviceItem);
            elements.actionMenu.actionMenuDialog.hidden = true;
          };
        } else if (deviceItem.connectionStatus === 'disconnected') {
          elements.actionMenu.connectOption.style.display = 'block';
          elements.actionMenu.disconnectOption.style.display = 'none';
          elements.actionMenu.unpairOption.onclick = () => {
            this._confirmToUnpair(deviceItem);
            elements.actionMenu.actionMenuDialog.hidden = true;
          };
          elements.actionMenu.connectOption.onclick = () => {
            this._connectHeadsetDevice(deviceItem);
            elements.actionMenu.actionMenuDialog.hidden = true;
          };
        }

        elements.actionMenu.cancelOption.onclick = () => {
          elements.actionMenu.actionMenuDialog.hidden = true;
        };
        // Show the action menu.
        elements.actionMenu.actionMenuDialog.hidden = false;
      },

      _confirmUserWantToUnpairDeviceWhileItisConnected: function(deviceItem) {
        var messageL10nId = {
          id: 'unpair-msg'
        };
        var titleL10nId = 'unpair-title';

        DialogService.confirm(messageL10nId, {
          title: titleL10nId,
          submitButton: 'ok',
          cancelButton: 'cancel'
        }).then((result) => {
          var type = result.type;
          if (type === 'submit') {
            this._confirmToUnpair(deviceItem);
          } else {
            // Just return here since user give up to unpair.
            return;
          }
        });
      },

      _confirmUserWantToUnpairDevice: function(deviceItem) {
        var messageL10nId = {
          id: 'device-option-unpair-device'
        };
        var titleL10nId = 'device-option-unpair-confirmation';

        DialogService.confirm(messageL10nId, {
          title: titleL10nId,
          submitButton: {
            id: 'device-option-confirm',
            style: 'danger'
          },
          cancelButton: 'cancel'
        }).then((result) => {
          var type = result.type;
          if (type === 'submit') {
            this._confirmToUnpair(deviceItem);
          } else {
            // Just return here since user give up to unpair.
            return;
          }
        });
      },

      _confirmToUnpair: function(deviceItem) {
        Debug('_confirmToUnpair(): deviceItem.address = ' +
              deviceItem.address);
        BtContext.unpair(deviceItem.address).then(() => {
          Debug('_onPairedDeviceItemClick(): unpair successfully');
        }, (reason) => {
          Debug('_onPairedDeviceItemClick(): unpair failed, ' +
                'reason = ' + reason);
        });
      },

      _onFoundDeviceItemClick: function(deviceItem) {
        Debug('_onFoundDeviceItemClick(): deviceItem.address = ' +
              deviceItem.address);
        // Update device pairing status first.
        deviceItem.paired = 'pairing';
        // Pair with the remote device.
        BtContext.pair(deviceItem.address).then(() => {
          Debug('_onFoundDeviceItemClick(): pair successfully');
          // Connect the device which is just paired.
          this._connectHeadsetDevice(deviceItem);
        }, (reason) => {
          Debug('_onFoundDeviceItemClick(): pair failed, ' +
                'reason = ' + reason);
          // Reset the paired status back to false, 
          // since the 'pairing' status is given in Gaia side.
          deviceItem.paired = false;
          // Show alert message while pair device failed.
          this._alertPairFailedErrorMessage(reason);
        });
      },

      _connectHeadsetDevice: function(deviceItem) {
        if (!((deviceItem.type === 'audio-card') ||
              (deviceItem.type === 'audio-input-microphone'))) {
          return;
        }

        BtConnectionManager.connect(deviceItem.data).then(() => {
          Debug('_connectHeadsetDevice(): connect device successfully');
        }, (reason) => {
          Debug('_connectHeadsetDevice(): connect device failed, ' + 
                'reason = ' + reason);
          // Show alert message while connect device failed.
          this._alertConnectErrorMessage();
        });
      },

      _alertConnectErrorMessage: function() {
        DialogService.alert('error-connect-msg', {title: 'settings'});
      },

      _alertPairFailedErrorMessage: function(errorReason) {
        var errorMessage = 'error-pair-title'; // This is a default message.
        if (errorReason === 'Repeated Attempts') {
          errorMessage = 'error-pair-toofast';
        } else if (errorReason === 'Authentication Failed') {
          errorMessage = 'error-pair-pincode';
        }
        DialogService.alert(errorMessage, {title: 'error-pair-title'});
      }
    });
  };
});
