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
    var message = this._options.message;
    var title = this._options.title;
    var submitButtonText = this._options.submitButtonText;
    var cancelButtonText = this._options.cancelButtonText;

    this._updateMessage(message);
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

  BaseDialog.prototype._updateMessage = function bd__updateMessage(message) {
    var messageDOM = this.panel.querySelector(this.MESSAGE_SELECTOR);
    message = this._getWrapL10nObject(message);
    navigator.mozL10n.setAttributes(messageDOM, message.id, message.args);
  };

  BaseDialog.prototype._updateTitle = function bd__updateTitle(title) {
    var titleDOM = this.panel.querySelector(this.TITLE_SELECTOR);
    if (titleDOM && title) {
      title = this._getWrapL10nObject(title);
      navigator.mozL10n.setAttributes(titleDOM, title.id, title.args);
    }
  };

  BaseDialog.prototype._updateSubmitButtonText = function bd__updateText(text) {
    var buttonDOM = this.getSubmitButton();
    if (buttonDOM && text) {
      text = this._getWrapL10nObject(text);
      navigator.mozL10n.setAttributes(buttonDOM, text.id, text.args);
    }
  };

  BaseDialog.prototype._updateCancelButtonText = function bd__updateText(text) {
    var buttonDOM = this.getCancelButton();
    if (buttonDOM && text) {
      text = this._getWrapL10nObject(text);
      navigator.mozL10n.setAttributes(buttonDOM, text.id, text.args);
    }
  };

  BaseDialog.prototype._getWrapL10nObject =
    function bd__getWrapL10nObject(input) {
      if (typeof input === 'string') {
        return {id: input, args: null};
      } else {
        if (typeof input.id === 'undefined') {
          throw new Error('You forgot to put l10nId - ' +
            JSON.stringify(input));
        } else {
          return {id: input.id, args: input.args || null};
        }
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
    // we have to change them back to original strings
    this._updateTitle('settings-' + this.DIALOG_CLASS + '-header');
    this._updateSubmitButtonText('ok');
    this._updateCancelButtonText('cancel');

    // clear all added classes
    this.panel.classList.remove(this.DIALOG_CLASS);
    this.panel.classList.remove(this.TRANSITION_CLASS);
  };

  return BaseDialog;
});
