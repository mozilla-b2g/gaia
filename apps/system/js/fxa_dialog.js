/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
'use strict';

(function(exports) {

  /**
   * @class FxAccountsDialog
   * @param {options} object for attributes `onShow`, `onHide` callback.
   * @extends SystemDialog
   */
  var FxAccountsDialog = function FxAccountsDialog(options) {
    if (options) {
      this.options = options;
    }
    /**
     * render the dialog
     */
    this.render();
    this.publish('created');
  };

  FxAccountsDialog.prototype.__proto__ = window.SystemDialog.prototype;

  FxAccountsDialog.prototype.customID = 'fxa-dialog';

  FxAccountsDialog.prototype.DEBUG = false;

  FxAccountsDialog.prototype.view = function fxad_view() {
    return '<div id="' + this.instanceID + '"></div>';
  };

  FxAccountsDialog.prototype.getView = function fxad_view() {
    return document.getElementById(this.instanceID);
  };

  // Get all elements when inited.
  FxAccountsDialog.prototype._fetchElements =
    function fxad__fetchElements() {

  };

  // Register events when all elements are got.
  FxAccountsDialog.prototype._registerEvents =
    function fxad__registerEvents() {

    };

  exports.FxAccountsDialog = FxAccountsDialog;

}(window));
