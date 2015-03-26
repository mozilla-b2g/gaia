/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/*global Utils, MessageManager, Compose, NotificationHelper,
         Attachment, Notify, SilentSms, Threads, SMIL, Contacts,
         ThreadUI, Notification, Settings, Navigation */
/*exported ActivityHandler */

'use strict';

/**
 * Describes available data types that can be associated with the activities.
 * @enum {string}
 */
const ActivityDataType = {
  IMAGE: 'image/*',
  AUDIO: 'audio/*',
  VIDEO: 'video/*',
  URL: 'url',
  VCARD: 'text/vcard'
};

var ActivityHandler = {
  // Will hold current activity object
  _activity: null,

  init: function() {
    if (!window.navigator.mozSetMessageHandler) {
      return;
    }

    // A mapping of MozActivity names to their associated event handler
    window.navigator.mozSetMessageHandler('activity',
      this._onActivity.bind(this, {
        'new': this._onNewActivity,
        'share': this._onShareActivity
      })
    );

    // We don't want to register these system handlers when app is run as
    // inline activity
    if (!Navigation.getPanelName().startsWith('activity')) {
      window.navigator.mozSetMessageHandler('sms-received',
        this.onSmsReceived.bind(this));

      window.navigator.mozSetMessageHandler('notification',
        this.onNotification.bind(this));
    }
  },

  isInActivity: function isInActivity() {
    return !!this._activity;
  },

  setActivity: function setActivity(value) {
    if (!value) {
      throw new Error('Activity should be defined!');
    }
    this._activity = value;
  },

  // The Messaging application's global Activity handler. Delegates to specific
  // handler based on the Activity name.
  _onActivity: function activityHandler(handlers, activity) {
    var name = activity.source.name;
    var handler = handlers[name];

    if (typeof handler === 'function') {
      this.setActivity(activity);

      handler.call(this, activity);
    } else {
      console.error('Unrecognized activity: "' + name + '"');
    }
  },

  /**
  * Finds a contact from a number or email address.
  * Returns a promise that resolve with a contact
  * or is rejected if not found
  * @returns Promise that resolve to a
  * {number: String, name: String, source: 'contacts'}
  */
  _findContactByTarget: function findContactByTarget(target) {
    var deferred = Utils.Promise.defer();
    Contacts.findByAddress(target).then((contacts) => {
      var record, name, contact;

      // Bug 867948: results null is a legitimate case
      if (contacts && contacts.length) {
        record = contacts[0];
        name = record.name.length && record.name[0];
        contact = {
          number: target,
          name: name,
          source: 'contacts'
        };

        deferred.resolve(contact);
        return;
      }
      deferred.reject(new Error('No contact found with target: ' + target));
      return;

    });

    return deferred.promise;
  },

  _onNewActivity: function newHandler(activity) {
    var viewInfo = {
      body: activity.source.data.body,
      number: activity.source.data.target || activity.source.data.number,
      contact: null,
      threadId: null
    };

    var focusComposer = false;
    var threadPromise;
    if (viewInfo.number) {
      // It's reasonable to focus on composer if we already have some phone
      // number or even contact to fill recipients input
      focusComposer = true;
      // try to get a thread from number
      // if no thread, promise is rejected and we try to find a contact
      threadPromise = MessageManager.findThreadFromNumber(viewInfo.number).then(
        function onResolve(threadId) {
          viewInfo.threadId = threadId;
        },
        function onReject() {
          return ActivityHandler._findContactByTarget(viewInfo.number)
            .then((contact) => viewInfo.contact = contact);
        }
      )
      // case no contact and no thread id: gobble the error
      .catch(() => {});
    }

    return (threadPromise || Promise.resolve()).then(
      () => this.toView(viewInfo, focusComposer)
    );
  },

  _onShareActivity: function shareHandler(activity) {
    var activityData = activity.source.data,
        dataToShare = null;

    switch(activityData.type) {
      case ActivityDataType.AUDIO:
      case ActivityDataType.VIDEO:
      case ActivityDataType.IMAGE:
        var attachments = activityData.blobs.map(function(blob, idx) {
          var attachment = new Attachment(blob, {
            name: activityData.filenames[idx],
            isDraft: true
          });

          return attachment;
        });

        var size = attachments.reduce(function(size, attachment) {
          if (attachment.type !== 'img') {
            size += attachment.size;
          }

          return size;
        }, 0);

        if (size > Settings.mmsSizeLimitation) {
          Utils.alert({
            id: 'attached-files-too-large',
            args: {
              n: activityData.blobs.length,
              mmsSize: (Settings.mmsSizeLimitation / 1024).toFixed(0)
            }
          }).then(() => this.leaveActivity());
          return;
        }

        dataToShare = attachments;
        break;
      case ActivityDataType.URL:
        dataToShare = activityData.url;
        break;
      // As for the moment we only allow to share one vcard we treat this case
      // in an specific block
      case ActivityDataType.VCARD:
        dataToShare = new Attachment(activityData.blobs[0], {
          name: activityData.filenames[0],
          isDraft: true
        });
        break;
      default:
        this.leaveActivity(
          'Unsupported activity data type: ' + activityData.type
        );
        return;
    }

    if (!dataToShare) {
      this.leaveActivity('No data to share found!');
      return;
    }

    Navigation.toPanel('composer').then(
      Compose.append.bind(Compose, dataToShare)
    );
  },

  /**
   * Leaves current activity and toggles request activity mode.
   * @param {string?} errorReason String message that indicates that something
   * went wrong and we'd like to call postError with the specified reason
   * instead of successful postResult.
   */
  leaveActivity: function ah_leaveActivity(errorReason) {
    if (this.isInActivity()) {
      if (errorReason) {
        this._activity.postError(errorReason);
      } else {
        this._activity.postResult({ success: true });
      }
      this._activity = null;
    }
  },

  handleMessageNotification: function ah_handleMessageNotification(message) {
    //Validate if message still exists before opening message thread
    //See issue https://bugzilla.mozilla.org/show_bug.cgi?id=837029
    if (!message) {
      return;
    }

    // If we're currently in the target thread, just do nothing
    if (Navigation.isCurrentPanel('thread', { id: message.threadId })) {
      return;
    }

    MessageManager.getMessage(message.id).then((message) => {
      if (!Threads.has(message.threadId)) {
        Threads.registerMessage(message);
      }

      if (Compose.isEmpty()) {
        ActivityHandler.toView(message);
        return;
      }

      Utils.confirm(
        'discard-new-message',
        'unsent-message-title',
        { text: 'unsent-message-option-discard', className: 'danger' }
      ).then(() => {
        ThreadUI.cleanFields();
        ActivityHandler.toView(message);
      });
    }, function onGetMessageError() {
      Utils.alert('deleted-sms');
    });
  },

  /**
   * Delivers the user to the correct view based on the params provided in the
   * "message" parameter.
   * @param {{number: string, body: string, contact: MozContact,
   * threadId: number}} message It's either a message object that belongs to a
   * thread, or a message object from the system. "number" is a string phone
   * number to pre-populate the recipients list with, "body" is an optional body
   * to preset the compose input with, "contact" is an optional MozContact
   * instance, "threadId" is an optional threadId corresponding to a new or
   * existing thread.
   * @param {Boolean} focusComposer Indicates whether we need to focus composer
   * when we navigate to Thread panel.
   */
  toView: function ah_toView(message, focusComposer) {
    var navigateToView = function act_navigateToView() {
      // If we have appropriate thread then let's forward user there, otherwise
      // open new message composer.
      if (message.threadId) {
        Navigation.toPanel('thread', {
          id: message.threadId,
          focusComposer: focusComposer
        });
        return;
      }

      Navigation.toPanel('composer', {
        activity: {
          body: message.body || null,
          number: message.number || null,
          contact: message.contact || null
        }
      });
    };

    navigator.mozL10n.once(function waitLocalized() {
      if (!document.hidden) {
        // Case of calling from Notification
        navigateToView();
        return;
      }

      document.addEventListener('visibilitychange', function waitVisibility() {
        document.removeEventListener('visibilitychange', waitVisibility);
        navigateToView();
      });
    });
  },

  /* === Incoming SMS support === */

  onSmsReceived: function ah_onSmsReceived(message) {
    var _ = navigator.mozL10n.get;

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

        // We have to remove the SMS due to it does not have to be shown.
        MessageManager.deleteMessages(message.id, function() {
          app.launch();
          Notify.ringtone();
          Notify.vibrate();
          Utils.alert({ raw: message.body || '' }, { raw: number });
          releaseWakeLock();
        });
      };
      return;
    }

    function dispatchNotification(needManualRetrieve) {
      // The SMS app is already displayed
      if (!document.hidden) {
        if (Navigation.isCurrentPanel('thread', { id: threadId })) {
          Notify.ringtone();
          Notify.vibrate();
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

        function goToMessage() {
          app.launch();
          ActivityHandler.handleMessageNotification(message);
        }

        function continueWithNotification(sender, body) {
          var title = sender;
          if (Settings.hasSeveralSim() && message.iccId) {
            var simName = Settings.getSimNameByIccId(message.iccId);
            title = _(
              'dsds-notification-title-with-sim',
              { sim: simName, sender: sender }
            );
          }

          var options = {
            icon: iconURL,
            body: body,
            tag: 'threadId:' + threadId
          };

          var notification = new Notification(title, options);
          notification.addEventListener('click', goToMessage);
          releaseWakeLock();

          // Close notification if we are already in thread view and view become
          // visible.
          if (document.hidden && threadId === Threads.currentId) {
            document.addEventListener('visibilitychange',
              function onVisible() {
                document.removeEventListener('visibilitychange', onVisible);
                notification.close();
            });
          }
        }

        function getTitleFromMms(callback) {
          // If message is not downloaded notification, we need to apply
          // specific text in notification title;
          // If subject exist, we display subject first;
          // If the message only has text content, display text context;
          // If there is no subject nor text content, display
          // 'mms message' in the field.
          if (needManualRetrieve) {
            setTimeout(function notDownloadedCb() {
              callback(_('notDownloaded-title'));
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
              text = text ? text : _('mms-message');
              callback(text);
            });
          }
        }

        Contacts.findByAddress(message.sender).then(function(contacts) {
          var sender = message.sender;
          if (!contacts) {
            console.error('We got a null contacts for sender:', sender);
          } else if (contacts.length && contacts[0].name &&
            contacts[0].name.length && contacts[0].name[0]) {
            sender = contacts[0].name[0];
          }
          if (message.type === 'sms') {
            continueWithNotification(sender, message.body || '');
          } else { // mms
            getTitleFromMms(function textCallback(text) {
              continueWithNotification(sender, text);
            });
          }
        });
      };
    }

    function handleNotification(isSilent) {
      if (isSilent) {
        releaseWakeLock();
      } else {
        // If message type is mms and pending on server, ignore the notification
        // because it will be retrieved from server automatically. Handle other
        // manual/error status as manual download and dispatch notification.
        // Please ref mxr for all the possible delivery status:
        // http://mxr.mozilla.org/mozilla-central/source/dom/mms/src/ril/
        // MmsService.js#62
        if (message.type === 'sms') {
          dispatchNotification();
        } else {
          // Here we can only have one sender, so deliveryInfo[0].deliveryStatus
          // => message status from sender.
          var status = message.deliveryInfo[0].deliveryStatus;
          if (status === 'pending') {
            return;
          }

          // If the delivery status is manual/rejected/error, we need to apply
          // specific text to notify user that message is not downloaded.
          dispatchNotification(status !== 'success');
        }
      }
    }
    SilentSms.checkSilentModeFor(message.sender).then(handleNotification);
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

    // When notification is removed from notification tray, notification system
    // message will still be fired, but "clicked" property will be equal to
    // false. This should change once bug 1139363 is landed.
    // When user clicks on notification we'll get two system messages,
    // first to notify app that notification is clicked and then, once we show
    // Thread panel to the user, we remove that notification from the tray that
    // causes the second system message with "clicked" set to false.
    if (!message.clicked) {
      // When app is run via notification system message there is no valid
      // current panel set hence app is in the invalid state, so let's fix this.
      Navigation.ensureCurrentPanel();
      return;
    }

    navigator.mozApps.getSelf().onsuccess = function(event) {
      var app = event.target.result;

      app.launch();

      // the type param is only set for class0 messages
      if (params.type === 'class0') {
        Utils.alert({ raw: message.body }, { raw: message.title });
        return;
      }

      ActivityHandler.handleMessageNotification({
        id: params.id,
        threadId: params.threadId
      });
    };
  }
};
