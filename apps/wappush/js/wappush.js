/* global CpScreenHelper, DUMP, MessageDB, Notification, NotificationHelper,
          ParsedMessage, Promise, SiSlScreenHelper, WhiteList, Utils */

/* exported WapPushManager */

(function(exports) {
  'use strict';

  /**
   * Handles incoming WAP Push messages and contains the functionality required
   * to post notifications and display their contents
   */
  var WapPushManager = {
    init: wpm_init,
    close: wpm_close,
    displayWapPushMessage: wpm_displayWapPushMessage,
    onVisibilityChange: wpm_onVisibilityChange,
    onWapPushReceived: wpm_onWapPushReceived
  };

  /** Settings key for enabling/disabling WAP Push messages */
  var wapPushEnableKey = 'wap.push.enabled';

  /** Enable/disable WAP Push notifications */
  var wapPushEnabled;

  /** A reference to the app's object */
  var app;

  /** Timer used to schedule a close operation */
  var closeTimeout;

  /**
   * Number of messages that have been received but haven't been fully
   * processed yet
   */
  var pendingMessages;

  /** Currently displayed SI message (null for SL and CP messages) */
  var displayedSiMessage;

  /**
   * Returns a promise used to retrieve the app's own object.
   *
   * @return {Object} A promise for the app object.
   */
  function wpm_getApp() {
    return new Promise(function(resolve, reject) {
      var req = navigator.mozApps.getSelf();

      req.onsuccess = function wpm_gotApp() {
        resolve(this.result);
      };
      req.onerror = function wpm_getAppError() {
        reject(this.error);
      };
    });
  }

  /**
   * Returns a promise used to retrieve the configuration of the app.
   *
   * @return {Object} A promise for the app configuration.
   */
  function wpm_getConfig() {
    return new Promise(function(resolve, reject) {
      var req = navigator.mozSettings.createLock().get(wapPushEnableKey);

      req.onsuccess = function wpm_settingsLockSuccess() {
        resolve(this.result[wapPushEnableKey]);
      };
      req.onerror = function wpm_settingsLockError() {
        reject(this.error);
      };
    });
  }

  /**
   * Initialize the WAP Push manager, this only subscribes to the
   * wappush-received message handler at the moment.
   *
   * @return {Object} A promise that will be fullfilled once the component has
   *         been fully initialized.
   */
  function wpm_init() {
    // Reset the internal state to default values.
    wapPushEnabled = true;
    app = null;
    closeTimeout = null;
    pendingMessages = 0;
    displayedSiMessage = null;

    // Listen to settings changes right away
    navigator.mozSettings.addObserver(wapPushEnableKey, wpm_onSettingsChange);

    // Get the app object and configuration
    var promise = Promise.all([
      wpm_getApp(), wpm_getConfig(), WhiteList.init()
    ]);

    promise = promise.then(function(values) {
      app = values[0];
      wapPushEnabled = values[1];

      // Init screen helpers
      SiSlScreenHelper.init();
      CpScreenHelper.init();

      // Register event and message handlers only after initialization is done
      MessageDB.on('new', wpm_onNew);
      MessageDB.on('update', wpm_onUpdate);
      MessageDB.on('discard', wpm_onDiscard);
      MessageDB.on('delete', wpm_onDelete);

      document.addEventListener('visibilitychange', wpm_onVisibilityChange);
      window.navigator.mozSetMessageHandler('notification', wpm_onNotification);
      window.navigator.mozSetMessageHandler('wappush-received',
                                            wpm_onWapPushReceived);
    }).catch(function(error) {
      // If we encountered an error don't process messages
      wapPushEnabled = false;
      var message = error.message || 'Unknown error';
      console.error('Could not initialize the WAP push manager: ', message);
      throw error;
    });

    return promise;
  }

  /**
   * Handler invoked when the 'wap.push.enabled' option changes.
   *
   * @param {Object} A settings object holding the new value.
   */
  function wpm_onSettingsChange(v) {
    wapPushEnabled = v.settingValue;
  }

  /**
   * Closes the application whenever it is hidden
   */
  function wpm_onVisibilityChange() {
    if (document.hidden) {
      wpm_close();
    } else {
      window.clearTimeout(closeTimeout);
      closeTimeout = null;
    }
  }

  /**
   * Establish if we must show this message or not; the message is shown only
   * if WAP Push functionality is enabled, the sender's MSISDN is whitelisted
   * or whitelisting is disabled
   *
   * @param {Object} message A parsed WAP Push message.
   *
   * @return {Boolean} true if the message should be displayed, false otherwise.
   */
  function wpm_shouldDisplayMessage(message) {
    if (!wapPushEnabled || (message === null)) {
       /* WAP push functionality is either completely disabled, ignore it. */
       return false;
    }

    if ((message.type !== 'text/vnd.wap.connectivity-xml') &&
        (!WhiteList.has(message.sender) || message.isExpired())) {
      /* The message isn't a provisioning message and comes from a non
       * white-listed MSISDN or it has already been expired, ignore it. */
      return false;
    }

    return true;
  }

  /**
   * Send a notification for the provided message
   *
   * @param {Object} message The message the user needs to be notified of
   *
   * @return {Object} A promise that is resolved once the notification has been
   *         sent and its events hooked up properly.
   */
  function wpm_sendNotification(message) {
    var iconURL = NotificationHelper.getIconURI(app);

    /* Build the notification's text, for text/vnd.wap.connectivity-xml
     * messages this needs to be localized. */
    var body;

    if (message.type === 'text/vnd.wap.connectivity-xml') {
      body = message.text; // The text will be localized
    } else {
      body = {
        id: (message.type === 'text/vnd.wap.si') ? 'si-message-body'
                                                 : 'sl-message-body',
        args: {
          text: message.text || '', // The text won't be localized
          url: message.href
        }
      };
    }

    var title = Utils.prepareMessageTitle(message);

    var options = {
      icon: iconURL,
      bodyL10n: body,
      tag: message.getUniqueId()
    };

    return NotificationHelper.send(title, options)
                             .then(function(notification) {
      notification.addEventListener('click',
        function wpm_onNotificationClick(event) {
          wpm_displayWapPushMessage(event.target.tag);
        }
      );
    });
  }

  /**
   * Handler for the wappush-received system messages, stores the message into
   * the internal database and posts a notification which can be used to
   * display the message. This method returns a promise which is currently used
   * only when testing. It is also exposed for testing reasons but shouldn't be
   * used outside of this file.
   *
   * @param {Object} wapMessage The WAP Push message as provided by the system.
   *
   * @return {Object} A promise that is resolved when the method executed
   *         successfully or rejected with the error code that caused the
   *         method to fail.
   */
  function wpm_onWapPushReceived(wapMessage) {
    DUMP('Received a message: ', wapMessage);
    pendingMessages++;

    var message = ParsedMessage.from(wapMessage, Date.now());

    if (!wpm_shouldDisplayMessage(message)) {
      DUMP('The message will not be displayed');
      wpm_finish();
      return Promise.resolve();
    }

    return message.save().catch(error => {
      var message = error.message || 'Unknown error';
      console.log('Could not add a message to the database: ' + message + '\n');
      wpm_finish();
      throw error;
    });
  }

  /**
   * Displays the contents of a WAP Push message
   *
   * @param {Object} message The notification event.
   */
  function wpm_onNotification(message) {
    if (!message.clicked) {
      return;
    }

    wpm_displayWapPushMessage(message.tag);
  }

  /**
   * Reacts to a new message being added to the database by showing a
   * notification or directly showing the message if required by the action
   * field.
   *
   * @param {Object} obj The new message in untyped form (i.e. JSON)
   */
  function wpm_onNew(obj) {
    DUMP('A new message added to the DB');

    var message = new ParsedMessage(obj);

    if (message.action === 'signal-high' ||
        message.action === 'execute-high')
    {
      /* We just decrease the number of pending messages instead of invoking
       * wpm_finish() since we don't want to start the close procedure. */
      pendingMessages--;
      wpm_displayWapPushMessage(message.getUniqueId());
    } else {
      wpm_sendNotification(message).then(() => wpm_finish());
    }
  }

  /**
   * Reacts to a message being updated in the database by updating the
   * notification and possibly the message being shown to the user.
   *
   * @param {Object} obj The new message in untyped form (i.e. JSON)
   */
  function wpm_onUpdate(obj) {
    DUMP('A message was updated in the DB');

    var message = new ParsedMessage(obj);

    // Update the message if we're currently displaying it
    if (displayedSiMessage &&
        displayedSiMessage.getUniqueId() === message.getUniqueId()) {
      displayedSiMessage = message;
      SiSlScreenHelper.populateScreen(message);
    }

    // This updates the existing notification
    wpm_sendNotification(message).then(() => wpm_finish());
  }

  /**
   * Removes the notifications for messages that have been deleted and closes
   * the app if the message being viewed has been deleted.
   *
   * @param {Object} obj The deleted message in untyped form (i.e. JSON)
   */
  function wpm_onDelete(obj) {
    DUMP('A message was deleted');

    var message = new ParsedMessage(obj);

    // Close the application if we're displaying the deleted message
    if (displayedSiMessage &&
        displayedSiMessage.getUniqueId() === message.getUniqueId()) {
      wpm_close();
    }

    // Remove the notification associated to the deleted message
    wpm_clearNotifications(+message.getUniqueId());
  }

  /**
   * Prints a debug statement when a message has been discarded, no further
   * action required.
   */
  function wpm_onDiscard() {
    DUMP('The message was discarded');
    wpm_finish();
  }

  /**
   * Retrieves a WAP Push message from the database and displays it
   *
   * @param {String} id The message id as a string.
   * @return {Promise} A promise that resolves once the message has been
   *                   displayed and the associated notification cleared.
   */
  function wpm_displayWapPushMessage(id) {
    DUMP('Displaying message ' + id);

    // Clear the close timer as the application will soon become visible
    app.launch();
    window.clearTimeout(closeTimeout);
    closeTimeout = null;

    return ParsedMessage.load(id).then(
      function wpm_loadResolved(message) {
        switch (message.type) {
          case 'text/vnd.wap.si':
            displayedSiMessage = message;
            CpScreenHelper.hide();

            if (message.isExpired()) {
              // Notify the user that the message has expired
              SiSlScreenHelper.populateScreen();
            } else {
              SiSlScreenHelper.populateScreen(message);
            }

            return wpm_clearNotifications(id);

          case 'text/vnd.wap.sl':
            displayedSiMessage = null;
            CpScreenHelper.hide();
            SiSlScreenHelper.populateScreen(message);
            return wpm_clearNotifications(id);

          case 'text/vnd.wap.connectivity-xml':
            displayedSiMessage = null;
            SiSlScreenHelper.hide();
            CpScreenHelper.showConfirmInstallationDialog(message);
            return Promise.resolve();
        }
      }
    ).catch(function(error) {
      var message = error.message || 'Unknown error';
      console.error('Could not retrieve the message: ', message);
      throw error;
    });
  }

  /**
   * Remove notifications for a given tag.
   *
   * @return {Promise} A promise that gets resolved once the notifications have
   *                   been cleared and rejects in case of error.
   */
  function wpm_clearNotifications(tag) {
    return Notification.get({tag: tag}).then(
      function onSuccess(notifications) {
        for (var i = 0; i < notifications.length; i++) {
          notifications[i].close();
        }
      },
      function onError(error) {
        var message = error.message || 'Unknown error';
        console.error('Could not get notification: ', message);
        throw error;
      }
    );
  }

  /**
   * Marks a message as processed and close the application if no more messages
   * are present and the application is not visible.
   */
  function wpm_finish() {
    pendingMessages--;

    if (document.hidden) {
      wpm_close();
    }
  }

  /**
   * Closes the application. Whenever this function is called it
   * starts a timer that will eventually close the application when no more
   * messages are being processed. Calling close multiple times is safe as only
   * one timer can be active at a time so subsequent calls will effectively be
   * no-ops.
   */
  function wpm_close() {
    if (closeTimeout !== null) {
      // We're already trying to close the app
      return;
    }

    /* We do not close the app immediately, instead we spin the event loop once
     * in the hope of catching pending messages that have been sent to the app
     * and have not yet been processed. If some messages are pending we'll
     * reschedule the close until they've all been processed. */
    closeTimeout = window.setTimeout(function wpm_delayedClose() {
      if (pendingMessages > 0) {
        // Pending messages were received since we set this timer
        closeTimeout = window.setTimeout(wpm_delayedClose, 100);
        return;
      }

      /* There's no more pending messages and the application is in the
       * background, close for real */
      DUMP('Automatically closing the application');
      closeTimeout = null;
      window.close();
    }, 100);
  }

  exports.WapPushManager = WapPushManager;
})(this);
