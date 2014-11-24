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
    return new AlertDialog(panelDOM, options);
  };
});
