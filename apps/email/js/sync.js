/*jshint browser: true */
/*global define, console, plog, Notification */
define(function(require) {

  var appSelf = require('app_self'),
      evt = require('evt'),
      model = require('model'),
      mozL10n = require('l10n!'),
      notificationHelper = require('shared/js/notification_helper'),
      fromObject = require('query_string').fromObject;

  model.latestOnce('api', function(api) {
    var hasBeenVisible = !document.hidden,
        waitingOnCron = {};

    // Let the back end know the app is interactive, not just
    // a quick sync and shutdown case, so that it knows it can
    // do extra work.
    if (hasBeenVisible) {
      api.setInteractive();
    }

    // If the page is ever not hidden, then do not close it later.
    document.addEventListener('visibilitychange',
      function onVisibilityChange() {
        if (!document.hidden) {
          hasBeenVisible = true;
          api.setInteractive();
        }
    }, false);

    // Creates a string key from an array of string IDs. Uses a space
    // separator since that cannot show up in an ID.
    function makeAccountKey(accountIds) {
      return 'id' + accountIds.join(' ');
    }

    var sendNotification;
    if (typeof Notification === 'undefined') {
      console.log('email: notifications not available');
      sendNotification = function() {};
    } else {
      sendNotification = function(notificationId, title, body, iconUrl) {
        console.log('Notification sent for ' + notificationId);

        if (Notification.permission !== 'granted') {
          console.log('email: notification skipped, permission: ' +
                      Notification.permission);
          return;
        }

        //TODO: consider setting dir and lang?
        //https://developer.mozilla.org/en-US/docs/Web/API/notification
        var notification = new Notification(title, {
          body: body,
          icon: iconUrl,
          tag: notificationId
        });

        // If the app is open, but in the background, when the notification
        // comes in, then we do not get notifived via our mozSetMessageHandler
        // that is set elsewhere. Instead need to listen to click event
        // and synthesize an "event" ourselves.
        notification.onclick = function() {
          evt.emit('notification', {
            clicked: true,
            imageURL: iconUrl,
            tag: notificationId
          });
        };
      };
    }

    api.oncronsyncstart = function(accountIds) {
      console.log('email oncronsyncstart: ' + accountIds);
      var accountKey = makeAccountKey(accountIds);
      waitingOnCron[accountKey] = true;
    };

    function makeNotificationDesc(infos) {
      // For now, just list who the mails are from, as there is no formatting
      // possibilities in the existing notifications for the description
      // section. Even new lines do not seem to work.
      var froms = [];

      infos.forEach(function(info) {
        if (froms.indexOf(info.from) === -1)
          froms.push(info.from);
      });
      return froms.join(mozL10n.get('senders-separation-sign'));
    }

    /*
    accountsResults is an object with the following structure:
      accountIds: array of string account IDs.
      updates: array of objects includes properties:
        id: accountId,
        name: account name,
        count: number of new messages total
        latestMessageInfos: array of latest message info objects,
        with properties:
          - from
          - subject
          - accountId
          - messageSuid
     */
    api.oncronsyncstop = function(accountsResults) {
      console.log('email oncronsyncstop: ' + accountsResults.accountIds);

      appSelf.latest('self', function(app) {

        model.latestOnce('account', function(currentAccount) {
          var iconUrl = notificationHelper.getIconURI(app);
          if (accountsResults.updates) {
            accountsResults.updates.forEach(function(result) {
              // If the current account is being shown, then just send
              // an update to the model to indicate new messages, as
              // the notification will happen within the app for that
              // case.
              if (currentAccount.id === result.id && !document.hidden) {
                model.notifyInboxMessages(result);
                return;
              }

              // If this account does not want notifications of new messages
              // stop doing work.
              if (!model.getAccount(result.id).notifyOnNew)
                return;

              var dataString,
                  subject,
                  body;

              if (navigator.mozNotification) {
                if (result.count > 1) {
                  dataString = fromObject({
                    type: 'message_list',
                    accountId: result.id
                  });

                  if (model.getAccountCount() === 1) {
                    subject = mozL10n.get(
                      'new-emails-notify-one-account',
                      { n: result.count }
                    );
                  } else {
                    subject = mozL10n.get(
                      'new-emails-notify-multiple-accounts',
                      {
                        n: result.count,
                        accountName: result.address
                      }
                    );
                  }

                  sendNotification(
                    result.id,
                    subject,
                    makeNotificationDesc(result.latestMessageInfos.sort(
                                           function(a, b) {
                                             return b.date - a.date;
                                           }
                                        )),
                    iconUrl + '#' + dataString
                  );
                } else {
                  result.latestMessageInfos.forEach(function(info) {
                    dataString = fromObject({
                      type: 'message_reader',
                      accountId: info.accountId,
                      messageSuid: info.messageSuid
                    });

                    if (model.getAccountCount() === 1) {
                      subject = info.subject;
                      body = info.from;
                    } else {
                      subject = mozL10n.get(
                        'new-emails-notify-multiple-accounts',
                        {
                          n: result.count,
                          accountName: result.address
                        }
                      );
                      body = mozL10n.get(
                        'new-emails-notify-multiple-accounts-body',
                        {
                          from: info.from,
                          subject: info.subject
                        }
                      );
                    }

                    sendNotification(
                      result.id,
                      subject,
                      body,
                      iconUrl + '#' + dataString
                    );
                  });
                }
              }
            });
          }
        });

        evt.emit('cronSyncStop', accountsResults.accountIds);

        // Mark this accountId set as no longer waiting.
        var accountKey = makeAccountKey(accountsResults.accountIds);
        waitingOnCron[accountKey] = false;
        var stillWaiting = Object.keys(waitingOnCron).some(function(key) {
          return !!waitingOnCron[key];
        });

        if (!hasBeenVisible && !stillWaiting) {
          var msg = 'mail sync complete, closing mail app';
          if (typeof plog === 'function')
            plog(msg);
          else
            console.log(msg);

          window.close();
        }
      });
    };


    // Background Send Notifications

    var BACKGROUND_SEND_NOTIFICATION_ID = 'backgroundSendFailed';
    var sentAudio = null; // Lazy-loaded when first needed

    /**
     * The API passes through background send notifications with the
     * following data (see the "sendOutboxMessages" job and/or
     * `mailapi/jobs/outbox.js`):
     *
     * @param {int} accountId
     * @param {string} suid
     *   SUID of the message
     * @param {string} state
     *   'pending', 'syncing', 'success', or 'error'
     * @param {string} err
     *   (if applicable, otherwise null)
     * @param {array} badAddresses
     *   (if applicable)
     * @param {int} sendFailures
     *   Count of the number of times the message failed to send.
     * @param {Boolean} emitNotifications
     *   True if this message is being sent as a direct result of
     *   the user sending a message from the compose window. False
     *   otherwise, as in when the user "refreshes" the outbox.
     * @param {Boolean} willSendMore
     *   True if we will send a subsequent message from the outbox
     *   immediately after sending this message.
     *
     * Additionally, this function appends the following to that
     * structured data:
     *
     * @param {string} localizedDescription Notification text.
     *
     * If the application is in the foreground, we notify the user on
     * both success and failure. If the application is in the
     * background, we only post a system notifiaction on failure.
     */
    api.onbackgroundsendstatus = function(data) {
      console.log('outbox: Message', data.suid, 'status =', JSON.stringify({
        state: data.state,
        err: data.err,
        sendFailures: data.sendFailures,
        emitNotifications: data.emitNotifications
      }));

      // Grab an appropriate localized string here. This description
      // may be displayed in a number of different places, so it's
      // cleaner to do the localization here.

      var descId;
      switch (data.state) {
      case 'pending': descId = 'background-send-pending'; break;
      case 'sending': descId = 'background-send-sending'; break;
      case 'success': descId = 'background-send-success'; break;
      case 'error':
        if ((data.badAddresses && data.badAddresses.length) ||
            data.err === 'bad-recipient') {
          descId = 'background-send-error-recipients';
        } else {
          descId = 'background-send-error';
        }
        break;
      case 'syncDone':
        // We will not display any notification for a 'syncDone'
        // message, except to stop refresh icons from spinning. No
        // need to attempt to populate a description.
        break;
      default:
        console.error('No state description for background send state "' +
                      data.state + '"');
        return;
      }

      data.localizedDescription = mozL10n.get(descId);

      // If the message sent successfuly, and we're sending this as a
      // side-effect of the user hitting "send" on the compose screen,
      // (i.e. emitNotifications is true), we may need to play a sound.
      if (data.state === 'success') {
        // Grab an up-to-date reading of the "play sound on send"
        // preference to decide if we're going to play a sound or not.
        model.latestOnce('acctsSlice', function() {
          var account = model.getAccount(data.accountId);
          if (!account) {
            console.error('Invalid account ID', data.accountId,
                          'for a background send notification.');
            return;
          }

          // If email is in the background, we should still be able to
          // play audio due to having the 'audio-channel-notification'
          // permission (unless higher priority audio is playing).

          // TODO: As of June 2014, this behavior is still in limbo;
          // see the following links for relevant discussion. We may
          // need to follow up to ensure we get the behavior we want
          // (which is to play a sound when possible, even if we're in
          // the background).
          //   Thread on dev-gaia: http://goo.gl/l6REZy
          //   AUDIO_COMPETING bugs: https://bugzil.la/911238
          if (account.playSoundOnSend) {
            if (!sentAudio) {
              sentAudio = new Audio('/sounds/sent.ogg');
              sentAudio.mozAudioChannelType = 'notification';
            }
            sentAudio.play();
          }
        }.bind(this));
      }

      // If we are in the foreground, notify through the model, which
      // will display an in-app toast notification when appropriate.
      if (!document.hidden) {
        model.notifyBackgroundSendStatus(data);
      }
      // Otherwise, notify with a system notification in the case of
      // an error. By design, we don't use system-level notifications
      // to notify the user on success, lest they get inundated with
      // notifications.
      else if (data.state === 'error' && data.emitNotifications) {
        appSelf.latest('self', function(app) {
          var iconUrl = notificationHelper.getIconURI(app);
          var dataString = fromObject({
            type: 'message_reader',
            folderType: 'outbox',
            accountId: data.accountId,
            messageSuid: data.suid
          });

          sendNotification(
            BACKGROUND_SEND_NOTIFICATION_ID,
            mozL10n.get('background-send-error-title'),
            data.localizedDescription,
            iconUrl + '#' + dataString
          );
        });
      }
    };
  });
});
