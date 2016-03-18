/* global module */
(function(module) {
  'use strict';

  var SELECTORS = Object.freeze({
    shareMenu: 'form[data-z-index-level="action-menu"]',
    shareImageButton: '#share-image',
    status: '.status'
  });

  var ORIGIN_ONE = 'one.gaiamobile.org';
  var ORIGIN_TWO = 'two.gaiamobile.org';

  function launch(client, origin) {
    client.switchToFrame();
    client.apps.launch('app://' + origin);
    client.apps.switchToApp('app://' + origin);
  }

  function switchTo(client, origin) {
    client.switchToFrame();
    client.apps.switchToApp('app://' + origin);
  }

  module.exports = {
    ONE: {
      ORIGIN: ORIGIN_ONE,

      create: function(client) {
        return {
          get status() {
            return client.helper.waitForElement(SELECTORS.status);
          },

          launch: function() {
            launch(client, ORIGIN_ONE);
          },

          switchTo: function() {
            switchTo(client, ORIGIN_ONE);
          },

          waitForAppToDisappear: function() {
            client.switchToFrame();
            client.helper.waitForElementToDisappear(
              'iframe[src*="app://' + ORIGIN_ONE + '"]'
            );
          }
        };
      }
    },

    TWO: {
      ORIGIN: ORIGIN_TWO,
      create: function(client) {
        return {
          get shareMenu() {
            // Switch to the system app first.
            client.switchToFrame();
            return client.helper.waitForElement(SELECTORS.shareMenu);
          },

          get shareWithOneButton() {
            var shareWithOptions = this.shareMenu.findElements('button');
            for (var i = 0; i < shareWithOptions.length; i++) {
              var shareWithOption = shareWithOptions[i];
              if (shareWithOption.text() === 'One App') {
                return shareWithOption;
              }
            }
          },

          launch: function() {
            launch(client, ORIGIN_TWO);
          },

          switchTo: function() {
            switchTo(client, ORIGIN_TWO);
          },

          shareImage: function() {
            client.helper.waitForElement(SELECTORS.shareImageButton).tap();
            this.shareWithOneButton.tap();
          }
        };
      }
    }
  };
})(module);
