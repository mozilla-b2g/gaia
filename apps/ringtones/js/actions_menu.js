/* global CustomDialog, MozActivity, Toaster */
'use strict';

/**
 * Create an actions menu to allow managing individual tones. Tones can be
 * shared with other apps or (in the case of user-created tones) deleted from
 * the system.
 *
 * @param {Node} menuElement The DOM node for the menu.
 */
function ActionsMenu(menuElement) {
  this._menuElement = menuElement;

  function getButton(action) {
    return menuElement.querySelector('button[data-action="' + action + '"]');
  }

  this._cancelButton = getButton('cancel');
  this._shareButton = getButton('share');
  this._deleteButton = getButton('delete');

  this._cancelButton.addEventListener('click', this._cancel.bind(this));
  this._shareButton.addEventListener('click', this._share.bind(this));
  this._deleteButton.addEventListener('click', this._delete.bind(this));
}

ActionsMenu.prototype = {
  /**
   * Open the actions menu.
   *
   * @param {Tone} tone The tone to perform actions on.
   * @param {Array} inUseAs An array representing the places using this tone.
   * @param {Function} callback A callback to call when the actions menu is
   *   closed. Takes one argument: the action that was performed.
   */
  open: function(tone, inUseAs, callback) {
    if (!this._menuElement.hidden) {
      throw new Error('actions menu is already open');
    }

    this._shareButton.hidden = !tone.shareable;
    this._deleteButton.hidden = !tone.deletable;
    if (tone.shareable || tone.deletable) {
      this._tone = tone;
      this._callback = callback;
      this._menuElement.hidden = false;
      this._inUseAs = inUseAs;
    }
    return !this._menuElement.hidden;
  },

  /**
   * Close the actions menu.
   */
  close: function() {
    this._menuElement.hidden = true;
  },

  /**
   * Handle clicking the "cancel" button.
   *
   * @param {Event} event The event.
   */
  _cancel: function(event) {
    this.close();
    this._finish('cancel');
  },

  /**
   * Handle clicking the "share" button.
   *
   * @param {Event} event The event.
   */
  _share: function(event) {
    var self = this;
    this.close();

    this._tone.getBlob().then(function(blob) {
      var activity = new MozActivity({
        name: 'share',
        data: {
          type: 'audio/*',
          // Make sure we can't share with ourselves!
          __bug1015513_hide_from_self__: true,
          number: 1,
          blobs: [blob],
          filenames: [self._tone.name],
          metadata: [{
            title: self._tone.name
          }]
        }
      });
      activity.onerror = function(e) {
        console.warn('share activity error:', activity.error.name);
        self._finish('share');
      };
      activity.onsuccess = function(e) {
        self._finish('share');
      };
    });
  },

  /**
   * Handle clicking the "delete" button.
   *
   * @param {Event} event The event.
   */
  _delete: function(event) {
    var _ = navigator.mozL10n.get;
    var self = this;
    this.close();

    var descKey = 'delete-desc';
    if (self._inUseAs.length) {
      descKey += '-default-' + self._inUseAs[0];
    }

    var cancelButton = {
      title: _('delete-cancel'),
      callback: function() {
        CustomDialog.hide();
        self._finish('cancel');
      }
    };
    var confirmButton = {
      title: _('delete-confirm'),
      callback: function() {
        CustomDialog.hide();
        Toaster.showToast({
          messageL10nId: 'deleted-tone',
          latency: 3000,
          useTransition: true
        });
        self._tone.remove();
        self._finish('delete');
      }
    };
    CustomDialog.show(
      _('delete-title'), _(descKey, {tone: self._tone.name}),
      cancelButton, confirmButton
    );
  },

  /**
   * Fire our callback function and clean up the internal state of the menu.
   *
   * @param {String} command The command that was selected.
   */
  _finish: function(command) {
    if (this._callback) {
      this._callback(command);
    }
    this._tone = null;
    this._callback = null;
    this._inUseAs = null;
  }
};
