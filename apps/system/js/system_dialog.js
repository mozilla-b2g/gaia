/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
/* global LayoutManager */
'use strict';

(function(exports) {

  /**
   * System app displays various kind of dialogs.
   * A dialog is a system app 'screen' that has a high z-index and is used to be
   * displayed on top of other apps. But it doesn't display over the status bar,
   * nor the eventually displayed keyboard.
   *
   * These system dialogs is located:
   * <div id="dialog-overlay" data-z-index-level="dialog-overlay">
   *   <!-- SystemDialogs -->
   * </div> <!-- end of #overlay-dialog -->
   *
   * `SystemDialog` except the dialog DOM Element `id`. And need to give the id
   * in subclass `customID`.
   * This DOM Element has to have a DOM attribute 'role' set to 'dialog'.
   *
   * It also supports a `options` object with following attributes:
   *  `onShow`: function called when dialog is shown.
   *  `onHide`: function called when dialog is hidden, either when `hide()`
   *            method is called, or when dialog is automatically hidden on
   *            home button press
   *
   * @class SystemDialog
   * @requires LayoutManager
   * @param {Object} options for attributes `onShow`, `onHide` callback
   * @extends BaseUI
   */
  var SystemDialog = function SystemDialog(options) {
    if (options) {
      this.options = options;
    }
    this.render();
    this.publish('created');
  };

  SystemDialog.prototype.__proto__ = window.BaseUI.prototype;

  SystemDialog.prototype.CLASS_NAME = 'SystemDialog';

  SystemDialog.prototype.containerElement =
    document.getElementById('dialog-overlay');

  /**
   * We would maintain our own events by other components.
   *
   * @type string
   * @memberof SystemDialog
   */
  SystemDialog.prototype.EVENT_PREFIX = 'system-dialog-';

  /**
   * System Dialog custom id
   * Override me. Human readable ID. The ID should be unique.
   */
  SystemDialog.prototype.customID = function sd_customID() {
    return '';
  };

  /**
   * System Dialog html view
   * Override me. It's able to customize your layout.
   */
  SystemDialog.prototype.view = function sd_view() {
    return '';
  };

  /**
   * Operations to render UI
   * Overwrite `view` to provide HTML interface.
   */
  SystemDialog.prototype.render = function sd_render() {
    this.generateID();
    this.containerElement.insertAdjacentHTML('beforeend', this.view());
    this._fetchElements();
    this._registerEvents();
    this.element = document.getElementById(this.instanceID);
  };

  /**
   * Listen to 'system-resize' event from SystemDialogManager
   * in order to resize the dialog accordingly.
   */
  SystemDialog.prototype.resize = function sd_resize() {
    this.updateHeight();
  };

  /**
   * Update dialog height via LayoutManager
   */
  SystemDialog.prototype.updateHeight = function sd_updateHeight() {
    var height = LayoutManager.availableHeight;
    this.containerElement.style.height = height + 'px';
    this.debug('updateHeight: new height = ' + height);
  };

  /**
   * Publish 'show' event for activate the dialog
   */
  SystemDialog.prototype.show = function sd_show() {
    this.element.hidden = false;
    this.element.classList.add(this.customID);
    this.onShow();
    this.updateHeight();
    this.publish('show');
  };

  /**
   * Publish 'hide' event for deactivate the dialog
   * @param  {String} reason The name of the reason from the caller.
   * @param  {boolean} isManagerRequest True: The caller is SystemDialogManager.
   */
  SystemDialog.prototype.hide = function sd_hide(reason, isManagerRequest) {
    // The 'reason' is coming from the dialog controller or SystemDialogManager.
    // After the dialog is hidden, pass the reason to its controller via onHide.
    this.element.hidden = true;
    this.element.classList.remove(this.customID);
    this.onHide(reason);
    // If the caller is SystemDialogManager,
    // no need publish 'hide' event to SystemDialogManager.
    if (!isManagerRequest) {
      // Always publish 'hide' event to SystemDialogManager
      // while the dialog request 'hide' from its controller.
      this.publish('hide');
    }
  };

  /**
   * The 'onShow' callback function while a dialog is just shown
   */
  SystemDialog.prototype.onShow = function sd_onShow(reason) {
    if (typeof(this.options.onShow) == 'function') {
      this.options.onShow(reason);
    }
  };

  /**
   * The 'onHide' callback function while a dialog is just hidden
   */
  SystemDialog.prototype.onHide = function sd_onHide(reason) {
    if (typeof(this.options.onHide) == 'function') {
      this.options.onHide(reason);
    }
  };

  /**
   * Generate instanceID of this instance.
   * Use customID to be instanceID since it's unique.
   */
  SystemDialog.prototype.generateID = function sd_generateID() {
    if (!this.instanceID) {
      this.instanceID = this.customID;
    }
  };

  exports.SystemDialog = SystemDialog;

}(window));
