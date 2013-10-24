/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

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

  /** Title of the message, usually holds the sender's number */
  _title: null,

  /** Message container */
  _container: null,

  /** Message text */
  _text: null,

  /** Message link */
  _link: null,

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
    this._title = document.getElementById('title');
    this._container = document.getElementById('wappush-container');
    this._text = this._container.querySelector('p');
    this._link = this._container.querySelector('a');

    // Event handlers
    document.addEventListener(
      'visibilitychange',
      this.onVisibilityChange.bind(this)
    );

    this._closeButton.addEventListener('click', this.onClose.bind(this));
    this._link.addEventListener(
      'click',
      LinkActionHandler.onClick.bind(LinkActionHandler)
    );

    window.navigator.mozSetMessageHandler('notification',
      this.onNotification.bind(this));
  },

  /**
   * Closes the application whenever it is hidden
   */
  onVisibilityChange: function wpm_onVisibilityChange() {
    this.close(/* background */ true);
  },

  /**
   * Closes the application
   */
  onClose: function wpm_onClose() {
    this.close();
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
    if (!this._wapPushEnabled || (message === null) ||
        !WhiteList.has(message.sender)) {
       /* WAP push functionality is either completely disabled or the message
        * comes from a non white-listed MSISDN, ignore it. */
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
    var self = this;
    var message = ParsedMessage.from(wapMessage, Date.now());

    if (!this.shouldDisplayMessage(message)) {
      this.close(/* background */ true);
      return;
    }

    message.save(
      function wpm_saveSuccess() {
        var req = navigator.mozApps.getSelf();

        req.onsuccess = function wpm_gotApp(event) {
          var _ = navigator.mozL10n.get;
          var app = event.target.result;
          /* We store the message timestamp as a parameter to be able to
           * retrieve the message from the notification code */
          var iconURL = NotificationHelper.getIconURI(app) +
                       '?timestamp=' + encodeURIComponent(message.timestamp);
          var text = message.text ? (message.text + ' ') : '';

          text += message.href ? message.href : '';

          NotificationHelper.send(message.sender, text, iconURL,
            function wpm_notificationOnClick() {
              app.launch();
              self.displayWapPushMessage(message.timestamp);
            });

          self.close(/* background */ true);
        };
        req.onerror = function wpm_getAppError() {
          self.close(/* background */ true);
        };
      },
      function wpm_saveError(error) {
        console.log('Could not add a message to the database: ' + error + '\n');
        self.close(/* background */ true);
      }
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
    var self = this;
    var message = ParsedMessage.load(timestamp,
      function wpm_loadSuccess(message) {
        // Populate the message
        self._title.textContent = message.sender;
        self._text.textContent = message.text;
        self._link.textContent = message.href;
        self._link.href = message.href;
        self._link.dataset.url = message.href;
      },
      function wpm_loadError(error) {
        console.log('Could not retrieve the message:' + error + '\n');
      });
  },

  /**
   * Closes the application, lets the event loop run once to ensure clean
   * termination of pending events. If the background parameter is specified
   * the the application will be closed only if it's running in the background.
   *
   * @param {Boolean} [background] When 'true' close the application only if
   *        if it's running in the background.
   */
  close: function wpm_close(background) {
    if (background) {
      if (document.hidden) {
        window.setTimeout(window.close);
      }
    } else {
      window.setTimeout(window.close);
    }
  }
};

window.addEventListener('load', function callSetup(evt) {
  window.removeEventListener('load', callSetup);

  WapPushManager.init();
});
