'use strict';

define(function(require, exports) {
  var mozL10n = require('l10n!'),
      toolbarEditButtonNames = ['starBtn', 'readBtn', 'deleteBtn', 'moveBtn'];

  return [
    require('../base')(require('template!./edit_toolbar.html')),
    require('../mixins/dom_evt'),
    {
      updateDomFolderType: function(folderType) {
        // You can't move messages in localdrafts or the outbox.
        this.moveBtn.classList.toggle('collapsed',
                                              folderType === 'localdrafts' ||
                                              folderType === 'outbox');
        // You can't flag or change the read status of messages in the outbox.
        this.starBtn.classList.toggle('collapsed',
                                              folderType === 'outbox');
        this.readBtn.classList.toggle('collapsed',
                                              folderType === 'outbox');
      },

      // If true, show the star button, otherwise show unstar button.
      updateDomStartButton: function(isStarred) {
        mozL10n.setAttributes(this.starBtn,
                isStarred ? 'message-star-button' : 'message-unstar-button');
      },

      // If true, some messages read, so show readBtn as marking unread.
      updateDomReadButton: function(hasUnread) {
        // Update mark read/unread button to show what action will be taken.
        this.readBtn.classList.toggle('unread', hasUnread);

        mozL10n.setAttributes(this.readBtn, hasUnread ?
          'message-mark-unread-button' : 'message-mark-read-button');
      },

      // Set how many messages to edit. If greater than zero, enable buttons.
      updateDomEditButtons: function(hasMessages) {
        // Update disabled state based on if there are selected messages
        toolbarEditButtonNames.forEach(function(key) {
          this[key].disabled = !hasMessages;
        }.bind(this));
      }
    }
  ];
});
