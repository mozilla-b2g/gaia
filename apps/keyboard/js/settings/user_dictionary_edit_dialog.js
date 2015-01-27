'use strict';

/* global BaseView, KeyEvent */

/*
 * We may be in two modes: "edit mode" or "add mode".
 *
 * Its onsubmit results may be:
 *
 * {action: 'remove'} where the user deletes a word (in edit mode)
 * {action: 'commit', word: WORD} where a user edits the current word to WORD
 *   (in edit mode), or adds WORD (in add mode)
 * {action: 'cancel'} where a user cancels whatever he is doing
 *
 * Note we don't care which mode we're in when we pass the results. The caller
 * should know how to react accordingly.
 */

(function(exports) {

var UserDictionaryEditDialog = function() {
  BaseView.apply(this);

  this._inputField = null;

  this._oldWord = undefined;
};

UserDictionaryEditDialog.prototype = Object.create(BaseView.prototype);

UserDictionaryEditDialog.prototype.CONTAINER_ID = 'panel-ud-editword';

UserDictionaryEditDialog.prototype.onsubmit = undefined;

UserDictionaryEditDialog.prototype.start = function(){
  BaseView.prototype.start.call(this);

  this._inputField = this.container.querySelector('#ud-editword-input');
};

UserDictionaryEditDialog.prototype.stop = function(){
  BaseView.prototype.stop.call(this);

  this._inputField = null;
};

UserDictionaryEditDialog.prototype.beforeShow = function(options) {
  // if options have "word", we're in edit mode.
  if (options && 'word' in options) {
    this.container.classList.remove('add-mode');
    this._inputField.value = options.word;
    this._oldWord = options.word;
  } else {
    this.container.classList.add('add-mode');
  }
};

UserDictionaryEditDialog.prototype.show = function() {
  this.container.querySelector('#ud-editword-header')
    .addEventListener('action', this);

  this.container.querySelector('#ud-saveword-btn')
    .addEventListener('click', this);
  this.container.querySelector('#ud-editword-input')
    .addEventListener('keydown', this);
  this.container.querySelector('#ud-editword-delete-btn')
    .addEventListener('click', this);
  this.container.querySelector('#ud-editword-dialog-cancel-btn')
    .addEventListener('click', this);
  this.container.querySelector('#ud-editword-dialog-delete-btn')
    .addEventListener('click', this);

  this._inputField.focus();
};

UserDictionaryEditDialog.prototype.beforeHide = function() {
  this.container.querySelector('#ud-editword-header')
    .removeEventListener('action', this);

  this.container.querySelector('#ud-saveword-btn')
    .removeEventListener('click', this);
  this.container.querySelector('#ud-editword-input')
    .removeEventListener('keydown', this);
  this.container.querySelector('#ud-editword-delete-btn')
    .removeEventListener('click', this);
  this.container.querySelector('#ud-editword-dialog-cancel-btn')
    .removeEventListener('click', this);
  this.container.querySelector('#ud-editword-dialog-delete-btn')
    .removeEventListener('click', this);
};

UserDictionaryEditDialog.prototype.hide = function() {
  this._inputField.value = '';
  this._oldWord = undefined;
};

UserDictionaryEditDialog.prototype.handleEvent = function(evt) {
  switch (evt.type) {
    case 'action':
      this._cancel();
      break;

    case 'click':
      switch (evt.target.id) {
        case 'ud-saveword-btn':
          this._commitWord();
          break;

        case 'ud-editword-delete-btn':
          navigator.mozL10n.setAttributes(
            this.container.querySelector('#ud-editword-delete-prompt'),
            'userDictionaryDeletePrompt', {word: this._oldWord});
          this.container.querySelector('#ud-editword-delete-dialog')
            .removeAttribute('hidden');
          break;

        case 'ud-editword-dialog-delete-btn':
          this._removeWord();

        /* falls through */
        case 'ud-editword-dialog-cancel-btn':
          this.container.querySelector('#ud-editword-delete-dialog')
            .setAttribute('hidden', true);
          break;
      }
      break;

    case 'keydown':
      if (evt.keyCode === KeyEvent.DOM_VK_RETURN) {
        this._commitWord();
        this._inputField.blur();
      }
      break;
  }
};


UserDictionaryEditDialog.prototype._removeWord = function() {
  this.onsubmit({action: 'remove'});
};

UserDictionaryEditDialog.prototype._commitWord = function() {
  this.onsubmit({action: 'commit', word: this._inputField.value.trim()});
};

UserDictionaryEditDialog.prototype._cancel = function() {
  this.onsubmit({action: 'cancel'});
};

exports.UserDictionaryEditDialog = UserDictionaryEditDialog;

})(window);
