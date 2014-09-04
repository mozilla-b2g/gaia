/* global module */
(function(module) {
  'use strict';

  var SELECTORS = Object.freeze({
    shareMenu: 'form[data-z-index-level="action-menu"]',
    shareImageButton: '#share-image'
  });

  var ORIGIN = 'messages.activity.gaiamobile.org';

  module.exports = {
    ORIGIN: ORIGIN,

    create: function(client) {
      var originURL = 'app://' + ORIGIN;

      return {
        get shareMenu() {
          // Switch to the system app first.
          client.switchToFrame();
          return client.helper.waitForElement(SELECTORS.shareMenu);
        },

        get shareWithMessagesButton() {
          var shareWithOptions = this.shareMenu.findElements('button');
          for (var i = 0; i < shareWithOptions.length; i++) {
            var shareWithOption = shareWithOptions[i];
            if (shareWithOption.text() === 'Messages') {
              return shareWithOption;
            }
          }
        },

        get shareImageButton() {
          return  client.helper.waitForElement(SELECTORS.shareImageButton);
        },

        launch: function() {
          client.switchToFrame();
          client.apps.launch(originURL);
          client.apps.switchToApp(originURL);
        },

        shareImage: function() {
          this.shareImageButton.tap();
          this.shareWithMessagesButton.tap();
        }
      };
    }
  };
})(module);
