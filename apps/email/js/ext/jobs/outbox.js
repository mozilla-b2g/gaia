'use strict';
/**
 * This module exposes a single helper method,
 * `sendNextAvailableOutboxMessage`, which is used by the
 * sendOutboxMessages job in jobmixins.js.
 */
define(function(require) {


  /**
   * Send the next available outbox message. Returns a promise that
   * resolves to the following:
   *
   * {
   *   moreExpected: (Boolean),
   *   messageNamer: { date, suid }
   * }
   *
   * If there might be more messages left to send after this one,
   * moreExpected will be `true`.
   *
   * If we attempted to send a message, messageNamer will point to it.
   * This can then be passed to a subsequent invocation of this, to
   * send the next available message after the given messageNamer.
   *
   * @param {CompositeAccount|ActiveSyncAccount} account
   * @param {FolderStorage} storage
   * @param {MessageNamer|null} beforeMessage
   *   Send the first message chronologically preceding `beforeMessage`.
   * @param {Boolean} emitNotifications
   *   If true, we will emit backgroundSendStatus notifications
   *   for this message.
   * @param {Boolean} outboxNeedsFreshSync
   *   If true, ignore any potentially stale "sending" state,
   *   as in when we restore the app from a crash.
   * @param {SmartWakeLock} wakeLock
   *   A SmartWakeLock to be held open during the sending process.
   * @return {Promise}
   * @public
   */
  function sendNextAvailableOutboxMessage(
    account, storage, beforeMessage, emitNotifications,
    outboxNeedsFreshSync, wakeLock) {

    return getNextHeader(storage, beforeMessage).then(function(header) {
      // If there are no more messages to send, resolve `null`. This
      // should ordinarily not happen, because clients should pay
      // attention to the `moreExpected` results from earlier sends;
      // but job scheduling might introduce edge cases where this
      // happens, so better to be safe.
      if (!header) {
        return {
          moreExpected: false,
          messageNamer: null
        };
      }

      // Figure out if this is the last message to consider sending in the
      // outbox.  (We are moving from newest to oldest, so this is the last one
      // if it is the oldest.  We need to figure this out before the send
      // process completes since we will delete the header once it's all sent.)
      var moreExpected = !storage.headerIsOldestKnown(header.date,
                                                      header.id);

      if (!header.sendStatus) {
        header.sendStatus = {};
      }

      // If the header has not been sent, or we've been instructed to
      // ignore any existing sendStatus, clear it out.
      if (header.sendStatus.state !== 'sending' || outboxNeedsFreshSync) {
        // If this message is not already being sent, send it.
        return constructComposer(account, storage, header, wakeLock)
          .then(sendMessage.bind(null, account, storage, emitNotifications))
          .then(function(header) {
            return {
              moreExpected: moreExpected,
              messageNamer: {
                suid: header.suid,
                date: header.date
              }
            };
          });
      } else {
        // If this message is currently being sent, advance to the
        // next header.
        return sendNextAvailableOutboxMessage(account, storage, {
          suid: header.suid,
          date: header.date
        }, emitNotifications, outboxNeedsFreshSync, wakeLock);
      }
    });
  }


  ////////////////////////////////////////////////////////////////
  // The following functions are internal helpers.

  /**
   * Resolve to the header immediately preceding `beforeMessage` in
   * time. If beforeMessage is null, resolve the most recent message.
   * If no message could be found, resolve `null`.
   *
   * @param {FolderStorage} storage
   * @param {MessageNamer} beforeMessage
   * @return {Promise(MailHeader)}
   */
  function getNextHeader(storage, /* optional */ beforeMessage) {
    return new Promise(function(resolve) {
      if (beforeMessage) {
        // getMessagesBeforeMessage expects an 'id', not a 'suid'.
        var id = parseInt(beforeMessage.suid.substring(
          beforeMessage.suid.lastIndexOf('/') + 1));
        storage.getMessagesBeforeMessage(
          beforeMessage.date,
          id,
          /* limit = */ 1,
          function(headers, moreExpected) {
            // There may be no headers, and that's okay.
            resolve(headers[0] || null);
          });
      } else {
        storage.getMessagesInImapDateRange(
          0,
          null,
          /* min */ 1,
          /* max */ 1,
          function(headers, moreExpected) {
            resolve(headers[0]);
          });
      }
    });
  }

  /**
   * Build a Composer instance pointing to the given header.
   *
   * @param {MailAccount} account
   * @param {FolderStorage} storage
   * @param {MailHeader} header
   * @param {SmartWakeLock} wakeLock
   * @return {Promise(Composer)}
   */
  function constructComposer(account, storage, header, wakeLock) {
    return new Promise(function(resolve, reject) {
      storage.getMessage(header.suid, header.date, function(msg) {

        // If for some reason the message doesn't have a body, we
        // can't construct a composer for this header.
        if (!msg || !msg.body) {
          console.error('Failed to create composer; no body available.');
          reject();
          return;
        }

        require(['../drafts/composer'], function(cmp) {
          var composer = new cmp.Composer(msg, account, account.identities[0]);
          composer.setSmartWakeLock(wakeLock);

          resolve(composer);
        });
      });
    });
  }

  /**
   * Attempt to send the given message from the outbox.
   *
   * During the sending process, post status updates to the universe,
   * so that the frontend can display status notifications if it
   * desires.
   *
   * If the message successfully sends, remove it from the outbox;
   * otherwise, its `sendStatus.state` will equal 'error', with
   * details about the failure.
   *
   * Resolves to the header; you can check `header.sendStatus` to see
   * the result of this send attempt.
   *
   * @param {MailAccount} account
   * @param {FolderStorage} storage
   * @param {Composer} composer
   * @return {Promise(MailHeader)}
   */
  function sendMessage(account, storage, emitNotifications, composer) {
    var header = composer.header;
    var progress = publishStatus.bind(
      null, account, storage, composer, header, emitNotifications);

    // As part of the progress notification, the client would like to
    // know whether or not they can expect us to immediately send more
    // messages after this one. If there are messages in the outbox
    // older than this one, the answer is yes.
    var oldestDate = storage.getOldestMessageTimestamp();
    var willSendMore = oldestDate > 0 && oldestDate < header.date.valueOf();

    // Send the initial progress information.
    progress({
      state: 'sending',
      err: null,
      badAddresses: null,
      sendFailures: header.sendStatus && header.sendStatus.sendFailures || 0
    });

    return new Promise(function(resolve) {
      account.sendMessage(composer, function(err, badAddresses) {
        if (err) {
          console.log('Message failed to send (' + err + ')');

          progress({
            state: 'error',
            err: err,
            badAddresses: badAddresses,
            sendFailures: (header.sendStatus.sendFailures || 0) + 1
          });

          resolve(composer.header);
        } else {
          console.log('Message sent; deleting from outbox.');

          progress({
            state: 'success',
            err: null,
            badAddresses: null
          });
          storage.deleteMessageHeaderAndBodyUsingHeader(header, function() {
            resolve(composer.header);
          });
        }
      });
    });
  }

  /**
   * Publish a universe notification with the message's current send
   * status, and queue it for persistence in the database.
   *
   * NOTE: Currently, we do not checkpoint our state, so the
   * intermediary "sending" steps will not actually get written to
   * disk. That is generally fine, since sendStatus is invalid upon a
   * restart. However, when we address bug 1032451 (sendMessage is not
   * actually atomic), we will want to checkpoint state during the
   * sending process.
   */
  function publishStatus(account, storage, composer,
                         header, emitNotifications, status) {
    header.sendStatus = {
      state: status.state,
      err: status.err,
      badAddresses: status.badAddresses,
      sendFailures: status.sendFailures
    };

    account.universe.__notifyBackgroundSendStatus({
      // Status information (also stored on the header):
      state: status.state,
      err: status.err,
      badAddresses: status.badAddresses,
      sendFailures: status.sendFailures,
      // Message/Account Information (for notifications):
      accountId: account.id,
      suid: header.suid,
      emitNotifications: emitNotifications,
      // Unit test support:
      messageId: composer.messageId,
      sentDate: composer.sentDate
    });

    storage.updateMessageHeader(
      header.date,
      header.id,
      /* partOfSync */ false,
      header,
      /* body hint */ null);
  }

  return {
    sendNextAvailableOutboxMessage: sendNextAvailableOutboxMessage
  };
});
