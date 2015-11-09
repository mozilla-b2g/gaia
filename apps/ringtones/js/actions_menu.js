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
   * A callback function to run when an action button is tapped, but before the
   * action is performed.
   */
  onactionstart: null,

  /**
   * A callback function to run after an action has been performed.
   */
  onactionend: null,

  /**
   * Open the actions menu.
   *
   * @param {Tone} tone The tone to perform actions on.
   * @param {Array} inUseAs An array representing the places using this tone.
   */
  open: function(tone, inUseAs) {
    if (!this._menuElement.hidden) {
      throw new Error('actions menu is already open');
    }

    if (tone.shareable || tone.deletable) {
      this._tone = tone;
      this._menuElement.hidden = false;
      this._inUseAs = inUseAs;

      this._shareButton.hidden = !tone.shareable;
      this._shareButton.dataset.l10nId = 'actions-share-' + tone.type;
      this._deleteButton.hidden = !tone.deletable;
      this._deleteButton.dataset.l10nId = 'actions-delete-' + tone.type;
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
    this._actionstart('cancel');
    this.close();
    this._actionend('cancel');
  },

  /**
   * Handle clicking the "share" button.
   *
   * @param {Event} event The event.
   */
  _share: function(event) {
    this._actionstart('share');

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
          filenames: [self._tone.filename],
          metadata: [{
            title: self._tone.name
          }]
        }
      });
      activity.onerror = function(e) {
        console.warn('share activity error:', activity.error.name);
        self._actionend('share');
      };
      activity.onsuccess = function(e) {
        self._actionend('share');
      };
    });
  },

  /**
   * Handle clicking the "delete" button.
   *
   * @param {Event} event The event.
   */
  _delete: function(event) {
    this._actionstart('delete');

    var self = this;
    this.close();

    var messageKey = 'delete-message';
    if (self._inUseAs.length) {
      messageKey += '-default-' + self._inUseAs[0];
    }

    var cancelButton = {
      title: 'delete-cancel',
      callback: function() {
        CustomDialog.hide();
        self._actionend('cancel');
      }
    };
    var confirmButton = {
      title: 'delete-confirm',
      callback: function() {
        CustomDialog.hide();
        Toaster.showToast({
          messageL10nId: 'deleted-' + self._tone.type,
          latency: 3000,
          useTransition: true
        });
        self._tone.remove();
        self._actionend('delete');
      }
    };
    CustomDialog.show(
      'delete-title',
      {id: messageKey, args: {tone: self._tone.name}},
      cancelButton, confirmButton
    );
  },

  /**
   * Fire our onactionstart function.
   *
   * @param {String} command The command that was selected.
   */
  _actionstart: function(command) {
    if (this.onactionstart) {
      this.onactionstart(command);
    }
  },

  /**
   * Fire our onactionend function and clean up the internal state of the menu.
   *
   * @param {String} command The command that was selected.
   */
  _actionend: function(command) {
    if (this.onactionend) {
      this.onactionend(command);
    }
    this._tone = null;
    this._inUseAs = null;
  }
};
