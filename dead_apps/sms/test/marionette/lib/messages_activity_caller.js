/* global module */
(function(module) {
  'use strict';

  var SELECTORS = Object.freeze({
    shareMenu: 'form[data-z-index-level="action-menu"]',
    shareImageButton: '#share-image',
    pickImageButton: '#pick-image',
    pickContactButton: '#pick-contact',
    sendMessageButton: '#send-message'
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
        },

        pickContact: function() {
          client.helper.waitForElement(SELECTORS.pickContactButton).tap();
        },

        /**
         * Forces app to issue "websms/sms" new activity request with phone
         * number and body.
         * @param {{number: Number, body: string }} parameters Object that
         * contains parameters to pass to "websms/sms" new activity.
         */
        sendMessage: function(parameters) {
          var button = client.helper.waitForElement(
            SELECTORS.sendMessageButton
          );

          // We set button dataset attributes, that will be used by test
          // activity app as "websms/sms" activity parameters.
          button.scriptWith(function(element, parameters) {
            Object.keys(parameters).forEach(function(parameterKey) {
              element.dataset[parameterKey] = parameters[parameterKey];
            });
          }, [parameters]);

          button.tap();
        }
      };
    }
  };
})(module);
