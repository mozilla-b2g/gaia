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
    return new ConfirmDialog(panelDOM, options);
  };
});
