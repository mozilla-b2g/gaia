/**
 * The screen reader confirmation dialog
 */

define(function(require) {
  'use strict';

  var SettingsListener = require('shared/settings_listener');

  var _elements;
  var _enable;

  var ConfirmDialog = {
    init: function ConfirmDialog_init(elements, onConfirmDialog) {
      _elements = elements;

      _elements.container.onclick = function() {
        _elements.container.hidden = true;
      };

      _elements.confirmButton.onclick = function(e) {
        SettingsListener.getSettingsLock().set(
          { 'accessibility.screenreader' : _enable });
      };
    },

    show: function ConfirmDialog_show(enable) {
      _enable = enable;
      var startStop = enable ? 'start' : 'stop';
      _elements.heading.setAttribute(
        'data-l10n-id', 'screenReader-confirm-title-' + startStop);
      _elements.text.setAttribute(
        'data-l10n-id', 'screenReader-confirm-description-' + startStop);
      _elements.confirmButton.setAttribute(
        'data-l10n-id', 'screenReader-confirm-button-' + startStop);
      _elements.container.hidden = false;
    }
  };

  return ConfirmDialog;
});
