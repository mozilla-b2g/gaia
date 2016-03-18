/* global SpatialNavigationHelper */
define(function(require) {
  'use strict';

  var BaseDialog = require('modules/dialog/base_dialog');

  var ConfirmDialog = function(panelDOM, options) {
    BaseDialog.call(this, panelDOM, options);
  };

  ConfirmDialog.prototype = Object.create(BaseDialog.prototype);
  ConfirmDialog.prototype.constructor = ConfirmDialog;
  ConfirmDialog.prototype.DIALOG_CLASS = 'confirm-dialog';
  ConfirmDialog.prototype.TRANSITION_CLASS = 'fade';

  ConfirmDialog.prototype.bindEvents = function() {
    var self = this;

    this.getSubmitButton().onclick = function() {
      self._options.onWrapSubmit();
    };

    this.getCancelButton().onclick = function() {
      self._options.onWrapCancel();
    };
  };

  return function ctor_confirmDialog(panelDOM, options) {
    var dialog = new ConfirmDialog(panelDOM, options);
    const SN_ROOT = 'body.spatial-navigation .current.' + dialog.DIALOG_CLASS;
    // Support keyboard navigation in ConfirmDialog
    SpatialNavigationHelper.add({
      id: 'confirm-dialog',
      selector: SN_ROOT + ' button',
      restrict: 'self-only',
      enterTo: 'last-focused'
    });
    dialog.spatialNavigationId = dialog.DIALOG_CLASS;
    return dialog;
  };
});
