/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var initUIApp = function initApp() {
  // Init UI Managers
  ThreadUI.init();
  ThreadListUI.init();
  // We render the threads
  MessageManager.getThreads(ThreadListUI.renderThreads);
};

window.addEventListener('localized', function showBody() {
  MessageManager.init(initUIApp);
  // Set the 'lang' and 'dir' attributes to <html> when the page is translated
  document.documentElement.lang = navigator.mozL10n.language.code;
  document.documentElement.dir = navigator.mozL10n.language.direction;
});

window.navigator.mozSetMessageHandler('activity', function actHandle(activity) {
  MessageManager.init(initUIApp);
  // XXX This lock is about https://github.com/mozilla-b2g/gaia/issues/5405
  if (MessageManager.lockActivity)
    return;
  MessageManager.lockActivity = true;
  activity.postResult({ status: 'accepted' });
  var number = activity.source.data.number;
  showThreadFromSystemMessage(number);
});

/* === Incoming SMS support === */

// We want to register the handler only when we're on the launch path
if (!window.location.hash.length) {
  window.navigator.mozSetMessageHandler('sms-received',
    function smsReceived(message) {
    // The black list includes numbers for which notifications should not
    // progress to the user. Se blackllist.js for more information.
    var number = message.sender;
    // Class 0 handler:
    if (message.messageClass == 'class-0') {
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
        var showMessage = function() {
          app.launch();
          alert(messageBody);
        };

        // We have to remove the SMS due to it does not have to be shown.
        MessageManager.deleteMessage(message.id, function() {
          // Once we remove the sms from DB we launch the notification
          NotificationHelper.send(message.sender, message.body,
                                    iconURL, showMessage);
        });

      };
      return;
    }
    if (BlackList.has(message.sender))
      return;

    // The SMS app is already displayed
    if (!document.mozHidden) {
      var currentThread = MessageManager.currentNum;
      // If we are in the same thread, only we need to vibrate
      if (number == currentThread) {
        navigator.vibrate([200, 200, 200]);
        return;
      }
    }

    navigator.mozApps.getSelf().onsuccess = function(evt) {
      var app = evt.target.result;
      var iconURL = NotificationHelper.getIconURI(app);

      // Stashing the number at the end of the icon URL to make sure
      // we get it back even via system message
      iconURL += '?sms-received?' + number;

      var goToMessage = function() {
        app.launch();
        showThreadFromSystemMessage(number);
      };

      ContactDataManager.getContactData(message.sender,
      function gotContact(contact) {
        var sender;
        if (contact.length && contact[0].name) {
          sender = Utils.escapeHTML(contact[0].name[0]);
        } else {
          sender = message.sender;
        }

        NotificationHelper.send(sender, message.body, iconURL, goToMessage);
      });
    };
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
          showThreadFromSystemMessage(number);
          return;
        }
        var number = message.title;
        // Class 0 message
        var messageBody = number + '\n' + message.body;
        alert(messageBody);
      };
    }
  );
}
