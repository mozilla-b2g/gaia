/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

function handleMessageNotification(options) {
  //Validate if message still exists before opening message thread
  //See issue https://bugzilla.mozilla.org/show_bug.cgi?id=837029
  if ((!options) || (!options.id)) {
    return;
  }
  var message = navigator.mozSms.getMessage(options.id);
  message.onerror = function onerror() {
    alert(navigator.mozL10n.get('deleted-sms'));
  };
  message.onsuccess = function onsuccess() {
    showThreadFromSystemMessage(options);
  };
}

function showThreadFromSystemMessage(options) {
  if (!options) {
    return;
  }
  var number = options.number ? options.number : null;
  var body = options.body ? options.body : null;
  var showAction = function act_action(number) {
    // If we only have a body, just trigger a new message.
    if (!number && body) {
      var escapedBody = Utils.escapeHTML(body);
      if (escapedBody === '') {
        return;
      }
      MessageManager.activityBody = escapedBody;
      window.location.hash = '#new';
      return;
    }

    var currentLocation = window.location.hash;
    switch (currentLocation) {
      case '#thread-list':
      case '#new':
        window.location.hash = '#num=' + number;
        delete MessageManager.lockActivity;
        break;
      case '#edit':
        history.back();
        showAction(number);
        break;
      default:
        if (currentLocation.indexOf('#num=') != -1) {
          // Don't switch back to thread list if we're
          // already displaying the requested number.
          if (currentLocation == '#num=' + number) {
            delete MessageManager.lockActivity;
          } else {
            MessageManager.activityTarget = number;
            window.location.hash = '#thread-list';
          }
        } else {
          window.location.hash = '#num=' + number;
          delete MessageManager.lockActivity;
        }
        break;
    }
  };

  if (!document.documentElement.lang) {
    navigator.mozL10n.ready(function waitLocalized() {
      showAction(number);
    });
  } else {
    if (!document.mozHidden) {
      // Case of calling from Notification
      showAction(number);
      return;
    }
    document.addEventListener('mozvisibilitychange',
      function waitVisibility() {
        document.removeEventListener('mozvisibilitychange', waitVisibility);
        showAction(number);
    });
  }
}

window.navigator.mozSetMessageHandler('activity', function actHandle(activity) {
  // XXX This lock is about https://github.com/mozilla-b2g/gaia/issues/5405
  if (MessageManager.lockActivity)
    return;
  MessageManager.lockActivity = true;
  activity.postResult({ status: 'accepted' });
  var options = {
    number: activity.source.data.number,
    body: activity.source.data.body
  };
  showThreadFromSystemMessage(options);
});

/* === Incoming SMS support === */

// We want to register the handler only when we're on the launch path
if (!window.location.hash.length) {
  window.navigator.mozSetMessageHandler('sms-received',
    function smsReceived(message) {
      // Acquire the cpu wake lock when we receive an SMS.  This raises the
      // priority of this process above vanilla background apps, making it less
      // likely to be killed on OOM.  It also prevents the device from going to
      // sleep before the user is notified of the new message.
      //
      // We'll release it once we display a notification to the user.  We also
      // release the lock after 30s, in case we never run the notification code
      // for some reason.
      var wakeLock = navigator.requestWakeLock('cpu');
      var wakeLockReleased = false;
      var timeoutID = null;
      function releaseWakeLock() {
        if (timeoutID !== null) {
          clearTimeout(timeoutID);
          timeoutID = null;
        }
        if (!wakeLockReleased) {
          wakeLockReleased = true;
          wakeLock.unlock();
        }
      }
      timeoutID = setTimeout(releaseWakeLock, 30 * 1000);

      // The black list includes numbers for which notifications should not
      // progress to the user. Se blackllist.js for more information.
      var number = message.sender;
      var threadId = message.threadId;
      var id = message.id;

      // Class 0 handler:
      if (message.messageClass === 'class-0') {
        // XXX: Hack hiding the message class in the icon URL
        // Should use the tag element of the notification once the final spec
        // lands:
        // See: https://bugzilla.mozilla.org/show_bug.cgi?id=782211
        navigator.mozApps.getSelf().onsuccess = function(evt) {
          var app = evt.target.result;
          var iconURL = NotificationHelper.getIconURI(app);

          // XXX: Add params to Icon URL.
          iconURL += '?class0';
          var messageBody = number + '\n' + message.body;

          // We have to remove the SMS due to it does not have to be shown.
          MessageManager.deleteMessage(message.id, function() {
            app.launch();
            alert(messageBody);
            releaseWakeLock();
          });

        };
        return;
      }
      if (BlackList.has(message.sender)) {
        releaseWakeLock();
        return;
      }

      function dispatchNotification(needManualRetrieve) {
        // The SMS app is already displayed
        if (!document.mozHidden) {

          // TODO: This satisfies the single recipient per thread assumption
          // but needs to be updated to use threadId. Please ref bug 868679.
          var currentThread = MessageManager.currentThread;
          // If we are in the same thread, only we need to vibrate
          // XXX: Workaround for threadId bug in 870562.
          if (threadId && threadId == currentThread) {
            navigator.vibrate([200, 200, 200]);
            releaseWakeLock();
            return;
          }
        }

        navigator.mozApps.getSelf().onsuccess = function(evt) {
          var app = evt.target.result;
          var iconURL = NotificationHelper.getIconURI(app);

          // Stashing the number at the end of the icon URL to make sure
          // we get it back even via system message
          iconURL += '?sms-received?' + number + '?' + id;

          var goToMessage = function() {
            app.launch();
            var options = {
              number: number,
              id: id
            };
            handleMessageNotification(options);
          };

          function getTitleFromMms(callback) {
            // If message is not downloaded notification, we need to apply
            // specific text in notification title;
            // If subject exist, we display subject first;
            // If the message only has text content, display text context;
            // If there is no subject nor text content, display
            // 'mms message' in the field.
            if (needManualRetrieve) {
              setTimeout(function notDownloadedCb() {
                callback(navigator.mozL10n.get('notDownloaded-title'));
              });
            }
            else if (message.subject) {
              setTimeout(function subjectCb() {
                callback(message.subject);
              });
            } else {
              SMIL.parse(message, function slideCb(slideArray) {
                var text, slidesLength = slideArray.length;
                for (var i = 0; i < slidesLength; i++) {
                  if (!slideArray[i].text)
                    continue;

                  text = slideArray[i].text;
                  break;
                }
                text = text ? text : navigator.mozL10n.get('mms-message');
                callback(text);
              });
            }
          }

          Contacts.findByPhoneNumber(message.sender, function gotContact(
                                                                  contact) {
            var sender;
            if (contact.length && contact[0].name) {
              sender = Utils.escapeHTML(contact[0].name[0]);
            } else {
              sender = message.sender;
            }

            if (message.type === 'sms') {
              NotificationHelper.send(sender, message.body, iconURL,
                                                            goToMessage);
              releaseWakeLock();
            } else { // mms
              getTitleFromMms(function textCallback(text) {
                NotificationHelper.send(sender, text, iconURL, goToMessage);
                releaseWakeLock();
              });
            }
          });
        };
      }
      // If message type is mms and pending on server, ignore the notification
      // because it will be retrieved from server automatically. Handle other
      // manual/error status as manual download and dispatch notification.
      // Please ref mxr for all the possible delivery status:
      // http://mxr.mozilla.org/mozilla-central/source/dom/mms/src/ril/MmsService.js#62
      if (message.type === 'sms') {
        dispatchNotification();
      } else {
        // Here we can only have one sender, so deliveryStatus[0] => message
        // status from sender.
        var status = message.deliveryStatus[0];
        if (status === 'pending')
          return;

        // If the delivery status is manual/rejected/error, we need to apply
        // specific text to notify user that message is not downloaded.
        dispatchNotification(status !== 'success');
      }
  });

  window.navigator.mozSetMessageHandler('notification',
    function notificationClick(message) {
      if (!message.clicked) {
        return;
      }

      navigator.mozApps.getSelf().onsuccess = function(evt) {
        var app = evt.target.result;
        app.launch();

        // Getting back the number form the icon URL
        var notificationType = message.imageURL.split('?')[1];
        // Case regular 'sms-received'
        if (notificationType == 'sms-received') {

          var number = message.imageURL.split('?')[2];
          var id = message.imageURL.split('?')[3];
          var options = {
            number: number,
            id: id
          };
          handleMessageNotification(options);
          return;
        }
        var number = message.title;
        // Class 0 message
        var messageBody = number + '\n' + message.body;
        alert(messageBody);
      };
    });
}
