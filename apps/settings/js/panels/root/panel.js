define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var Root = require('panels/root/root');
  var StorageUSB = require('panels/root/storage_usb');
  var StorageApp = require('panels/root/storage_app');
  var StorageMedia = require('panels/root/storage_media');

  return function ctor_root_panel() {
    var root = Root();
    var storage_usb = StorageUSB();
    var storage_app = StorageApp();
    var storage_media = StorageMedia();

    return SettingsPanel({
      onInit: function rp_onInit(panel) {
        var elements = {
          appStorageDesc: panel.querySelector('.application-storage-desc'),
          mediaStorageDesc: panel.querySelector('.media-storage-desc'),
          umsEnabledCheckBox: panel.querySelector('.ums-switch-root'),
          umsEnabledInfoBlock: panel.querySelector('.ums-desc-root'),
          umsWarningDialog: panel.querySelector('.turn-on-ums-dialog'),
          umsConfirmButton: panel.querySelector('.ums-confirm-option'),
          umsCancelButton: panel.querySelector('.ums-cancel-option'),
          mediaStorageSection: panel.querySelector('.media-storage-section')
        };

        storage_usb.init(elements);
        storage_app.init(elements);
        storage_media.init(elements);
        root.init();
      },
      onBeforeShow: function kalp_onBeforeShow() {
        storage_usb.enabled = true;
        storage_app.enabled = true;
        storage_media.enabled = true;
      },
      onShow: function rp_onShow() {
        // XXX: Set data-ready to true to indicate that the first panel is
        //      displayed and we are ready to use animations for the later panel
        //      transitions. This should be moved to startup.js after we handle
        //      inline activities there.
        document.body.dataset.ready = true;
      },
      onHide: function kalp_onHide() {
        storage_usb.enabled = false;
        storage_app.enabled = false;
        storage_media.enabled = false;
      }
    });
  };
});
