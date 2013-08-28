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
  /**
   * Initialize the WAP Push manager, this only subscribes to the
   * wappush-received message handler at the moment
   */
  init: function wpm_init() {
    window.navigator.mozSetMessageHandler('wappush-received',
      this.onWapPushReceived.bind(this));
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
   * Handler for the wappush-received system messages, stores the message into
   * the internal database and posts a notification which can be used to
   * display the message.
   *
   * @param {Object} message The WAP Push message as provided by the system
   */
  onWapPushReceived: function wpm_onWapPushReceived(message) {
    var self = this;
    var timestamp = Date.now();

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

        window.close();
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

      messageScreen.onload = function() {
        messageScreen.WapMessageScreen.init();
        asyncStorage.removeItem(timestamp);
      };
      messageScreen.onunload = function() {
        // Close the parent window to hide the application from the cards view
        window.close();
      };
    },
    function(error) {
      console.log('Could not retrieve the message:' + error + '\n');
    });
  }
};

WapPushManager.init();
