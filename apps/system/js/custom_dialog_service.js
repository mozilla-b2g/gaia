/* global BaseModule, CustomDialog, LazyLoader */
'use strict';

(function() {
  /**
   * The module is grouping custom dialog request.
   * It will lazy load CustomDialog once the first request comes.
   * XXX: All custom dialogs in system app
   * should be transfered into systemDialog in the future.
   */
  var CustomDialogService = function() {};
  CustomDialogService.SERVICES = [
    'showCustomDialog',
    'hideCustomDialog'
  ];
  BaseModule.create(CustomDialogService, {
    name: 'CustomDialogService',
    showCustomDialog: function(title, msg, cancel, confirm) {
      return LazyLoader.load(['shared/js/custom_dialog.js']).then(function() {
        CustomDialog.show(title, msg, cancel, confirm,
          document.getElementById('screen'))
                    .setAttribute('data-z-index-level', 'system-dialog');
      }.bind(this));
    },
    hideCustomDialog: function() {
      if (window.CustomDialog) {
        CustomDialog && CustomDialog.hide();
      }
    }
  });  
}());
