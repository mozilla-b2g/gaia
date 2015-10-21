'use strict';

define(function(require, exports) {

var cards = require('cards'),
    ConfirmDialog = require('confirm_dialog'),
    largeMsgConfirmMsgNode = require('tmpl!../msg/large_message_confirm.html');

/**
 * Show a warning that the given message is large.
 * Callback is called with cb(true|false) to continue.
 */
function showLargeMessageWarning(size, cb) {
  var dialog = largeMsgConfirmMsgNode.cloneNode(true);
  // TODO: If UX designers want the size included in the warning
  // message, add it here.
  ConfirmDialog.show(dialog,
    { // Confirm
      id: 'msg-large-message-ok',
      handler: function() { cb(true); }
    },
    { // Cancel
      id: 'msg-large-message-cancel',
      handler: function() { cb(false); }
    }
  );
}

/**
 * A mixin for lst cards that want tapping on a message to go to a message
 * reader. Check all the `this` references below to see implicit dependencies
 * on instance state.
 * A longer range TODO is to remove or make explicit the dependencies.
 */
  return {
    onClickMessage: function(event) {
      var messageNode = event.detail;

      // You cannot open a message if this is the outbox and it is syncing.
      if (this.curFolder &&
          this.curFolder.type === 'outbox' && this.outboxSyncInProgress) {
        return;
      }

      var header = messageNode.message;

      // Skip nodes that are default/placeholder ones.
      if (header && header.isPlaceholderData) {
        return;
      }

      // If in edit mode, the clicks on message nodes are about changing the
      // selection for bulk edit actions.
      if (this.editMode) {
        this.toggleSelection(messageNode);
        return;
      }

      if (this.curFolder && this.curFolder.type === 'localdrafts') {
        var composer = header.editAsDraft(() => {
          cards.pushCard('compose', 'animate', {
            model: this.model,
            composer
          });
        });
        return;
      }

      // When tapping a message in the outbox, don't open the message;
      // instead, move it to localdrafts and edit the message as a
      // draft.
      if (this.curFolder && this.curFolder.type === 'outbox') {
        // If the message is currently being sent, abort.
        if (header.sendStatus.state === 'sending') {
          return;
        }
        var draftsFolder =
              this.model.foldersSlice.getFirstFolderWithType('localdrafts');

        console.log('outbox: Moving message to localdrafts.');
        this.model.api.moveMessages([header], draftsFolder, function(moveMap) {
          header.id = moveMap[header.id];
          console.log('outbox: Editing message in localdrafts.');
          var composer = header.editAsDraft(() => {
            cards.pushCard('compose', 'animate', {
              model: this.model,
              composer
            });
          });
        });

        return;
      }

      var model = this.model,
          headerCursor = this.headerCursor;

      function pushMessageCard() {
        cards.pushCard(
          'message_reader', 'animate',
          {
            model,
            headerCursor,

            // The header here may be undefined here, since the click
            // could be on a cached HTML node before the back end has
            // started up. It is OK if header is not available as the
            // message_reader knows how to wait for the back end to
            // start up to get the header value later.
            header,
            // Use the property on the HTML, since the click could be
            // from a cached HTML node and the real data object may not
            // be available yet.
            messageSuid: messageNode.dataset.id
          });
      }

      if (header) {
        this.headerCursor.setCurrentMessage(header);
      } else if (messageNode.dataset.id) {
        // a case where header was not set yet, like clicking on a
        // html cached node, or virtual scroll item that is no
        // longer backed by a header.
        this.headerCursor.setCurrentMessageBySuid(messageNode.dataset.id);
      } else {
        // Not an interesting click, bail
        return;
      }

      // If the message is really big, warn them before they open it.
      // Ideally we'd only warn if you're on a cell connection
      // (metered), but as of now `navigator.connection.metered` isn't
      // implemented.

      // This number is somewhat arbitrary, based on a guess that most
      // plain-text/HTML messages will be smaller than this. If this
      // value is too small, users get warned unnecessarily. Too large
      // and they download a lot of data without knowing. Since we
      // currently assume that all network connections are metered,
      // they'll always see this if they get a large message...
      var LARGE_MESSAGE_SIZE = 1 * 1024 * 1024;

      // watch out, header might be undefined here (that's okay, see above)
      if (header && header.bytesToDownloadForBodyDisplay > LARGE_MESSAGE_SIZE) {
        showLargeMessageWarning(
          header.bytesToDownloadForBodyDisplay, function(result) {
          if (result) {
            pushMessageCard();
          } else {
            // abort
          }
        });
      } else {
        pushMessageCard();
      }
    }
  };
});
