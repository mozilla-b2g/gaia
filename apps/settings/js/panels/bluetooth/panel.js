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

  const MAX_DEVICE_NAME_LENGTH = 20;
  const VISIBLE_TIMEOUT_TIME = 120000;  // Visibility will timeout after 2 mins.

  var _debug = false;
  var Debug = function() {};
  if (_debug) {
    Debug = function btp_debug(msg) {
      console.log('--> [Bluetooth][Panel]: ' + msg);
    };
  }

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
        // Init an instance to maintain visibility timeout.
        this._visibleTimeout = null;
        // Init bounding instances for observe/un-observe property.
        this._boundUpdateEnableCheckbox = this._updateEnableCheckbox.bind(this);
        this._boundUpdateVisibleItem = this._updateVisibleItem.bind(this);
        this._boundUpdateVisibleCheckbox =
          this._updateVisibleCheckbox.bind(this);
        this._boundUpdateVisibilityTimer =
          this._updateVisibilityTimer.bind(this);
        this._boundUpdateVisibleName = this._updateVisibleName.bind(this);
        this._boundUpdateRenameItem = this._updateRenameItem.bind(this);
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
            visibleName: panel.querySelector('.bluetooth-device-name'),
            visibleCheckBox: panel.querySelector('.device-visible input')
          },
          rename: {
            renameItem: panel.querySelector('.bluetooth-rename'),
            renameButton: panel.querySelector('.rename-device')
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

        elements.rename.renameButton.addEventListener('click',
          this._onRenameButtonClick.bind(this));

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

        BtContext.observe('discoverable', this._boundUpdateVisibilityTimer);
        this._updateVisibilityTimer(BtContext.discoverable);

        BtContext.observe('name', this._boundUpdateVisibleName);
        this._updateVisibleName(BtContext.name);

        // rename
        BtContext.observe('state', this._boundUpdateRenameItem);
        this._updateRenameItem(BtContext.state);

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
        BtContext.unobserve('discoverable', this._boundUpdateVisibilityTimer);
        BtContext.unobserve('name', this._boundUpdateVisibleName);
        BtContext.unobserve('state', this._boundUpdateRenameItem);
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

      _onRenameButtonClick: function() {
        var messageL10nId = 'change-phone-name-desc';
        var titleL10nId = 'change-device-name';
        var myDeviceName = BtContext.name;
        Debug('_onRenameButtonClick(): myDeviceName = ' + myDeviceName);
        DialogService.prompt(messageL10nId, {
          title: titleL10nId,
          defaultValue: myDeviceName,
          submitButton: 'ok',
          cancelButton: 'cancel'
        }).then((result) => {
          var type = result.type;
          var value = result.value;
          if (type === 'submit') {
            this._onRenameSubmit(value);
          }
        });
      },

      _onRenameSubmit: function(nameEntered) {
        Debug('_onRenameSubmit(): nameEntered = ' + nameEntered);
        // Before set the entered name to platform, we check length of name is 
        // over threshold or not.
        nameEntered = nameEntered.replace(/^\s+|\s+$/g, '');
        if (nameEntered.length > MAX_DEVICE_NAME_LENGTH) {
          this._confirmNameEnteredOverLength();
          // Early return here since name entered is over threshold.
          return;
        }

        // Only set non-empty string to be new name. 
        // Otherwise, set name by product model.
        if (nameEntered !== '') {
          Debug('_onRenameSubmit(): set new name = ' + nameEntered);
          BtContext.setName(nameEntered).then(() => {
            Debug('_onRenameSubmit(): setName = ' +
                  nameEntered + ' successfully');
          }, (reason) => {
            Debug('_onRenameSubmit(): setName = ' +
                  nameEntered + ' failed, reason = ' + reason);
          });
        } else {
          Debug('_onRenameSubmit(): set name by product model');
          BtContext.setNameByProductModel();
        }
      },

      _confirmNameEnteredOverLength: function() {
        var messageL10nId = {
          id: 'bluetooth-name-maxlength-alert',
          args: {'length': MAX_DEVICE_NAME_LENGTH}
        };
        var titleL10nId = 'settings';

        DialogService.confirm(messageL10nId, {
          title: titleL10nId,
          submitButton: 'ok',
          cancelButton: 'cancel'
        }).then((result) => {
          var type = result.type;
          if (type === 'submit') {
            this._onRenameButtonClick();
          } else {
            // Just return here since user give up to set name.
            return;
          }
        });
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

      _updateVisibilityTimer: function(discoverable) {
        Debug('_updateVisibilityTimer(): ' +
              'callback from observe "discoverable" = ' + discoverable);
        // Visibility will time out after 2 mins.
        if (discoverable && !this._visibleTimeout) {
          Debug('_updateVisibilityTimer(): setTimeout to disable visibility ' +
                'after 2 minutes');
          this._visibleTimeout = setTimeout(() => {
            BtContext.setDiscoverable(false);
          }, VISIBLE_TIMEOUT_TIME);
          // Early return here since already set timeout.
          return;
        }

        if (!discoverable && this._visibleTimeout) {
          Debug('_updateVisibilityTimer(): clearTimeout');
          clearTimeout(this._visibleTimeout);
          this._visibleTimeout = null;
        }
      },

      _updateVisibleName: function(name) {
        Debug('_updateVisibleName(): ' +
              'callback from observe "name" = ' + name);
        elements.visible.visibleName.textContent = name;
      },

      _updateRenameItem: function(state) {
        Debug('_updateRenameItem(): ' +
              'callback from observe "state" = ' + state);
        elements.rename.renameItem.hidden =
          ((state === 'enabled') || (state === 'enabling')) ? false : true;
        elements.rename.renameButton.disabled =
          (state === 'enabled') ? false : true;
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
