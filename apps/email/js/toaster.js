'use strict';

define(function(require) {

var mozL10n = require('l10n!');

/**
 * Central tracker of poptart messages; specifically, ongoing message sends,
 * failed sends, and recently performed undoable mutations.
 */
var toaster = {
  get body() {
    delete this.body;
    return (this.body =
           document.querySelector('section[role="status"]'));
  },
  get text() {
    delete this.text;
    return (this.text =
           document.querySelector('section[role="status"] p'));
  },
  get undoBtn() {
    delete this.undoBtn;
    return (this.undoBtn =
           document.querySelector('.toaster-banner-undo'));
  },
  get retryBtn() {
    delete this.retryBtn;
    return (this.retryBtn =
           document.querySelector('.toaster-banner-retry'));
  },

  undoableOp: null,
  retryCallback: null,

  /**
   * toaster timeout setting.
   */
  _timeout: 5000,
  /**
   * toaster fadeout animation event handling.
   */
  _animationHandler: function() {
    this.body.addEventListener('transitionend', this, false);
    this.body.classList.add('fadeout');
  },
  /**
   * The list of cards that want to hear about what's up with the toaster.  For
   * now this will just be the message-list, but it might also be the
   * message-search card as well.  If it ends up being more, then we probably
   * want to rejigger things so we can just overlay stuff on most cards...
   */
  _listeners: [],

  pendingStack: [],

  /**
   * Tell toaster listeners about a mutation we just made.
   *
   * @param {Object} undoableOp undoable operation.
   * @param {Boolean} pending
   *   If true, indicates that we should wait to display this banner until we
   *   transition to the next card.  This is appropriate for things like
   *   deleting the message that is displayed on the current card (and which
   *   will be imminently closed).
   */
  logMutation: function(undoableOp, pending) {
    if (pending) {
      this.pendingStack.push(this.show.bind(this, 'undo', undoableOp));
    } else {
      this.show('undo', undoableOp);
    }
  },

  /**
   * Something failed that it makes sense to let the user explicitly trigger
   * a retry of!  For example, failure to synchronize.
   */
  logRetryable: function(retryStringId, retryCallback) {
    this.show('retry', retryStringId, retryCallback);
  },

  handleEvent: function(evt) {
    switch (evt.type) {
      case 'click' :
        var classList = evt.target.classList;
        if (classList.contains('toaster-banner-undo')) {
          this.undoableOp.undo();
          this.hide();
        } else if (classList.contains('toaster-banner-retry')) {
          if (this.retryCallback) {
            this.retryCallback();
          }
          this.hide();
        } else if (classList.contains('toaster-cancel-btn')) {
          this.hide();
        }
        break;
      case 'transitionend' :
        this.hide();
        break;
    }
  },

  show: function(type, operation, callback) {
    // Close previous toaster before showing the new one.
    if (!this.body.classList.contains('collapsed')) {
      this.hide();
    }

    var text, textId, showUndo = false;
    if (type === 'undo') {
      this.undoableOp = operation;
      // There is no need to show toaster if affected message count < 1
      if (!this.undoableOp || this.undoableOp.affectedCount < 1) {
        return;
      }
      textId = 'toaster-message-' + this.undoableOp.operation;
      text = mozL10n.get(textId, { n: this.undoableOp.affectedCount });
      // https://bugzilla.mozilla.org/show_bug.cgi?id=804916
      // Remove undo email move/delete UI for V1.
      showUndo = (this.undoableOp.operation !== 'move' &&
                  this.undoableOp.operation !== 'delete');
    } else if (type === 'retry') {
      textId = 'toaster-retryable-' + operation;
      text = mozL10n.get(textId);
      this.retryCallback = callback;
    // XXX I assume this is for debug purposes?
    } else if (type === 'text') {
      text = operation;
    }

    if (type === 'undo' && showUndo) {
      this.undoBtn.classList.remove('collapsed');
    } else {
      this.undoBtn.classList.add('collapsed');
    }

    if (type === 'retry') {
      this.retryBtn.classList.remove('collapsed');
    } else {
      this.retryBtn.classList.add('collapsed');
    }

    this.body.title = type;
    this.text.textContent = text;
    this.body.addEventListener('click', this, false);
    this.body.classList.remove('collapsed');
    this.fadeTimeout = window.setTimeout(this._animationHandler.bind(this),
                                         this._timeout);
  },

  hide: function() {
    this.body.classList.add('collapsed');
    this.body.classList.remove('fadeout');
    window.clearTimeout(this.fadeTimeout);
    this.fadeTimeout = null;
    this.body.removeEventListener('click', this);
    this.body.removeEventListener('transitionend', this);

    // Clear operations:
    this.undoableOp = null;
    this.retryCallback = null;
  }
};

return toaster;

});
