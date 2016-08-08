define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var BrowsingPrivacy = require('panels/browsing_privacy/browsing_privacy');

  var browsingPrivacy = BrowsingPrivacy();

  var clearDialog, clearDialogOk, clearDialogCancel, clearDialogMessage;
  var clearHistoryButton, clearPrivateDataButton, clearDialogHeading;

  function onInit(panel) {
    clearDialog = panel.querySelector('.clear-dialog');
    clearDialogOk = panel.querySelector('.clear-dialog-ok');
    clearDialogCancel = panel.querySelector('.clear-dialog-cancel');
    clearDialogMessage = panel.querySelector('.clear-dialog-message');

    clearHistoryButton = panel.querySelector('.clear-history-button');
    clearPrivateDataButton = panel.querySelector('.clear-private-data-button');
    clearDialogHeading = panel.querySelector('.clear-dialog-heading');
    clearHistoryButton.addEventListener('click',
      handleClearHistoryClick);
    clearPrivateDataButton.addEventListener('click',
      handleClearPrivateDataClick);
  }

  /**
   * Handle clear history button click.
   */
  function handleClearHistoryClick() {
    clearDialogHeading.setAttribute('data-l10n-id', 'confirm-clear-browsing-history');
    showClearDialog('confirm-clear-browsing-history-message',
                    browsingPrivacy.clearHistory);
  }

  /**
   * Handle clear private data button click.
   */
  function handleClearPrivateDataClick() {
    clearDialogHeading.setAttribute('data-l10n-id', 'clear-cookies-and-stored-data');
    showClearDialog('confirm-clear-cookies-and-stored-data-message',
                    browsingPrivacy.clearPrivateData);
  }

  function showClearDialog(description, callback) {
    var ok = function(e) {
      e.preventDefault();
      removeEventListeners();
      clearDialog.hidden = true;
      callback();
    };

    var cancel = function(e) {
      e.preventDefault();
      removeEventListeners();
      clearDialog.hidden = true;
    };

    var removeEventListeners = function() {
      clearDialogOk.removeEventListener('click', ok);
      clearDialogCancel.removeEventListener('click', cancel);
    };

    clearDialogOk.addEventListener('click', ok);
    clearDialogCancel.addEventListener('click', cancel);

    clearDialogMessage.setAttribute('data-l10n-id', description);
    clearDialog.hidden = false;
  }

  function onUninit() {
    clearHistoryButton.removeEventListener('click',
      handleClearHistoryClick);
    clearPrivateDataButton.removeEventListener('click',
      handleClearPrivateDataClick);
  }

  return function() {
    return SettingsPanel({
      onInit: onInit,
      onUninit: onUninit
    });
  };
});
