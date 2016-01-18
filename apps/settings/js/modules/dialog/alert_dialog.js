/* global SpatialNavigationHelper */
define(function(require) {
  'use strict';

  var BaseDialog = require('modules/dialog/base_dialog');

  var AlertDialog = function(panelDOM, options) {
    BaseDialog.call(this, panelDOM, options);
  };

  AlertDialog.prototype = Object.create(BaseDialog.prototype);
  AlertDialog.prototype.constructor = AlertDialog;
  AlertDialog.prototype.DIALOG_CLASS = 'alert-dialog';
  AlertDialog.prototype.TRANSITION_CLASS = 'fade';

  AlertDialog.prototype.bindEvents = function() {
    var self = this;

    this.getSubmitButton().onclick = function() {
      self._options.onWrapSubmit();
    };
  };

  return function ctor_alertDialog(panelDOM, options) {
    var dialog = new AlertDialog(panelDOM, options);
    const SN_ROOT = 'body.spatial-navigation .current.' + dialog.DIALOG_CLASS;
    // Support keyboard navigation in AlertDialog
    SpatialNavigationHelper.add({
      id: 'alert-dialog',
      selector: SN_ROOT + ' button',
      restrict: 'self-only',
      enterTo: 'last-focused'
    });
    dialog.spatialNavigationId = dialog.DIALOG_CLASS;
    return dialog;
  };
});
