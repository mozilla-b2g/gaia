define(function(require) {
  'use strict';
  var SettingsPanel = require('modules/settings_panel');
  var queryRootForLowPriorityItems = function(panel) {
    // This is a map from the module name to the object taken by the constructor
    // of the module.
    var storageDialog = document.querySelector('.turn-on-ums-dialog');
    return {
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
      'SimSecurityItem': panel.querySelector('.simCardLock-desc')
    };
  };

  return function ctor_root_panel() {
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

    return SettingsPanel({
      onInit: function rp_onInit(panel) {
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
        if (initLowPriorityItemsPromise) {
          initLowPriorityItemsPromise.then(function(items) {
            Object.keys(items).forEach((key) => items[key].enabled = true);
          });
        }
      },
      onHide: function rp_onHide() {
        if (initLowPriorityItemsPromise) {
          initLowPriorityItemsPromise.then(function(items) {
            Object.keys(items).forEach((key) => items[key].enabled = false);
          });
        }
      }
    });
  };
});
