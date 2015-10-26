define(function(require) {
  'use strict';

  var SettingsService = require('modules/settings_service');
  var SettingsPanel = require('modules/settings_panel');
  var Root = require('panels/root/root');
  var AirplaneModeItem = require('panels/root/airplane_mode_item');
  var HomescreenItem = require('panels/root/homescreen_item');
  var STKItem = require('panels/root/stk_item');
  var BTAPIVersionDetector = require('modules/bluetooth/version_detector');
  var DsdsSettings = require('dsds_settings');


  var queryRootForLowPriorityItems = function(panel) {
    // This is a map from the module name to the object taken by the constructor
    // of the module.
    var storageDialog = document.querySelector('.turn-on-ums-dialog');
    return {
      'BluetoothItem': panel.querySelector('.bluetooth-desc'),
      'NFCItem': {
        nfcMenuItem: panel.querySelector('.nfc-settings'),
        nfcCheckBox: panel.querySelector('#nfc-input')
      },
      'LanguageItem': panel.querySelector('.language-desc'),
      'BatteryItem': panel.querySelector('.battery-desc'),
      'FindMyDeviceItem': panel.querySelector('.findmydevice-desc'),
      'StorageUSBItem': {
        mediaStorageDesc: panel.querySelector('.media-storage-desc'),
        usbEnabledCheckBox: panel.querySelector('.usb-switch'),
        usbStorage: panel.querySelector('#menuItem-enableStorage'),
        usbEnabledInfoBlock: panel.querySelector('.usb-desc'),
        umsWarningDialog: storageDialog,
        umsConfirmButton: storageDialog.querySelector('.ums-confirm-option'),
        umsCancelButton: storageDialog.querySelector('.ums-cancel-option'),
        mediaStorageSection: panel.querySelector('.media-storage-section')
      },
      'StorageAppItem': panel.querySelector('.application-storage-desc'),
      'WifiItem': panel.querySelector('#wifi-desc')
    };
  };

  return function ctor_root_panel() {
    var root;
    var airplaneModeItem;
    var homescreenItem;
    var stkItem;
    var lowPriorityRoots = null;
    var initLowPriorityItemsPromise = null;
    var initLowPriorityItems = function(rootElements) {
      if (!initLowPriorityItemsPromise) {
        initLowPriorityItemsPromise = new Promise(function(resolve) {
          require(['panels/root/low_priority_items'], resolve);
        }).then(function(itemCtors) {
          var result = {};
          Object.keys(rootElements).forEach(function(name) {
            var itemCtor = itemCtors[name];
            if (itemCtor) {
              result[name] = itemCtor(rootElements[name]);
            }
          });
          return result;
        });
      }
      return initLowPriorityItemsPromise;
    };

    /**
     * Update the sim and NFC related items based on mozMobileConnections and Device.
     */

    var updateSimItemsAndNfc = function rph_refrehsSimItems() {
       if (navigator.mozMobileConnections) {
         if (navigator.mozMobileConnections.length === 1) { // single sim
           document.getElementById('simCardManager-settings').hidden = true;
         } else { // dsds
           document.getElementById('simSecurity-settings').hidden = true;
         }
       } else {
         // hide telephony panels
         var elements = ['call-settings',
                         'data-connectivity',
                         'messaging-settings'];
         elements.forEach(function(el) {
           document.getElementById(el).hidden = true;
         });
       }
       var nfcItem = document.querySelector('.nfc-settings');
        nfcItem.hidden = !navigator.mozNfc;
     };
      updateSimItemsAndNfc();

    return SettingsPanel({
      onInit: function rp_onInit(panel) {
        root = Root();
        root.init();

        airplaneModeItem =
          AirplaneModeItem(panel.querySelector('.airplaneMode-input'));
        homescreenItem =
          HomescreenItem(panel.querySelector('#homescreens-section'));
        stkItem = STKItem({
          iccEntries: panel.querySelector('#icc-entries')
        });

        // The decision of navigation panel will be removed while we are no
        // longer to use Bluetooth API v1.
        var bluetoothListItem = panel.querySelector('.menuItem-bluetooth');
        var BTAPIVersion = BTAPIVersionDetector.getVersion();
        bluetoothListItem.addEventListener('click', function() {
          if (BTAPIVersion === 1) {
            // navigate old bluetooth panel..
            SettingsService.navigate('bluetooth');
          } else if (BTAPIVersion === 2) {
            // navigate new bluetooth panel..
            SettingsService.navigate('bluetooth_v2');
          }
        });

        // If the device supports dsds, callSettings must be changed 'href' for
        // navigating call-iccs panel first.
        if (DsdsSettings.getNumberOfIccSlots() > 1) {
          var callItem = document.getElementById('menuItem-callSettings');
          callItem.setAttribute('href', '#call-iccs');
        }

        var idleObserver = {
          time: 3,
          onidle: function() {
            navigator.removeIdleObserver(idleObserver);
            lowPriorityRoots = queryRootForLowPriorityItems(panel);
            initLowPriorityItems(lowPriorityRoots).then(function(items) {
              Object.keys(items).forEach((key) => items[key].enabled = true);
            });
          }
        };
        navigator.addIdleObserver(idleObserver);
      },
      onShow: function rp_onShow(panel) {
        airplaneModeItem.enabled = true;
        homescreenItem.enabled = true;

        if (initLowPriorityItemsPromise) {
          initLowPriorityItemsPromise.then(function(items) {
            Object.keys(items).forEach((key) => items[key].enabled = true);
          });
        }
      },
      onHide: function rp_onHide() {
        airplaneModeItem.enabled = false;
        homescreenItem.enabled = false;

        if (initLowPriorityItemsPromise) {
          initLowPriorityItemsPromise.then(function(items) {
            Object.keys(items).forEach((key) => items[key].enabled = false);
          });
        }
      }
    });
  };
});
