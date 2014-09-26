/* global module */
(function(module) {
  'use strict';

  var SELECTORS = Object.freeze({
    shareMenu: 'form[data-z-index-level="action-menu"]',
    shareImageButton: '#share-image',
    pickImageButton: '#pick-image'
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

        launch: function() {
          client.switchToFrame();
          client.apps.launch(originURL);
          client.apps.switchToApp(originURL);
        },

        switchTo: function() {
          client.switchToFrame();

          client.apps.switchToApp(originURL);
        },

        shareImage: function() {
          client.helper.waitForElement(SELECTORS.shareImageButton).tap();
          this.shareWithMessagesButton.tap();
        },

        pickImage: function() {
          client.helper.waitForElement(SELECTORS.pickImageButton).tap();
        }
      };
    }
  };
})(module);
