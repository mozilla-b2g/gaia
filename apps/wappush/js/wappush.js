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

  /**
   * Initialize the WAP Push manager, this only subscribes to the
   * wappush-received message handler at the moment
   */
  init: function wpm_init() {
    if ('mozSettings' in navigator) {
      // Read the global setting
      var req = navigator.mozSettings.createLock().get(this._wapPushEnableKey);

      req.onsuccess = (function() {
        this._wapPushEnabled = req.result[this._wapPushEnableKey];

        // Start listening to WAP Push messages only after we read the pref
        window.navigator.mozSetMessageHandler('wappush-received',
          this.onWapPushReceived.bind(this));
      }).bind(this);

      navigator.mozSettings.addObserver(this._wapPushEnableKey, (function(v) {
        this._wapPushEnabled = v.settingValue;
      }).bind(this));
    }

    window.navigator.mozSetMessageHandler('notification',
      this.onNotification.bind(this));
  },

  /**
   * Retrieves the parameters from an URL and forms an object with them
   *
   * @param {String} input A string holding the parameters attached to an URL
   *
   * @return {Object} An object built using the parameters
   */
  deserializeParameters: function wpm_deserializeParameters(input) {
    var rparams = /([^?=&]+)(?:=([^&]*))?/g;
    var parsed = {};

    input.replace(rparams, function($0, $1, $2) {
      parsed[$1] = decodeURIComponent($2);
    });

    return parsed;
  },

  /**
   * Establish if we must show this message or not; the message is shown only
   * if the following conditions are met:
   * - WAP Push functionality is enabled
   * - The message is either a SI or SL message
   * - The sender's MSISDN is whitelisted or whitelisting is disabled
   *
   * @param {Object} message The message to be checked
   *
   * @return {Boolean} true if the message should be displayed, false otherwise
   */
  shouldDisplayMessage: function wpm_shouldDisplayMessage(message) {
    if (!this._wapPushEnabled || !WhiteList.has(message.sender)) {
       /* WAP push functionality is either completely disabled or the message
        * comes from a non white-listed MSISDN, ignore it. */
       return false;
    }

    if ((message.contentType != 'text/vnd.wap.si') &&
        (message.contentType != 'text/vnd.wap.sl')) {
      // Only accept SI and SL messages
      console.log('Unsupported or invalid content type "' +
                  message.contentType + '" for WAP Push message\n');
      return false;
    }

    return true;
  },

  /**
   * Handler for the wappush-received system messages, stores the message into
   * the internal database and posts a notification which can be used to
   * display the message.
   *
   * @param {Object} message The WAP Push message as provided by the system
   */
  onWapPushReceived: function wpm_onWapPushReceived(message) {
    var self = this;
    var timestamp = Date.now();

    if (!this.shouldDisplayMessage(message)) {
      this.close();
      return;
    }

    asyncStorage.setItem(timestamp.toString(), message, function() {
      navigator.mozApps.getSelf().onsuccess = function(event) {
        var _ = navigator.mozL10n.get;
        var app = event.target.result;
        /* We store the message timestamp as a parameter to be able to
         * retrieve the message from the notification code */
        var iconURL = NotificationHelper.getIconURI(app) +
                      '?timestamp=' + encodeURIComponent(timestamp);

        NotificationHelper.send(message.sender, message.content, iconURL,
          function() {
            app.launch();
            self.displayWapPushMessage(timestamp);
          });

        self.close();
      };
    });
  },

  /**
   * Displays an attention screen containing a WAP Push message
   *
   * @param {String} sender The message sender
   * @param {String} content
   *        The contents of the message with HTML tags already escaped
   */
  onNotification: function wpm_onNotification(event) {
    var params = this.deserializeParameters(event.imageURL);

    this.displayWapPushMessage(params.timestamp);
  },

  /**
   * Retrieves a WAP Push message from the database and displays it
   *
   * @param {Number} timestamp The message timestamp
   */
  displayWapPushMessage: function wpm_displayWapPushMessage(timestamp) {
    var self = this;

    asyncStorage.getItem(timestamp, function(message) {
      var protocol = window.location.protocol;
      var host = window.location.host;
      var uri = protocol + '//' + host + '/message.html';

      uri += '?';
      uri += [
               'sender=' + encodeURIComponent(message.sender),
               'content=' + encodeURIComponent(message.content)
             ].join('&');

      var messageScreen = window.open(uri, 'wappush_attention', 'attention');

      messageScreen.onload = function(evt) {
        messageScreen.WapMessageScreen.init();
        asyncStorage.removeItem(timestamp);
      };

      messageScreen.onunload = function(evt) {
        // Close the parent window to hide the application from the cards view
        if (evt.target.location != 'about:blank') {
          self.close();
          return;
        }
      };
    },
    function(error) {
      console.log('Could not retrieve the message:' + error + '\n');
    });
  },

  /**
   * Closes the application, lets the event loop run once to ensure clean
   * termination of pending events.
   */
  close: function wpm_close() {
    window.setTimeout(window.close);
  }
};

WapPushManager.init();
