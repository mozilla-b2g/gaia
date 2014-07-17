/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global CpScreenHelper, Notification, NotificationHelper, ParsedMessage,
          Promise, SiSlScreenHelper, WhiteList */

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
    setOnCloseCallback: wpm_setOnCloseCallback,
    clearNotifications: wpm_clearNotifications,
    enableAcceptButton: wpm_enableAcceptButton
  };

  /** Settings key for enabling/disabling WAP Push messages */
  var wapPushEnableKey = 'wap.push.enabled';

  /** Enable/disable WAP Push notifications */
  var wapPushEnabled = true;

  /** A reference to the app's object */
  var app = null;

  /** Accept button node */
  var acceptButton = null;

  /** Close button node */
  var closeButton = null;

  /** Callback function to be invoqued when closing the app from either mode
    * CP or SI/SL */
  var onCloseCallback = null;

  /** Timer used to schedule a close operation */
  var closeTimeout = null;

  /**
   * Number of messages that have been received but haven't been fully
   * processed yet
   */
  var pendingMessages = 0;

  /**
   * Returns a promise used to retrieve the app's own object.
   *
   * @return {Object} A promise for the app object.
   */
  function wpm_getApp() {
    return new Promise(function(resolve, reject) {
      var req = navigator.mozApps.getSelf();

      req.onsuccess = function wpm_gotApp(event) {
        resolve(event.target.result);
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
        resolve(req.result[wapPushEnableKey]);
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
   *         been fully initialized
   */
  function wpm_init() {
    // Listen to settings changes right away
    navigator.mozSettings.addObserver(wapPushEnableKey, wpm_onSettingsChange);

    // Retrieve the various page elements
    acceptButton = document.getElementById('accept');
    closeButton = document.getElementById('close');

    // Get the app object and configuration
    var promise = Promise.all([wpm_getApp(), wpm_getConfig()]);

    promise = promise.then(function(values) {
      app = values[0];
      wapPushEnabled = values[1];

      // Init screen helpers
      SiSlScreenHelper.init();
      CpScreenHelper.init();

      // Register event and message handlers only after initialization is done
      closeButton.addEventListener('click', wpm_onClose);
      document.addEventListener('visibilitychange', wpm_onVisibilityChange);
      window.navigator.mozSetMessageHandler('notification', wpm_onNotification);
      window.navigator.mozSetMessageHandler('wappush-received',
                                            wpm_onWapPushReceived);
    }).catch(function(error) {
      // If we encountered an error don't process messages
      wapPushEnabled = false;
      error = error || 'Unknown error';
      console.error('Could not initialize:', error);
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
   * Show/hide the accept button.
   *
   * @param {Boolean} enabled Shows the accept button when true, hides it
   *        otherwise.
   */
  function wpm_enableAcceptButton(enabled) {
    acceptButton.classList.toggle('hidden', !enabled);
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
   */
  function wpm_sendNotification(message) {
    var _ = navigator.mozL10n.get;
    var iconURL = NotificationHelper.getIconURI(app);

    /* Build the notification's text, for text/vnd.wap.connectivity-xml
     * messages this needs to be localized. */
    var text = '';

    if (message.text) {
      text = (message.type == 'text/vnd.wap.connectivity-xml') ?
             _(message.text) : message.text;
    }

    if (message.href) {
      text += (text ? ' ' : '');
      text += message.href;
    }

    // Build the title, this is normally the sender's number
    var title = message.sender;

    /* If the phone has more than one SIM prepend the number of the SIM on
     * which this message was received */
    if (navigator.mozIccManager &&
        navigator.mozIccManager.iccIds.length > 1) {
      var simName = _('sim', { id: +message.serviceId + 1 });

      title = _(
        'dsds-notification-title-with-sim',
         { sim: simName, title: title }
      );
    }

    var options = {
      icon: iconURL,
      body: text,
      tag: message.timestamp
    };

    var notification = new Notification(title, options);
    notification.addEventListener('click',
      function wpm_onNotificationClick(event) {
        app.launch();
        wpm_displayWapPushMessage(event.target.tag);
      }
    );
  }

  /**
   * Handler for the wappush-received system messages, stores the message into
   * the internal database and posts a notification which can be used to
   * display the message.
   *
   * @param {Object} wapMessage The WAP Push message as provided by the system.
   */
  function wpm_onWapPushReceived(wapMessage) {
    pendingMessages++;

    var message = ParsedMessage.from(wapMessage, Date.now());

    if (!wpm_shouldDisplayMessage(message)) {
      wpm_finish();
      return;
    }

    message.save(
      function wpm_saveSuccess(status) {
        if (status === 'discarded') {
          wpm_finish();
          return;
        }

        wpm_sendNotification(message);
        wpm_finish();
      },
      function wpm_saveError(error) {
        console.log('Could not add a message to the database: ' + error + '\n');
        wpm_finish();
      }
    );
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

    /* Clear the close timer when a notification is tapped as the app will soon
     * become visible */
    window.clearTimeout(closeTimeout);
    closeTimeout = null;

    app.launch();
    wpm_displayWapPushMessage(message.tag);
  }

  /**
   * Retrieves a WAP Push message from the database and displays it
   *
   * @param {String} timestamp The message timestamp as a string.
   */
  function wpm_displayWapPushMessage(timestamp) {
    ParsedMessage.load(timestamp,
      function wpm_loadSuccess(message) {
        if (message) {
          switch (message.type) {
            case 'text/vnd.wap.si':
            case 'text/vnd.wap.sl':
              SiSlScreenHelper.populateScreen(message);
              wpm_clearNotifications(timestamp);
              break;
            case 'text/vnd.wap.connectivity-xml':
              CpScreenHelper.populateScreen(message);
              break;
          }
        } else {
          // Notify the user that the message has expired
          SiSlScreenHelper.populateScreen();
          wpm_clearNotifications(timestamp);
        }
      },
      function wpm_loadError(error) {
        console.log('Could not retrieve the message:' + error + '\n');
      }
    );
  }

  /**
   * Remove notifications for a given tag
   */
  function wpm_clearNotifications(tag) {
    Notification.get({tag: tag}).then(
      function onSuccess(notifications) {
        for (var i = 0; i < notifications.length; i++) {
          notifications[i].close();
        }
      },
      function onError(reason) {
        console.error('Notification.get() promise error: ' + reason);
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
      closeTimeout = null;
      window.close();
    }, 100);
  }

  /**
   * Invoque the callback function that handles the applicaton flow in the
   * different mode (SI/SL or CP) and close the app.
   */
  function wpm_onClose() {
    if (onCloseCallback && (typeof onCloseCallback === 'function')) {
      onCloseCallback();
    }
  }

  /**
   * Set the callback function that handles the applicaton flow in the different
   * mode (SI/SL or CP) when the user tries to close the application with the
   * close button.
   *
   * @param {function} callback The callback function.
   */
  function wpm_setOnCloseCallback(callback) {
    onCloseCallback = callback;
  }

  exports.WapPushManager = WapPushManager;
})(this);
