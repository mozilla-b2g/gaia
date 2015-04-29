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
    var submitButton = this._options.submitButton;
    var cancelButton = this._options.cancelButton;

    this._updateMessage(message);
    this._updateTitle(title);
    this._updateSubmitButton(submitButton);
    this._updateCancelButton(cancelButton);
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
    if (messageDOM && message) {
      message = this._getWrapL10nObject(message);
      navigator.mozL10n.setAttributes(messageDOM, message.id, message.args);
    }
  };

  BaseDialog.prototype._updateTitle = function bd__updateTitle(title) {
    var titleDOM = this.panel.querySelector(this.TITLE_SELECTOR);
    if (titleDOM && title) {
      title = this._getWrapL10nObject(title);
      navigator.mozL10n.setAttributes(titleDOM, title.id, title.args);
    }
  };

  BaseDialog.prototype._updateSubmitButton = function bd__update(options) {
    var buttonDOM = this.getSubmitButton();
    if (buttonDOM && options) {
      options = this._getWrapL10nObject(options);
      navigator.mozL10n.setAttributes(buttonDOM, options.id, options.args);
      buttonDOM.className = options.style || 'recommend';
    }
  };

  BaseDialog.prototype._updateCancelButton = function bd__updateText(options) {
    var buttonDOM = this.getCancelButton();
    if (buttonDOM && options) {
      options = this._getWrapL10nObject(options);
      navigator.mozL10n.setAttributes(buttonDOM, options.id, options.args);
      buttonDOM.className = options.style || '';
    }
  };

  BaseDialog.prototype._getWrapL10nObject =
    function bd__getWrapL10nObject(input) {
      if (typeof input === 'string') {
        return {id: input, args: null};
      } else if (typeof input === 'object') {
        if (typeof input.id === 'undefined') {
          throw new Error('You forgot to put l10nId - ' +
            JSON.stringify(input));
        } else {
          return {id: input.id, args: input.args || null, style: input.style};
        }
      } else {
        throw new Error('You are using the wrong L10nObject, ' +
          'please check its format again');
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
    // We only have to restore system-wise panels instead of custom panels
    if (this.DIALOG_CLASS !== 'panel-dialog') {
      this._updateTitle('settings-' + this.DIALOG_CLASS + '-header');
      this._updateSubmitButton('ok');
      this._updateCancelButton('cancel');
    }

    // clear all added classes
    this.panel.classList.remove(this.DIALOG_CLASS);
    this.panel.classList.remove(this.TRANSITION_CLASS);
  };

  return BaseDialog;
});
