define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var Root = require('panels/root/root');
  var Storage = require('panels/root/storage');

  return function ctor_root_panel() {
    var root = Root();
    var storage = Storage();

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

        storage.init(elements);
        root.init();
      },
      onShow: function rp_onShow() {
        // XXX: Set data-ready to true to indicate that the first panel is
        //      displayed and we are ready to use animations for the later panel
        //      transitions. This should be moved to startup.js after we handle
        //      inline activities there.
        document.body.dataset.ready = true;
      }
    });
  };
});
