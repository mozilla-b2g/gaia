'use strict';

define(function(require, exports) {
  var cards = require('cards'),
      ConfirmDialog = require('confirm_dialog'),
      deleteConfirmMsgNode = require('tmpl!../msg/delete_confirm.html'),
      mozL10n = require('l10n!'),
      toaster = require('toaster');

  return {
    createdCallback: function() {
      this.editMode = false;
      this.selectedMessages = null;
      this.editModeEnabled = false;
    },

    setEditMode: function(editMode) {
      // Do not bother if edit mode is not enabled yet.
      if (!this.editModeEnabled) {
        return;
      }

      this._setEditMode(editMode);
    },

    // This function is called from setEditMode() after ensuring that
    // the backend is in a state where we can safely use edit mode.
    _setEditMode: function(editMode) {
      var i;

      this.editMode = editMode;

      if (editMode) {
        this.classList.add('show-edit');

        this.selectedMessages = [];
        this.updateDomEditControls();
      }
      else {
        this.classList.remove('show-edit');

        this.selectedMessages = null;
      }

      // Reset checked mode for all message items.
      var msgNodes = this.msgVScroll.querySelectorAll('.msg-header-item');
      for (i = 0; i < msgNodes.length; i++) {
        this.updateDomMessageChecked(msgNodes[i], false);
      }

      if (this.editModeChanged) {
        this.editModeChanged(editMode);
      }
    },

    // Event handler wired up in HTML template
    setEditModeStart: function() {
      this.setEditMode(true);
    },

    // Event handler wired up in HTML template
    editHeaderClose: function() {
      this.setEditMode(false);
    },

    /**
     * Toggles the selection state of the node and therefore the stored
     * `selectedMessages` state based on the previous state of the selection.
     * The change in the total number of selections is then reflected in DOM
     * updates.
     * @param  {Element} msgNode
     */
    toggleSelection: function(msgNode) {
      var header = msgNode.message;
      var idx = this.selectedMessages.indexOf(header);
      if (idx !== -1) {
        this.selectedMessages.splice(idx, 1);
      } else {
        this.selectedMessages.push(header);
      }
      this.updateDomMessageChecked(msgNode, idx === -1);
      this.updateDomEditControls();
    },

    /**
     * Set or unset the select state on a node based on the edit mode.
     */
    updateDomSelectState: function(msgNode, message) {
      if (this.editMode) {
        this.updateDomMessageChecked(msgNode,
          this.selectedMessages.indexOf(message) !== -1);
      } else {
        msgNode.removeAttribute('aria-selected');
      }
    },

    /**
     * Set the checked state for the message item in the list. It sets both
     * checkbox checked and aria-selected states.
     */
    updateDomMessageChecked: function(msgNode, checked) {
      var checkbox = msgNode.querySelector('input[type=checkbox]');
      checkbox.checked = checked;
      msgNode.setAttribute('aria-selected', checked);
    },

    /**
     * Update the edit mode UI bits sensitive to a change in the set of selected
     * messages.  This means the label that says how many messages are selected,
     * whether the buttons are enabled, which of the toggle-pairs are visible.
     */
    updateDomEditControls: function() {
      this.editHeader.updateDomHeaderCount(this.selectedMessages.length);
      this.editToolbar.updateDomEditButtons(this.selectedMessages.length > 0);

      // Enabling/disabling rules (not UX-signed-off):  Our bias is that people
      // want to star messages and mark messages unread (since it they naturally
      // end up unread), so unless messages are all in this state, we assume
      // that is the desired action.
      var numStarred = 0, numRead = 0;
      for (var i = 0; i < this.selectedMessages.length; i++) {
        var msg = this.selectedMessages[i];
        if (msg.isStarred) {
          numStarred++;
        }
        if (msg.isRead) {
          numRead++;
        }
      }

      // Unstar if everything is starred, otherwise star
      this.setAsStarred = !(numStarred && numStarred ===
                            this.selectedMessages.length);
      this.editToolbar.updateDomStartButton(this.setAsStarred);

      // Mark read if everything is unread, otherwise unread
      this.setAsRead = (!!this.selectedMessages.length && numRead === 0);
      this.editToolbar.updateDomReadButton(numRead > 0);
    },

    onDeleteMessages: function() {
      if (this.selectedMessages.length === 0) {
        return this.setEditMode(false);
      }

      var dialog = deleteConfirmMsgNode.cloneNode(true);
      var content = dialog.getElementsByTagName('p')[0];
      mozL10n.setAttributes(content, 'message-multiedit-delete-confirm',
                            { n: this.selectedMessages.length });
      ConfirmDialog.show(dialog,
        { // Confirm
          id: 'msg-delete-ok',
          handler: function() {
            var op = this.model.api.deleteMessages(this.selectedMessages);
            toaster.toastOperation(op);
            this.setEditMode(false);
          }.bind(this)
        },
        { // Cancel
          id: 'msg-delete-cancel',
          handler: null
        }
      );
    },

    onStarMessages: function() {
      var op = this.model.api.markMessagesStarred(this.selectedMessages,
                                           this.setAsStarred);
      this.setEditMode(false);
      toaster.toastOperation(op);
    },

    onMarkMessagesRead: function() {
      var op = this.model.api.markMessagesRead(this.selectedMessages,
                                          this.setAsRead);
      this.setEditMode(false);
      toaster.toastOperation(op);
    },

    onMoveMessages: function() {
      cards.folderSelector(this.model, function(folder) {
        var op = this.model.api.moveMessages(this.selectedMessages, folder);
        toaster.toastOperation(op);
        this.setEditMode(false);
      }.bind(this), function(folder) {
        return folder.isValidMoveTarget;
      });
    }
  };
});
