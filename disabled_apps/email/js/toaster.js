'use strict';
define(function(require) {
  var mozL10n = require('l10n!');
  var toasterNode = require('tmpl!./cards/toaster.html');
  var transitionEnd = require('transition_end');

  /**
   * Manages the display of short status notifications, or 'toasts'.
   * Each toast may optionally include an action button. Common uses
   * may include:
   *
   * - Displaying notifications about message sending status
   * - Allowing the user to undo flags/moves/deletes
   * - Allowing the user to retry a failed operation, if applicable
   *
   * This class is a singleton, because there is only room for one
   * toaster on the screen at a time. Subsequent 'toasts' will remove
   * any previously-displaying toast.
   */
  var toaster = {

    defaultTimeout: 5000,

    /**
     * Tracks the CSS class that was previously applied to the action button,
     * so it can be removed on next display.
     */
    _previousActionClass: undefined,

    /**
     * Initialize the Toaster, adding things to the DOM and setting up
     * event handlers. The toaster starts out invisible.
     */
    init: function(parentEl) {
      this.el = toasterNode;
      parentEl.appendChild(this.el);
      this.text = this.el.querySelector('.toaster-text');
      this.actionButton = this.el.querySelector('.toaster-action');

      this.el.addEventListener('click', this.hide.bind(this));
      transitionEnd(this.el, this.hide.bind(this));

      // The target is used for the action to allow a larger tap target than
      // just the button.
      this.el.querySelector('.toaster-action-target')
          .addEventListener('click', this.onAction.bind(this));

      this.currentToast = null; // The data for the currently-displayed toast.
    },

    /**
     * Toast a potentially-undoable mail operation. If the operation
     * is undoable, an 'Undo' button will be shown, allowing the user
     * to undo the action, with one exception: The 'move' and 'delete'
     * operations currently do not allow 'undo' per bug 804916, so
     * those undo buttons are disabled.
     */
    toastOperation: function(op) {
      if (!op || !op.affectedCount) {
        return; // Nothing to do if no messages were affected.
      }

      // No undo for move/delete yet. <https://bugzil.la/804916>
      var type = op.operation;
      var canUndo = (op.undo && type !== 'move' && type !== 'delete');

      this.toast({
        text: mozL10n.get('toaster-message-' + type, { n: op.affectedCount }),
        actionLabel: mozL10n.get('toaster-undo'),
        actionClass: 'undo',
        action: canUndo && op.undo.bind(op)
      });
    },

    /**
     * Called when the user taps the action button (Undo, Retry, etc).
     */
    onAction: function() {
      var actionFunction = (this.currentToast && this.currentToast.action);
      this.hide();
      if (actionFunction) {
        actionFunction();
      }
    },

    /**
     * Display a transient message as a 'toast', with an optional
     * action button. The toast dismisses automatically, unless the
     * user taps the action button or the toast itself.
     *
     * @param {object} opts opts
     * @param {string} opts.text Localized status text to display.
     * @param {function} opts.action Optional function to call when the user
     *                               clicks the action button. If not provided,
     *                               the action button will not be visible.
     * @param {string} opts.actionLabel Label to display for the action button.
     *                                  Required only if `opts.action` is
     *                                  provided.
     * @param {string} opts.actionClass a CSS class name to apply to the action
     *                                  button.
     */
    toast: function(opts) {
      opts = opts || {};
      console.log('Showing toast:', JSON.stringify(opts));

      this.hide(); // Hide in case there was a previous toast already displayed.

      this.currentToast = opts;

      this.text.textContent = opts.text;
      this.actionButton.textContent = opts.actionLabel;

      if (this._previousActionClass) {
        this.actionButton.classList.remove(this._previousActionClass);
        this._previousActionClass = undefined;
      }
      if (opts.actionClass) {
        this._previousActionClass = opts.actionClass;
        this.actionButton.classList.add(this._previousActionClass);
      }

      this.el.classList.toggle('actionable', !opts.action);
      this.actionButton.disabled = !opts.action;
      this.el.classList.remove('collapsed');

      this._fadeTimeout = setTimeout(function() {
        // This will hide when the 'fadeout' is complete in 'transitionend'.
        this.el.classList.add('fadeout');
      }.bind(this), opts.timeout || this.defaultTimeout);
    },

    isShowing: function() {
      return !this.el.classList.contains('collapsed');
    },

    /**
     * Hide the current toast, if one was visible. Idempotent.
     */
    hide: function() {
      this.currentToast = null;
      this.el.classList.add('collapsed');
      this.el.classList.remove('fadeout');
      window.clearTimeout(this._fadeTimeout);
      this._fadeTimeout = null;
    }
  };

  return toaster;
});
