/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global CpScreenHelper, Notification, NotificationHelper, ParsedMessage,
          SiSlScreenHelper, WhiteList */

/* exported WapPushManager */

(function(exports) {
  'use strict';

  // Set the 'lang' and 'dir' attributes to <html> when the page is translated
  window.addEventListener('localized', function localized() {
    document.documentElement.lang = navigator.mozL10n.language.code;
    document.documentElement.dir = navigator.mozL10n.language.direction;
  });

  /**
   * Handles incoming WAP Push messages and contains the functionality required
   * to post notifications and display their contents
   */
  var WapPushManager = {
    init: wpm_init,
    close: wpm_close,
    displayWapPushMessage: wpm_displayWapPushMessage,
    onVisibilityChange: wpm_onVisibilityChange,
    setOnCloseCallback: wpm_setOnCloseCallback
  };

  /** Settings key for enabling/disabling WAP Push messages */
  var wapPushEnableKey = 'wap.push.enabled';

  /** Enable/disable WAP Push notifications */
  var wapPushEnabled = true;

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
   * Initialize the WAP Push manager, this only subscribes to the
   * wappush-received message handler at the moment
   *
   * @param {Function} [done] An optional callback invoked when initialization
   *        has finished, useful for synchronizing unit-tests.
   */
  function wpm_init(done) {
    if ('mozSettings' in navigator) {
      // Read the global setting
      var req = navigator.mozSettings.createLock().get(wapPushEnableKey);

      req.onsuccess = function wpm_settingsLockSuccess() {
        wapPushEnabled = req.result[wapPushEnableKey];

        // Start listening to WAP Push messages only after we read the pref
        window.navigator.mozSetMessageHandler('wappush-received',
          wpm_onWapPushReceived);

        if (typeof done === 'function') {
          done();
        }
      };

      navigator.mozSettings.addObserver(wapPushEnableKey, wpm_onSettingsChange);
    }

    // Retrieve the various page elements
    closeButton = document.getElementById('close');

    // Init screen helpers
    SiSlScreenHelper.init();
    CpScreenHelper.init();

    // Event handlers
    closeButton.addEventListener('click', wpm_onClose);
    document.addEventListener('visibilitychange', wpm_onVisibilityChange);
    window.navigator.mozSetMessageHandler('notification', wpm_onNotification);
  }

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

    /* If a message has a 'signal-none' action but no 'si-id' and 'created'
     * fields then it does nothing in the current implementation and we can
     * drop it right away. */
    if (message.action === 'signal-none' && (!message.id || !message.created)) {
      wpm_finish();
      return;
    }

    message.save(
      function wpm_saveSuccess(status) {
        if ((status === 'discarded') || (message.action === 'signal-none')) {
          wpm_finish();
          return;
        }

        var req = navigator.mozApps.getSelf();

        req.onsuccess = function wpm_gotApp(event) {
          var _ = navigator.mozL10n.get;
          var app = event.target.result;
          var iconURL = NotificationHelper.getIconURI(app);

          message.text = (message.type == 'text/vnd.wap.connectivity-xml') ?
                         _(message.text) : message.text;
          var text = message.text ? (message.text + ' ') : '';

          text += message.href ? message.href : '';

          var options = {
            icon: iconURL,
            body: text,
            tag: message.timestamp
          };

          var onClick = function wpm_notificationOnClick(timestamp) {
            app.launch();
            wpm_displayWapPushMessage(timestamp);
          };

          var notification = new Notification(message.sender, options);
          notification.addEventListener('click', onClick.bind(options.tag));

          wpm_finish();
        };
        req.onerror = function wpm_getAppError() {
          wpm_finish();
        };
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

    navigator.mozApps.getSelf().onsuccess = function wpm_gotApp(event) {
      var app = event.target.result;

      app.launch();
      wpm_displayWapPushMessage(message.tag);
    };
  }

  /**
   * Retrieves a WAP Push message from the database and displays it
   *
   * @param {String} timestamp The message timestamp as a string.
   */
  function wpm_displayWapPushMessage(timestamp) {
    ParsedMessage.load(timestamp,
      function wpm_loadSuccess(message) {
        // Retrieve pending notifications and close the matching ones
        Notification.get({tag: timestamp}).then(
          function onSuccess(notifications) {
            for (var i = 0; i < notifications.length; i++) {
              notifications[i].close();
            }
          },
          function onError(reason) {
            console.error('Notification.get() promise error: ' + reason);
          }
        );

        if (message) {
          switch (message.type) {
            case 'text/vnd.wap.si':
            case 'text/vnd.wap.sl':
              SiSlScreenHelper.populateScreen(message);
              break;
            case 'text/vnd.wap.connectivity-xml':
              CpScreenHelper.populateScreen(message);
              break;
          }
        } else {
          SiSlScreenHelper.populateScreen(message);
        }
      },
      function wpm_loadError(error) {
        console.log('Could not retrieve the message:' + error + '\n');
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
