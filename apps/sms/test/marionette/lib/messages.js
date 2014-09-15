/* global module */
(function(module) {
  'use strict';

  var Actions = require('marionette-client').Actions;

  var ORIGIN_URL = 'app://sms.gaiamobile.org';

  var SELECTORS = Object.freeze({
    main: '#main-wrapper',

    optionMenu: 'body > form[data-type=action] menu',

    Composer: {
      recipientsInput: '#messages-to-field [contenteditable=true]',
      messageInput: '#messages-input',
      sendButton: '#messages-send-button',
      header: '#messages-header'
    },

    Thread: {
      message: '.message .bubble',
      headerTitle: '#messages-header-text'
    },

    Report: {
      main: '.report-information'
    },

    Participants: {
      main: '.participants-information'
    }
  });

  module.exports = {
    create: function(client) {
      var actions = new Actions(client);

      return {
        Composer: {
          get recipientsInput() {
            return client.helper.waitForElement(
              SELECTORS.Composer.recipientsInput
            );
          },

          get messageInput() {
            return client.helper.waitForElement(
              SELECTORS.Composer.messageInput
            );
          },

          get sendButton() {
            return client.helper.waitForElement(SELECTORS.Composer.sendButton);
          },

          get header() {
            return client.helper.waitForElement(SELECTORS.Composer.header);
          }
        },

        Thread: {
          get message() {
            return client.helper.waitForElement(SELECTORS.Thread.message);
          },

          get headerTitle() {
            return client.helper.waitForElement(SELECTORS.Thread.headerTitle);
          }
        },

        Report: {
          get main() {
            return client.findElement(SELECTORS.Report.main);
          }
        },

        Participants: {
          get main() {
            return client.findElement(SELECTORS.Participants.main);
          }
        },

        get optionMenu() {
          return client.helper.waitForElement(SELECTORS.optionMenu);
        },

        launch: function() {
          client.switchToFrame();
          client.apps.launch(ORIGIN_URL);
          client.apps.switchToApp(ORIGIN_URL);
          client.helper.waitForElement(SELECTORS.main);
        },

        switchTo: function() {
          client.switchToFrame();

          client.apps.switchToApp(ORIGIN_URL);
        },

        waitForAppToDisappear: function() {
          client.switchToFrame();
          client.scope({ searchTimeout: 50 }).helper.waitForElementToDisappear(
            'iframe[src*="' + ORIGIN_URL + '"]'
          );
        },

        selectMenuOption: function(text) {
          var menuOptions = this.optionMenu.findElements('button');
          for (var i = 0; i < menuOptions.length; i++) {
            var menuOption = menuOptions[i];
            if (menuOption.text().toLowerCase() === text.toLowerCase()) {
              // XXX: Workaround util http://bugzil.la/912873 is fixed.
              // Wait for 500ms to let the element be clickable
              client.helper.wait(500);
              menuOption.tap();
              break;
            }
          }
        },

        addRecipient: function(number) {
          // Enter number and press Enter ('\ue007')
          this.Composer.recipientsInput.sendKeys(number + '\ue007');

          client.helper.waitForElement(
            '#messages-recipients-list .recipient[data-number="' + number + '"]'
          );
        },

        send: function() {
          // Once send button is enabled, tap on it
          client.waitFor(function() {
            return this.Composer.sendButton.enabled();
          }.bind(this));
          this.Composer.sendButton.tap();

          // Wait when after send we're redirected to Thread panel
          client.helper.waitForElement(this.Thread.message);
        },

        contextMenu: function(element) {
          actions.longPress(element, 1).perform();
        },

        performHeaderAction: function() {
          this.Composer.header.scriptWith(function(header) {
            var event = document.createEvent('HTMLEvents');
            event.initEvent('action', true, true);
            header.dispatchEvent(event);
          });
        }
      };
    }
  };
})(module);
