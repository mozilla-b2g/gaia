/*
 * SettingsUtils is a singleton that we will provide all needed methods
 * when doing panel related actions.
 *
 * @module SettingsUtils
 */
define(function(require) {
  'use strict';

  // TODO
  // We need to move utils.js to SettingsUtils step by step
  var SettingsService = require('modules/settings_service');
  var SettingsUtils = {
    /*
     * This method can help you make target panel as a dialog and
     * you can pass needed options into it.
     *
     * @memberOf SettingsUtils
     * @param {String} dialogID - ID of target panel
     * @param {Object} userOptions - passed options
     */
    openDialog: function(dialogID, userOptions) {
      if ('#' + dialogID == Settings.currentPanel) {
        return;
      }

      var origin = Settings.currentPanel.match(/#(.*)/)[1];
      var options = userOptions || {};
      var onSubmit = options.onSubmit;
      var onReset = options.onReset;

      // Don't bypass these two functions inside panel
      delete options.onSubmit;
      delete options.onReset;

      // Load dialog contents and show it.
      SettingsService.navigate(dialogID, options);

      var dialog = document.getElementById(dialogID);
      var submit = dialog.querySelector('[type=submit]');
      if (submit) {
        submit.onclick = function onsubmit() {
          // hide dialog box and we would call a callback after navigation
          SettingsService.navigate(origin, {}, function() {
            onSubmit.call(dialog);
          });
        };
      }

      var reset = dialog.querySelector('[type=reset]');
      if (reset) {
        reset.onclick = function onreset() {
          if (typeof onReset === 'function') {
            onReset.call(dialog);
          }
          // hide dialog box
          SettingsService.navigate(origin);
        };
      }
    }
  };

  return SettingsUtils;
});
