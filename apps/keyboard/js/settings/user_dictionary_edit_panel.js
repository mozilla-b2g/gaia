'use strict';

/* global KeyEvent */

/*
 * This panel should be used as a Dialog.
 *
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

var UserDictionaryEditPanel = function() {
  this._initialized = false;

  this._container = null;
  this._inputField = null;

  this._oldWord = undefined;
};

UserDictionaryEditPanel.prototype.CONTAINER_ID = 'panel-ud-editword';

UserDictionaryEditPanel.prototype.onsubmit = undefined;

UserDictionaryEditPanel.prototype.init = function(){
  this._initialized = true;

  this._container = document.getElementById(this.CONTAINER_ID);
  this._inputField = this._container.querySelector('#ud-editword-input');
};

UserDictionaryEditPanel.prototype.uninit = function(){
  this._initialized = false;

  this._container = null;
  this._inputField = null;
};

UserDictionaryEditPanel.prototype.beforeShow = function(options) {
  if (!this._initialized) {
    this.init();
  }

  // if options have "word", we're in edit mode.
  if (options && 'word' in options) {
    this._container.classList.remove('add-mode');
    this._inputField.value = options.word;
    this._oldWord = options.word;
  } else {
    this._container.classList.add('add-mode');
  }
};

UserDictionaryEditPanel.prototype.show = function() {
  this._container.querySelector('#ud-editword-header')
    .addEventListener('action', this);

  this._container.querySelector('#ud-saveword-btn')
    .addEventListener('click', this);
  this._container.querySelector('#ud-editword-input')
    .addEventListener('keydown', this);
  this._container.querySelector('#ud-editword-delete-btn')
    .addEventListener('click', this);
  this._container.querySelector('#ud-editword-dialog-cancel-btn')
    .addEventListener('click', this);
  this._container.querySelector('#ud-editword-dialog-delete-btn')
    .addEventListener('click', this);

  this._inputField.focus();
};

UserDictionaryEditPanel.prototype.beforeHide = function() {
  this._container.querySelector('#ud-editword-header')
    .removeEventListener('action', this);

  this._container.querySelector('#ud-saveword-btn')
    .removeEventListener('click', this);
  this._container.querySelector('#ud-editword-input')
    .removeEventListener('keydown', this);
  this._container.querySelector('#ud-editword-delete-btn')
    .removeEventListener('click', this);
  this._container.querySelector('#ud-editword-dialog-cancel-btn')
    .removeEventListener('click', this);
  this._container.querySelector('#ud-editword-dialog-delete-btn')
    .removeEventListener('click', this);
};

UserDictionaryEditPanel.prototype.hide = function() {
  this._inputField.value = '';
  this._oldWord = undefined;
};

UserDictionaryEditPanel.prototype.handleEvent = function(evt) {
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
            this._container.querySelector('#ud-editword-delete-prompt'),
            'userDictionaryDeletePrompt', {word: this._oldWord});
          this._container.querySelector('#ud-editword-delete-dialog')
            .removeAttribute('hidden');
          break;

        case 'ud-editword-dialog-delete-btn':
          this._removeWord();

        /* falls through */
        case 'ud-editword-dialog-cancel-btn':
          this._container.querySelector('#ud-editword-delete-dialog')
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


UserDictionaryEditPanel.prototype._removeWord = function() {
  this.onsubmit({action: 'remove'});
};

UserDictionaryEditPanel.prototype._commitWord = function() {
  this.onsubmit({action: 'commit', word: this._inputField.value.trim()});
};

UserDictionaryEditPanel.prototype._cancel = function() {
  this.onsubmit({action: 'cancel'});
};

exports.UserDictionaryEditPanel = UserDictionaryEditPanel;

})(window);
