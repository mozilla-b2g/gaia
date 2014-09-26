/* global module */
(function(module) {
  'use strict';

  var Actions = require('marionette-client').Actions;

  var ORIGIN_URL = 'app://sms.gaiamobile.org';

  var Chars = {
    ENTER: '\ue007',
    BACKSPACE: '\ue003'
  };

  var SELECTORS = Object.freeze({
    main: '#main-wrapper',

    optionMenu: 'body > form[data-type=action] menu',
    systemMenu: 'form[data-z-index-level="action-menu"]',
    attachmentMenu: '#attachment-options-menu',

    Composer: {
      recipientsInput: '#messages-to-field [contenteditable=true]',
      messageInput: '#messages-input',
      subjectInput: '#messages-subject-input',
      sendButton: '#messages-send-button',
      attachButton: '#messages-attach-button',
      header: '#messages-header',
      charCounter: '.message-counter',
      moreHeaderButton: '#messages-options-button',
      mmsLabel: '.bottom-composer-section .mms-label',
      subjectMmsLabel: '.top-composer-section > .mms-label',
      attachment: '#messages-input .attachment-container'
    },

    Thread: {
      message: '.message .bubble',
      headerTitle: '#messages-header-text'
    },

    ThreadList: {
      navigateToComposerHeaderButton: '#icon-add'
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

          get subjectInput() {
            return client.helper.waitForElement(
              SELECTORS.Composer.subjectInput
            );
          },

          get sendButton() {
            return client.helper.waitForElement(SELECTORS.Composer.sendButton);
          },

          get attachButton() {
            return client.helper.waitForElement(
              SELECTORS.Composer.attachButton
            );
          },

          get header() {
            return client.helper.waitForElement(SELECTORS.Composer.header);
          },

          get charCounter() {
            return client.findElement(SELECTORS.Composer.charCounter);
          },

          get mmsLabel() {
            return client.findElement(SELECTORS.Composer.mmsLabel);
          },

          get subjectMmsLabel() {
            return client.findElement(SELECTORS.Composer.subjectMmsLabel);
          },

          get attachment() {
            return client.findElement(SELECTORS.Composer.attachment);
          },

          showOptions: function() {
            client.helper.waitForElement(
              SELECTORS.Composer.moreHeaderButton
            ).tap();
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

        ThreadList: {
          navigateToComposer: function() {
            client.helper.waitForElement(
              SELECTORS.ThreadList.navigateToComposerHeaderButton
            ).tap();
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

        get systemMenu() {
          // Switch to the system app first.
          client.switchToFrame();
          return client.helper.waitForElement(SELECTORS.systemMenu);
        },

        get optionMenu() {
          return client.helper.waitForElement(SELECTORS.optionMenu);
        },

        get attachmentMenu() {
          return client.helper.waitForElement(SELECTORS.attachmentMenu);
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

        selectAppMenuOption: function(text) {
          this.selectMenuOption(this.optionMenu, text);
        },

        selectAttachmentMenuOption: function(text) {
          this.selectMenuOption(this.attachmentMenu, text);
        },

        selectSystemMenuOption: function(text) {
          this.selectMenuOption(this.systemMenu, text);
        },

        selectMenuOption: function(menuElement, text) {
          var menuOptions = menuElement.findElements('button');
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
          this.Composer.recipientsInput.sendKeys(number + Chars.ENTER);

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

        showSubject: function() {
          this.Composer.showOptions();
          this.selectAppMenuOption('Add subject');
        },

        hideSubject: function() {
          this.Composer.showOptions();
          this.selectAppMenuOption('Remove subject');
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
    },

    Chars: Chars
  };
})(module);
