/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global CpScreenHelper, NotificationHelper, ParsedMessage, SiSlScreenHelper,
          Utils, WhiteList */

/* exported WapPushManager */

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
  /** Settings key for enabling/disabling WAP Push messages */
  _wapPushEnableKey: 'wap.push.enabled',

  /** Enable/disable WAP Push notifications */
  _wapPushEnabled: true,

  /** Close button node */
  _closeButton: null,

  /** Callback function to be invoqued when closing the app from either mode
    * CP or SI/SL */
  _onCloseCallback: null,

  /** Callback function to be invoqued when receiving 'visibilitychange'
    * events */
  _onVisibilityChangeCallback: null,

  /** Timer used to schedule a close operation */
  _closeTimeout: null,

  /**
   * Number of messages that have been received but haven't been fully
   * processed yet
   */
  _pendingMessages: 0,

  /**
   * Initialize the WAP Push manager, this only subscribes to the
   * wappush-received message handler at the moment
   *
   * @param {Function} [done] An optional callback invoked when initialization
   *        has finished, useful for synchronizing unit-tests.
   */
  init: function wpm_init(done) {
    if ('mozSettings' in navigator) {
      // Read the global setting
      var req = navigator.mozSettings.createLock().get(this._wapPushEnableKey);

      req.onsuccess = (function wpm_settingsLockSuccess() {
        this._wapPushEnabled = req.result[this._wapPushEnableKey];

        // Start listening to WAP Push messages only after we read the pref
        window.navigator.mozSetMessageHandler('wappush-received',
          this.onWapPushReceived.bind(this));

        if (typeof done === 'function') {
          done();
        }
      }).bind(this);

      navigator.mozSettings.addObserver(this._wapPushEnableKey,
        (function wpm_settingsObserver(v) {
          this._wapPushEnabled = v.settingValue;
        }).bind(this));
    }

    // Retrieve the various page elements
    this._closeButton = document.getElementById('close');

    // Init screen helpers
    SiSlScreenHelper.init();
    CpScreenHelper.init();

    // Event handlers
    this._closeButton.addEventListener('click', this.onClose.bind(this));

    document.addEventListener(
      'visibilitychange',
      this.onVisibilityChange.bind(this)
    );

    window.navigator.mozSetMessageHandler('notification',
      this.onNotification.bind(this));
  },

  /**
   * Closes the application whenever it is hidden
   */
  onVisibilityChange: function wpm_onVisibilityChange() {
    if (this._onVisibilityChangeCallback &&
        (typeof this._onVisibilityChangeCallback === 'function')) {
      this._onVisibilityChangeCallback();
    }

    if (document.hidden) {
      this.close();
    } else {
      window.clearTimeout(this._closeTimeout);
      this._closeTimeout = null;
    }
  },

  /**
   * Establish if we must show this message or not; the message is shown only
   * if WAP Push functionality is enabled, the sender's MSISDN is whitelisted
   * or whitelisting is disabled
   *
   * @param {Object} message A parsed WAP Push message.
   *
   * @return {Boolean} true if the message should be displayed, false otherwise.
   */
  shouldDisplayMessage: function wpm_shouldDisplayMessage(message) {
    if (!this._wapPushEnabled || (message === null)) {
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
  },

  /**
   * Handler for the wappush-received system messages, stores the message into
   * the internal database and posts a notification which can be used to
   * display the message.
   *
   * @param {Object} wapMessage The WAP Push message as provided by the system.
   */
  onWapPushReceived: function wpm_onWapPushReceived(wapMessage) {
    this._pendingMessages++;

    var message = ParsedMessage.from(wapMessage, Date.now());

    if (!this.shouldDisplayMessage(message)) {
      this.finish();
      return;
    }

    message.save(
      (function wpm_saveSuccess(status) {
        if (status === 'discarded') {
          this.finish();
          return;
        }

        var req = navigator.mozApps.getSelf();

        req.onsuccess = (function wpm_gotApp(event) {
          var _ = navigator.mozL10n.get;
          var app = event.target.result;
          /* We store the message timestamp as a parameter to be able to
           * retrieve the message from the notification code */
          var iconURL = NotificationHelper.getIconURI(app) +
                       '?timestamp=' + encodeURIComponent(message.timestamp);

          message.text = (message.type == 'text/vnd.wap.connectivity-xml') ?
                         _(message.text) : message.text;
          var text = message.text ? (message.text + ' ') : '';

          text += message.href ? message.href : '';

          NotificationHelper.send(message.sender, text, iconURL,
            (function wpm_notificationOnClick() {
              app.launch();
              this.displayWapPushMessage(message.timestamp);
            }).bind(this));

          this.finish();
        }).bind(this);
        req.onerror = (function wpm_getAppError() {
          this.finish();
        }).bind(this);
      }).bind(this),
      (function wpm_saveError(error) {
        console.log('Could not add a message to the database: ' + error + '\n');
        this.finish();
      }).bind(this)
    );
  },

  /**
   * Displays the contents of a WAP Push message
   *
   * @param {Object} message The notification event.
   */
  onNotification: function wpm_onNotification(message) {
    if (!message.clicked) {
      return;
    }

    /* Clear the close timer when a notification is tapped as the app will soon
     * become visible */
    window.clearTimeout(this._closeTimeout);
    this._closeTimeout = null;

    navigator.mozApps.getSelf().onsuccess = (function wpm_gotApp(event) {
      var params = Utils.deserializeParameters(message.imageURL);
      var app = event.target.result;

      app.launch();
      this.displayWapPushMessage(params.timestamp);
    }).bind(this);
  },

  /**
   * Retrieves a WAP Push message from the database and displays it
   *
   * @param {String} timestamp The message timestamp as a string.
   */
  displayWapPushMessage: function wpm_displayWapPushMessage(timestamp) {
    ParsedMessage.load(timestamp,
      function wpm_loadSuccess(message) {
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
          // Notify the user that the message has expired
          SiSlScreenHelper.populateScreen();
        }
      },
      function wpm_loadError(error) {
        console.log('Could not retrieve the message:' + error + '\n');
      });
  },

  /**
   * Marks a message as processed and close the application if no more messages
   * are present and the application is not visible.
   */
  finish: function wpm_finish() {
    this._pendingMessages--;

    if (document.hidden) {
      this.close();
    }
  },

  /**
   * Closes the application. Whenever this function is called it
   * starts a timer that will eventually close the application when no more
   * messages are being processed. Calling close multiple times is safe as only
   * one timer can be active at a time so subsequent calls will effectively be
   * no-ops.
   */
  close: function wpm_close() {
    if (this._closeTimeout !== null) {
      // We're already trying to close the app
      return;
    }

    /* We do not close the app immediately, instead we spin the event loop once
     * in the hope of catching pending messages that have been sent to the app
     * and have not yet been processed. If some messages are pending we'll
     * reschedule the close until they've all been processed. */
    this._closeTimeout = window.setTimeout(function delayedClose() {
      if (this._pendingMessages > 0) {
        // Pending messages were received since we set this timer
        this._closeTimeout = window.setTimeout(delayedClose.bind(this), 100);
        return;
      }

      /* There's no more pending messages and the application is in the
       * background, close for real */
      this._closeTimeout = null;
      window.close();
    }.bind(this), 100);
  },

  /**
   * Invoque the callback function that handles the applicaton flow in the
   * different mode (SI/SL or CP) and close the app.
   */
  onClose: function wpm_onClose() {
    if (this._onCloseCallback &&
        (typeof this._onCloseCallback === 'function')) {
      this._onCloseCallback();
    }
  },

  /**
   * Set the callback function that handles the applicaton flow in the different
   * mode (SI/SL or CP) when the user tries to close the application with the
   * close button.
   *
   * @param {function} callback The callback function.
   */
  setOnCloseCallback: function wpm_setOnCloseCallback(callback) {
    this._onCloseCallback = callback;
  },

  /**
   * Set the callback function that handles the applicaton flow in the different
   * mode (SI/SL or CP) when the app receives 'visibilitychange' events.
   *
   * @param {function} callback The callback function.
   */
  setOnVisibilityChangeCallback:
    function wpm_setOnVisibilityChangeCallback(callback) {
    this._onVisibilityChangeCallback = callback;
  }
};
