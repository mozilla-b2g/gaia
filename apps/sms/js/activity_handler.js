/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/*global Utils, MessageManager, Compose, OptionMenu, NotificationHelper,
         Attachment, Template, Notify, BlackList, Threads, SMIL, Contacts,
         ThreadUI */
/*exported ActivityHandler */

'use strict';

var ActivityHandler = {
  isLocked: false,

  // Will hold current activity object
  currentActivity: { new: null },

  init: function() {
    if (!window.navigator.mozSetMessageHandler) {
      return;
    }
    window.navigator.mozSetMessageHandler('activity', this.global.bind(this));

    // We want to register the handler only when we're on the launch path
    if (!window.location.hash.length) {
      window.navigator.mozSetMessageHandler('sms-received',
        this.onSmsReceived.bind(this));

      window.navigator.mozSetMessageHandler('notification',
        this.onNotification.bind(this));
    }
  },

  // The Messaging application's global Activity handler. Delegates to specific
  // handler based on the Activity name.
  global: function activityHandler(activity) {

    var name = activity.source.name;
    var handler = this._handlers[name];

    if (typeof handler === 'function') {
      handler.apply(this, arguments);
    } else {
      console.error('Unrecognized activity: "' + name + '"');
    }

    ThreadUI.enableActivityRequestMode();
  },

  // A mapping of MozActivity names to their associated event handler
  _handlers: {
    'new': function newHandler(activity) {

      // This lock is for avoiding several calls at the same time.
      if (this.isLocked) {
        return;
      }

      this.currentActivity.new = activity;
      this.isLocked = true;

      var number = activity.source.data.number;
      var body = activity.source.data.body;

      Contacts.findByPhoneNumber(number, function findContact(results) {
        var record, details, name, contact;

        // Bug 867948: results null is a legitimate case
        if (results && results.length) {
          record = results[0];
          details = Utils.getContactDetails(number, record);
          name = record.name.length && record.name[0];
          contact = {
            number: number,
            name: name,
            source: 'contacts'
          };
        }

        ActivityHandler.toView({
          body: body,
          number: number,
          contact: contact || null
        });
      });
    },
    share: function shareHandler(activity) {
      var blobs = activity.source.data.blobs,
        names = activity.source.data.filenames;

      function insertAttachments() {
        window.removeEventListener('hashchange', insertAttachments);

        blobs.forEach(function(blob, idx) {
          var attachment = new Attachment(blob, {
            name: names[idx],
            isDraft: true
          });
          // TODO: We only allow sharing one item in a single action now.
          //       Keeping the same sequence while adding the multiple items
          //       should be considered in the future.
          Compose.append(attachment);
        });
      }

      // Navigating to the 'New Message' page is an asynchronous operation that
      // clears the Composition field. If the application is not already in the
      // 'New Message' page, delay attachment insertion until after the
      // navigation is complete.
      if (window.location.hash !== '#new') {
        window.addEventListener('hashchange', insertAttachments);
        window.location.hash = '#new';
      } else {
        insertAttachments();
      }
    }
  },

  resetActivity: function ah_resetActivity() {
    this.currentActivity.new = null;
    ThreadUI.resetActivityRequestMode();
  },

  handleMessageNotification: function ah_handleMessageNotification(message) {
    //Validate if message still exists before opening message thread
    //See issue https://bugzilla.mozilla.org/show_bug.cgi?id=837029
    if (!message) {
      return;
    }

    var request = navigator.mozMobileMessage.getMessage(message.id);
    request.onsuccess = function onsuccess() {
      if (!Compose.isEmpty()) {
        if (window.confirm(navigator.mozL10n.get('discard-new-message'))) {
          ThreadUI.cleanFields(true);
        } else {
          return;
        }
      }

      ActivityHandler.toView(message);
    };

    request.onerror = function onerror() {
      alert(navigator.mozL10n.get('deleted-sms'));
    };
  },

  // The unsent confirmation dialog provides 2 options: edit and discard
  // discard: clear the message user typed
  // edit: continue to edit the unsent message and ignore the activity
  displayUnsentConfirmation: function ah_displayUnsentConfirmtion(activity) {
    var msgDiv = document.createElement('div');
    msgDiv.innerHTML = '<h1 data-l10n-id="unsent-message-title"></h1>' +
                       '<p data-l10n-id="unsent-message-description"></p>';
    var options = new OptionMenu({
      type: 'confirm',
      section: msgDiv,
      items: [{
        l10nId: 'unsent-message-option-edit',
        method: function editOptionMethod() {
          // it already in message app, we don't need to do anything but
          // clearing activity variables in MessageManager.
          MessageManager.activity = null;
        }
      },
      {
        l10nId: 'unsent-message-option-discard',
        method: this.launchComposer.bind(this),
        params: [activity]
      }]
    });
    options.show();
  },

  // Launch the UI properly taking into account the hash
  launchComposer: function ah_launchComposer(activity) {
    if (location.hash === '#new') {
      MessageManager.launchComposer(activity);
    } else {
      // Move to new message
      MessageManager.activity = activity;
      window.location.hash = '#new';
    }
  },

  // Check if we want to go directly to the composer or if we
  // want to keep the previously typed text
  triggerNewMessage: function ah_triggerNewMessage(body, number, contact) {
    /**
     * case 1: hash === #new
     *         check compose is empty or show dialog, and call onHashChange
     * case 2: hash starts with #thread
     *         check compose is empty or show dialog, and change hash to #new
     * case 3: others, change hash to #new
     */
     var activity = {
        body: body || null,
        number: number || null,
        contact: contact || null
      };

    if (Compose.isEmpty()) {
      this.launchComposer(activity);
    } else {
      // ask user how should we do
      ActivityHandler.displayUnsentConfirmation(activity);
    }
  },
  // Deliver the user to the correct view
  // based on the params provided in the
  // "message" object.
  //
  toView: function ah_toView(message) {
    /**
     *  "message" is either a message object that belongs
     *  to a thread, or a message object from the system.
     *
     *
     *  message {
     *    number: A string phone number to pre-populate
     *            the recipients list with.
     *
     *    body: An optional body to preset the compose
     *           input with.
     *
     *    contact: An optional "contact" object
     *
     *    threadId: An option threadId corresponding
     *              to a new or existing thread.
     *
     *  }
     */

    if (!message) {
      return;
    }
    this.isLocked = false;
    var threadId = message.threadId ? message.threadId : null;
    var body = message.body ? Template.escape(message.body) : '';
    var number = message.number ? message.number : '';
    var contact = message.contact ? message.contact : null;
    var threadHash = '#thread=' + threadId;

    var showAction = function act_action() {
      // If we only have a body, just trigger a new message.
      var locationHash = window.location.hash;
      if (!threadId) {
        ActivityHandler.triggerNewMessage(body, number, contact);
        return;
      }

      switch (locationHash) {
        case '#thread-list':
        case '#new':
          window.location.hash = threadHash;
          break;
        default:
          if (locationHash.indexOf('#thread=') !== -1) {
            // Don't switch back to thread list if we're
            // already displaying the requested threadId.
            if (locationHash !== threadHash) {
              MessageManager.activity = {
                threadId: threadId
              };
              window.location.hash = '#thread-list';
            }
          } else {
            window.location.hash = threadHash;
          }
          break;
      }
    };

    if (!document.documentElement.lang) {
      navigator.mozL10n.ready(function waitLocalized() {
        showAction();
      });
    } else {
      if (!document.hidden) {
        // Case of calling from Notification
        showAction();
        return;
      }
      document.addEventListener('visibilitychange',
        function waitVisibility() {
          document.removeEventListener('visibilitychange', waitVisibility);
          showAction();
      });
    }
  },

  /* === Incoming SMS support === */

  onSmsReceived: function ah_onSmsReceived(message) {
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
      navigator.mozApps.getSelf().onsuccess = function(event) {
        var app = event.target.result;
        var iconURL = NotificationHelper.getIconURI(app);

        // XXX: Add params to Icon URL.
        iconURL += '?type=class0';

        // We have to remove the SMS due to it does not have to be shown.
        MessageManager.deleteMessage(message.id, function() {
          app.launch();
          Notify.ringtone();
          Notify.vibrate();
          alert(number + '\n' + message.body);
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
      if (!document.hidden) {
        if (threadId === Threads.currentId) {
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
        iconURL += '?';
        iconURL += [
          'threadId=' + threadId,
          'number=' + encodeURIComponent(number),
          'id=' + id
        ].join('&');

        var goToMessage = function goToMessage() {
          app.launch();
          ActivityHandler.handleMessageNotification(message);
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
                if (!slideArray[i].text) {
                  continue;
                }

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
          var sender = message.sender;
          if (!contact) {
            console.error('We got a null contact for sender:', sender);
          } else if (contact.length && contact[0].name &&
            contact[0].name.length && contact[0].name[0]) {
            sender = contact[0].name[0];
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
      if (status === 'pending') {
        return;
      }

      // If the delivery status is manual/rejected/error, we need to apply
      // specific text to notify user that message is not downloaded.
      dispatchNotification(status !== 'success');
    }
  },

  onNotification: function ah_onNotificationClick(message) {
    // The "message" argument object does not have
    // the necessary information we need, so we'll
    // extract it from the imageURL string
    //
    // NOTE: In 1.2, use the arbitrary string allowed by
    // the new notification spec.
    //
    var params = Utils.params(message.imageURL);

    if (!message.clicked) {
      return;
    }

    navigator.mozApps.getSelf().onsuccess = function(event) {
      var app = event.target.result;

      app.launch();

      // the type param is only set for class0 messages
      if (params.type === 'class0') {
        alert(message.title + '\n' + message.body);
        return;
      }

      ActivityHandler.handleMessageNotification({
        id: params.id,
        threadId: params.threadId
      });
    };
  }
};
