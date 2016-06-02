/*global Contacts,
         MessageManager,
         Navigation,
         NotificationHelper,
         Notify,
         Settings,
         SilentSms,
         SMIL,
         Utils
*/
/*exported SystemMessageHandler */
(function(exports) {
  'use strict';

  /**
   * Number of milliseconds after which currently acquired wake lock will be
   * automatically released.
   * @type {Number}
   * @const
   */
  const AUTO_WAKE_LOCK_UNLOCK_TIMEOUT = 30 * 1000;

  const priv = {
    wakeLock: Symbol('wakeLock'),
    autoWakeLockUnlockTimeout: Symbol('autoWakeLockUnlockTimeout')
  };

  /**
   * Object that is responsible for handling "sms-received" and "notification"
   * system messages.
   */
  var SystemMessageHandler = {
    /**
     * Wake lock instance.
     * @type {MozWakeLock}
     * @private
     */
    [priv.wakeLock]: null,

    /**
     * Timeout that will trigger to release of currently active wake lock.
     * @type {Number}
     * @private
     */
    [priv.autoWakeLockUnlockTimeout]: null,

    /**
     * Initializes system message handlers, if app is run as activity, no
     * system message handlers will be registered.
     */
    init() {
      if (!navigator.mozSetMessageHandler) {
        return;
      }

      navigator.mozSetMessageHandler(
        'sms-received', this.onSmsReceivedSystemMessage.bind(this)
      );

      navigator.mozSetMessageHandler(
        'notification', this.onNotificationSystemMessage.bind(this)
      );
    },

    /**
     * Requests application wake lock.
     * @private
     */
    requestWakeLock() {
      this[priv.wakeLock] = navigator.requestWakeLock('cpu');

      this[priv.autoWakeLockUnlockTimeout] = setTimeout(
        () => this.releaseWakeLock(), AUTO_WAKE_LOCK_UNLOCK_TIMEOUT
      );
    },

    /**
     * Releases currently active application wake lock.
     * @private
     */
    releaseWakeLock() {
      var autoWakeLockUnlockTimeout = this[priv.autoWakeLockUnlockTimeout];
      if (autoWakeLockUnlockTimeout) {
        clearTimeout(autoWakeLockUnlockTimeout);
        this[priv.autoWakeLockUnlockTimeout] = null;
      }

      var wakeLock = this[priv.wakeLock];
      if (wakeLock) {
        wakeLock.unlock();
        this[priv.wakeLock] = null;
      }
    },

    /**
     * Prepares notification body for the message
     * @param {MozMmsMessage|MozSmsMessage} message Message to prepare
     * notification body for.
     * @returns {Promise.<{raw: string}|string>} L10n object that will serve as
     * notification body.
     * @private
     */
    getNotificationBody(message) {
      // In case of sms, we want to display text content in notification.
      if (message.type === 'sms') {
        return Promise.resolve({ raw: message.body || '' });
      }

      var mmsNotificationBodyL10n = null;

      // Here we can only have one sender, so deliveryInfo[0].deliveryStatus
      // => message status from sender.
      if (message.deliveryInfo[0].deliveryStatus !== 'success') {
        // If the delivery status is manual/rejected/error, we need to apply
        // specific text to notify user that message is not downloaded.
        mmsNotificationBodyL10n = 'notDownloaded-title';
      } else if (message.subject) {
        // If subject exist, we display subject in notification.
        mmsNotificationBodyL10n = { raw: message.subject };
      }

      return mmsNotificationBodyL10n ?
        Promise.resolve(mmsNotificationBodyL10n) :
        SMIL.parse(message).then((slideArray) => {
          // If MMS has at least one non-empty text slide, let's display that
          // text in notification otherwise use predefined 'mms message'.
          var textSlide = slideArray.find((slide) => !!slide.text);
          return textSlide ? { raw: textSlide.text } : 'mms-message';
        });
    },

    /**
     * Prepares notification title for the message
     * @param {MozMmsMessage|MozSmsMessage} message Message to prepare
     * notification title for.
     * @returns {Promise.<{raw: string}|{id: string, args: Object}>} L10n object
     * that will serve as notification title.
     * @private
     */
    getNotificationTitle(message) {
      return Contacts.findByAddress(message.sender).then((contacts) => {
        var sender = contacts.length && contacts[0].name &&
          contacts[0].name.length && contacts[0].name[0] ||
          message.sender;

        if (Settings.hasSeveralSim() && message.iccId) {
          return Utils.getSimNameByIccId(message.iccId).then(
            (simName) => ({
              id: 'dsds-notification-title-with-sim',
              args: { sim: simName, sender: sender }
            })
          );
        }

        return { raw: sender };
      });
    },

    /**
     * Retrieves correct application icon to use within notifications.
     * @returns {string} Application icon URI.
     * @private
     */
    getNotificationIcon() {
      return navigator.mozApps.getSelf().then(
        (app) => NotificationHelper.getIconURI(app)
      );
    },

    /**
     * Processes received class-0 message (flash message).
     * @param {MozMmsMessage|MozSmsMessage} message Received class-0 message.
     * @returns {Promise.<void>} Promise that is resolved once message is fully
     * handled.
     * @private
     */
    onFlashMessageReceived(message) {
      // We have to remove message from DB as it should not be kept in Inbox.
      return MessageManager.deleteMessages(message.id).then(
        () => navigator.mozApps.getSelf()
      ).then((app) =>{
        app.launch();

        Notify.ringtone();
        Notify.vibrate();

        Utils.alert({ raw: message.body || '' }, { raw: message.sender });
      });
    },

    /**
     * Handles received class-1, class-2 or class-3 message.
     * @param {MozMmsMessage|MozSmsMessage} message Received message.
     * @returns {Promise.<void>} Promise that is resolved once message is fully
     * handled.
     * @private
     */
    onMessageReceived(message) {
      // If message type is mms and pending on server, ignore the notification
      // because it will be retrieved from server automatically. Handle other
      // manual/error status as manual download and dispatch notification.
      // Please ref mxr for all the possible delivery status:
      // http://mxr.mozilla.org/mozilla-central/source/dom/mms/src/ril/
      // MmsService.js#62
      // Here we can only have one sender, so deliveryInfo[0].deliveryStatus
      // => message status from sender.
      if (message.type === 'mms' &&
          message.deliveryInfo[0].deliveryStatus === 'pending') {
        return;
      }

      var isInConversation = Navigation.isCurrentPanel(
        'thread', { id: message.threadId }
      );

      // If app is already opened and we're in the right conversation, let's
      // just notify user about new message.
      if (!document.hidden && isInConversation) {
        Notify.ringtone();
        Notify.vibrate();
        return;
      }

      return Promise.all([
        this.getNotificationTitle(message),
        this.getNotificationBody(message),
        this.getNotificationIcon()
      ]).then(([titleL10n, bodyL10n, icon]) => {
        // Force the helper to leave close behavior as it is because it should
        // be handled in Utils.closeNotificationsForThread later.
        return NotificationHelper.send(titleL10n, {
          icon: icon,
          bodyL10n: bodyL10n,
          tag: 'threadId:' + message.threadId,
          data: { id: message.id, threadId: message.threadId },
          closeOnClick: false
        });
      }).then((notification) => {
        notification.addEventListener(
          'click', () => this.onNotificationClicked(message)
        );

        // Close notification if we are already in conversation view and app
        // becomes visible.
        if (document.hidden && isInConversation) {
          Utils.onceDocumentIsVisible().then(() => notification.close());
        }
      });
    },

    /**
     * Fires once notification is clicked.
     * @param {{ id: string, threadId: string }} notification Notification
     * arbitrary data.
     * @returns {Promise.<void>} Promise that is resolved once notification
     * click is handled.
     * @private
     */
    onNotificationClicked({ id, threadId }) {
      return navigator.mozApps.getSelf().then((app) => {
        app.launch();

        // If we're currently in the target conversation, just do nothing.
        if (Navigation.isCurrentPanel('thread', { id: threadId })) {
          return;
        }

        //Validate if message still exists before opening message thread
        //See issue https://bugzilla.mozilla.org/show_bug.cgi?id=837029
        return MessageManager.getMessage(id).then(
          (message) => Navigation.toPanel('thread', { id: message.threadId }),
          () => {
            if (Navigation.hasPendingInit()) {
              Navigation.init();
            }
            Utils.alert('deleted-sms');
          }
        );
      });
    },

    /**
     * Handles "sms-received" system message.
     * @param {MozMmsMessage|MozSmsMessage} message Received message.
     * @returns {Promise.<void>} Promise that is resolved once message is fully
     * handled.
     * @private
     */
    onSmsReceivedSystemMessage(message) {
      // Acquire the cpu wake lock when we receive an SMS.  This raises the
      // priority of this process above vanilla background apps, making it less
      // likely to be killed on OOM.  It also prevents the device from going to
      // sleep before the user is notified of the new message.
      //
      // We'll release it once we display a notification to the user.  We also
      // release the lock after 30s, in case we never run the notification code
      // for some reason.
      this.requestWakeLock();

      var handleReceivedMessagePromise;
      if (message.messageClass === 'class-0') {
        handleReceivedMessagePromise = this.onFlashMessageReceived(message);
      } else {
        handleReceivedMessagePromise = SilentSms.checkSilentModeFor(
          message.sender
        ).then((isSilent) => {
          if (!isSilent) {
            return this.onMessageReceived(message);
          }
        });
      }

      return handleReceivedMessagePromise.then(() => this.releaseWakeLock());
    },

    /**
     * Handles "notification" system message.
     * @param {Notification} notification Notification object.
     * @returns {Promise.<void>} Promise that is resolved once notification
     * system message is handled.
     * @private
     */
    onNotificationSystemMessage(notification) {
      // When notification is removed from notification tray, notification
      // system message will still be fired, but "clicked" property will be
      // equal to false. This should change once bug 1139363 is landed. When
      // user clicks on notification we'll get two system messages, first to
      // notify app that notification is clicked and then, once we show
      // Conversation view to the user, we remove that notification from the
      // tray that causes the second system message with "clicked" set to false.
      if (!notification.clicked || !notification.data) {
        // Force closing the window for notification removal case
        // because navigation didn't init correctly if pending notification
        // message existed.
        if (Navigation.hasPendingInit()) {
          window.close();
          return Promise.reject(new Error('Notification has been dismissed.'));
        }
        return Promise.resolve();
      }

      // At the moment notification.data is { id, threadId }.
      return this.onNotificationClicked(notification.data);
    }
  };

  exports.SystemMessageHandler = SystemMessageHandler;
})(self);
