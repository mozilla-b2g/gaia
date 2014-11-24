define(function(require) {
  'use strict';

  var BaseDialog = require('modules/dialog/base_dialog');

  var PromptDialog = function(panelDOM, options) {
    BaseDialog.call(this, panelDOM, options);
  };

  PromptDialog.prototype = Object.create(BaseDialog.prototype);
  PromptDialog.prototype.constructor = PromptDialog;
  PromptDialog.prototype.DIALOG_CLASS = 'prompt-dialog';
  PromptDialog.prototype.TRANSITION_CLASS = 'fade';
  PromptDialog.prototype.INPUT_SELECTOR = '.settings-dialog-input';

  PromptDialog.prototype.bindEvents = function() {
    var self = this;

    this.getSubmitButton().onclick = function() {
      self._options.onWrapSubmit();
    };

    this.getCancelButton().onclick = function() {
      self._options.onWrapCancel();
    };
  };

  PromptDialog.prototype.initUI = function() {
    BaseDialog.prototype.initUI.call(this);
    this.getInput().value = this._options.defaultValue || '';
  };

  PromptDialog.prototype.getInput = function() {
    return this.panel.querySelector(this.INPUT_SELECTOR);
  };

  PromptDialog.prototype.getResult = function() {
    return this.getInput().value;
  };

  return function ctor_promptDialog(panelDOM, options) {
    return new PromptDialog(panelDOM, options);
  };
});
