define(function(require) {
  'use strict';

  // TODO
  // We need to move utils.js to SettingsUtils step by step
  var SettingsService = require('modules/settings_service');
  var SettingsUtils = {
    openDialog: function(dialogID, userOptions) {
      if ('#' + dialogID == Settings.currentPanel) {
        return;
      }

      var origin = Settings.currentPanel.match(/#(.*)/)[1];
      var options = userOptions || {};
      var onSubmit = options.onSubmit || function() {};
      var onReset = options.onReset || function() {};

      // Don't bypass these two functions inside panel
      delete options.onSubmit;
      delete options.onReset;

      // Load dialog contents and show it.
      SettingsService.navigate(dialogID, options);

      var dialog = document.getElementById(dialogID);
      var submit = dialog.querySelector('[type=submit]');
      if (submit) {
        submit.onclick = function onsubmit() {
          if (typeof onSubmit === 'function') {
            (onSubmit.bind(dialog))();
          }
          // hide dialog box
          SettingsService.navigate(origin);
        };
      }

      var reset = dialog.querySelector('[type=reset]');
      if (reset) {
        reset.onclick = function onreset() {
          if (typeof onReset === 'function') {
            (onReset.bind(dialog))();
          }
          // hide dialog box
          SettingsService.navigate(origin);
        };
      }
    }
  };

  return SettingsUtils;
});
