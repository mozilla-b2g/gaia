define(function(require) {
  'use strict';

  var BaseDialog = function(panelDOM, options) {
    this.panel = panelDOM;
    this._options = options || {};
  };

  BaseDialog.prototype.DIALOG_CLASS = 'dialog';
  BaseDialog.prototype.TRANSITION_CLASS = 'fade';
  BaseDialog.prototype.SUBMIT_BUTTON_SELECTOR = '[type="submit"]';
  BaseDialog.prototype.CANCEL_BUTTON_SELECTOR = '[type="reset"]';
  BaseDialog.prototype.MESSAGE_SELECTOR = '.settings-dialog-message';
  BaseDialog.prototype.TITLE_SELECTOR = '.settings-dialog-title';

  BaseDialog.prototype.init = function bd_init() {
    // We can override animation class from options
    this.TRANSITION_CLASS = this._options.transition || this.TRANSITION_CLASS;
    this.panel.classList.add(this.DIALOG_CLASS);
    this.panel.classList.add(this.TRANSITION_CLASS);
  };

  BaseDialog.prototype.initUI = function bd_initUI() {
    var message = this._options.message || '';
    var title = this._options.title || '';
    var submitButtonText = this._options.submitButtonText ||  '';
    var cancelButtonText = this._options.cancelButtonText || '';

    this._updateMessages(message);
    this._updateTitle(title);
    this._updateSubmitButtonText(submitButtonText);
    this._updateCancelButtonText(cancelButtonText);
  };

  BaseDialog.prototype.bindEvents = function bd_bindEvent() {
    var self = this;

    this.getSubmitButton().onclick = function() {
      self._options.onWrapSubmit();
    };

    this.getCancelButton().onclick = function() {
      self._options.onWrapCancel();
    };
  };

  BaseDialog.prototype._updateMessages = function bd__updateMessages(message) {
    var messageDOMs = this.panel.querySelectorAll(this.MESSAGE_SELECTOR);
    for (var i = 0; i < messageDOMs.length; i++) {
      messageDOMs[i].textContent = message;
    }
  };

  BaseDialog.prototype._updateTitle = function bd__updateTitle(title) {
    var titleDOM = this.panel.querySelector(this.TITLE_SELECTOR);
    if (titleDOM && title) {
      titleDOM.textContent = title;
    }
  };

  BaseDialog.prototype._updateSubmitButtonText = function bd__updateText(text) {
    var buttonDOM = this.getSubmitButton();
    if (buttonDOM && text) {
      buttonDOM.textContent = text;
    }
  };

  BaseDialog.prototype._updateCancelButtonText = function bd__updateText(text) {
    var buttonDOM = this.getCancelButton();
    if (buttonDOM && text) {
      buttonDOM.textContent = text;
    }
  };

  BaseDialog.prototype.getDOM = function bd_getDOM() {
    return this.panel;
  };

  BaseDialog.prototype.getSubmitButton = function bd_getSubmitButton() {
    return this.panel.querySelector(this.SUBMIT_BUTTON_SELECTOR);
  };

  BaseDialog.prototype.getCancelButton = function bd_getCancelButton() {
    return this.panel.querySelector(this.CANCEL_BUTTON_SELECTOR);
  };

  BaseDialog.prototype.cleanup = function bd_cleanup() {
    // reset predefined values
    this._updateTitle('');
    this._updateMessages('');

    // clear all added classes
    this.panel.classList.remove(this.DIALOG_CLASS);
    this.panel.classList.remove(this.TRANSITION_CLASS);
  };

  return BaseDialog;
});
