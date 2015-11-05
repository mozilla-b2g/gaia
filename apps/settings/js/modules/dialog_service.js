/**
 * DialogService is a singleton that provides few ways for you to show/hide
 * dialogs. Here, we predefined alert/confirm/prompt dialogs to replace
 * window.alert/window.confirm/window.prompt if you want any further controls
 * of animations and UI.
 *
 * And also, there is one more dialog called panelDialog that would be used
 * when you are going to show any predefined panel in dialog way.
 *
 * API:
 *
 * 1. Alert dialog
 *
 * DialogService.alert({
 *   id: 'MessageId',
 *   args: {}
 * }, {
 *   title: { id: 'TitleId', args: {} }
 * })
 * .then(function(result) {
 *   var type = result.type;
 * });
 *
 * NOTE:
 * If there is no args in locales, you can direclty pass l10nId without args.
 *
 * DialogService.alert('MessageId', {
 *   title: 'TitleId'
 * })
 * .then(function(result) {
 *   var type = result.type;
 * });
 *
 * 2. Confirm dialog
 *
 * DialogService.confirm({
 *   id: 'MessageId',
 *   args: {}
 * }, {
 *   title: { id: 'TitleId', args: {} },
 *   submitButton: { id: 'SubmitButtonId', args: {}, style: 'recommend' },
 *   cancelButton: { id: 'CancelButtonId', args: {} }
 * })
 * .then(function(result) {
 *   var type = result.type;
 * });
 *
 * 3. Prompt dialog
 * 
 * DialogService.prompt({
 *   id: 'MessageId',
 *   args: {}
 * }, {
 *   title: { id: 'TitleId', args: {} },
 *   defaultValue: 'e.g. test@mozilla.com',
 * }).then(function(result) {
 *   var type = result.type;
 *   var value = result.value;
 * });
 *
 * 4. Panel dialog
 *
 * DialogService.show('screen-lcok', {
 *   transition: 'zoom-in',
 * }).then(function(result) {
 *   // type would be submit or cancel
 *   var type = result.type;
 *   var value = result.value;
 * });
 *
 * NOTES:
 * We support some customized options for each dialog, please check the API
 * below to know what you can customize !
 *
 * @module DialogService
 */
define(function(require) {
  'use strict';

  var Settings = require('settings');
  var Defer = require('modules/defer');
  var DialogManager = require('modules/dialog_manager');

  var PanelDialog = require('modules/dialog/panel_dialog');
  var AlertDialog = require('modules/dialog/alert_dialog');
  var ConfirmDialog = require('modules/dialog/confirm_dialog');
  var PromptDialog = require('modules/dialog/prompt_dialog');

  var DialogService = function() {
    this._navigating = false;
    this._pendingRequests = [];
    this._settingsAlertDialogId = 'settings-alert-dialog';
    this._settingsBaseDialogId = 'settings-base-dialog';
    this._settingsConfirmDialogId = 'settings-confirm-dialog';
    this._settingsPromptDialogId = 'settings-prompt-dialog';
  };

  DialogService.prototype = {
    /**
     * Alert dialog with more controls.
     *
     * @memberOf DialogService
     * @access public
     * @param {String} message
     * @param {Object} userOptions
     * @return {Promise}
     */
    alert: function(message, userOptions) {
      var options = userOptions || {};
      return this.show(this._settingsAlertDialogId, {
        type: 'alert',
        message: message,
        title: options.title,
        submitButton: options.submitButton
      });
    },

    /**
     * Confirm dialog with more controls.
     *
     * @memberOf DialogService
     * @access public
     * @param {String} message
     * @param {Object} userOptions
     * @return {Promise}
     */
    confirm: function(message, userOptions) {
      var options = userOptions || {};
      return this.show(this._settingsConfirmDialogId, {
        type: 'confirm',
        message: message,
        title: options.title,
        submitButton: options.submitButton,
        cancelButton: options.cancelButton
      });
    },

    /**
     * Prompt dialog with more controls.
     *
     * @memberOf DialogService
     * @access public
     * @param {String} message
     * @param {Object} userOptions
     * @return {Promise}
     */
    prompt: function(message, userOptions) {
      var options = userOptions || {};
      return this.show(this._settingsPromptDialogId, {
        type: 'prompt',
        message: message,
        title: options.title,
        defaultValue: options.defaultValue,
        submitButton: options.submitButton,
        cancelButton: options.cancelButton
      });
    },

    /**
     * Panel dialog. If you are going to show any panel as a dialog,
     * you have to use this method to show them.
     *
     * @memberOf DialogService
     * @access public
     * @param {String} panelId
     * @param {Object} userOptions
     * @return {Promise}
     */
    show: function dm_show(panelId, userOptions, _pendingDefer) {
      var self = this;
      var defer;
      var dialog;
      var dialogDOM = document.getElementById(panelId);
      var currentPanel = Settings.currentPanel;
      var options = userOptions || {};

      if (_pendingDefer) {
        defer = _pendingDefer;
      } else {
        defer = Defer();
      }

      if (this._navigating) {
        this._pendingRequests.push({
          defer: defer,
          panelId: panelId,
          userOptions: userOptions
        });
      } else {
        if ('#' + panelId === currentPanel) {
          defer.reject('You are showing the same panel #' + panelId);
        } else {
          options.onWrapSubmit = function() {
            DialogManager.close(dialog, 'submit', options)
            .then(function(result) {
              defer.resolve({
                type: 'submit',
                value: result
              });
              self._navigating = false;
              self._execPendingRequest();
            });
          };

          options.onWrapCancel = function() {
            DialogManager.close(dialog, 'cancel', options)
            .then(function(result) {
              defer.resolve({
                type: 'cancel',
                value: result
              });
              self._navigating = false;
              self._execPendingRequest();
            });
          };

          switch (options.type) {
            case 'alert':
              dialog = AlertDialog(dialogDOM, options);
              break;
            case 'confirm':
              dialog = ConfirmDialog(dialogDOM, options);
              break;
            case 'prompt':
              dialog = PromptDialog(dialogDOM, options);
              break;
            default:
              dialog = PanelDialog(dialogDOM, options);
              break;
          }
          this._navigating = true;
          DialogManager.open(dialog, options);
        }
      }

      return defer.promise;
    },

    /**
     * This method can help us pop up any pending request and would try to
     * show it after previous request was done.
     *
     * @memberOf DialogService
     * @access private
     */
    _execPendingRequest: function() {
      var request = this._pendingRequests.pop();
      if (request) {
        this.show(request.panelId, request.userOptions, request.defer);
      }
    }
  };

  var dialogService = new DialogService();
  return dialogService;
});
