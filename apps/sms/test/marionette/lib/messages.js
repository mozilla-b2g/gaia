'use strict';

/* global module */
var InboxAccessor = require('./views/inbox/accessors');
var ComposerAccessor = require('./views/new-message/accessors');
var NewMessageView = require('./views/new-message/view');
var ConversationAccessor = require('./views/conversation/accessors');

(function(module) {

  var ORIGIN_URL = 'app://sms.gaiamobile.org';
  var MANIFEST_URL= ORIGIN_URL + '/manifest.webapp';

  var Chars = {
    ENTER: '\ue007',
    BACKSPACE: '\ue003'
  };

  var SELECTORS = Object.freeze({
    main: '#main-wrapper',

    optionMenu: 'body > form[data-type=action] menu',
    systemMenu: 'form[data-z-index-level="action-menu"]',
    contactPromptMenu: '.contact-prompt menu',

    Message: {
      content: '.message-content > p:first-child',
      vcardAttachment: '[data-attachment-type="vcard"]',
      fileName: '.file-name'
    },

    Report: {
      main: '#information-report',
      header: '#information-report-header'
    },

    Participants: {
      main: '#information-participants',
      header: '#information-group-header'
    }
  });

  module.exports = {
    create: function(client) {
      var actions = client.loader.getActions();

      return {
        Selectors: SELECTORS,

        manifestURL: MANIFEST_URL,

        Composer: new ComposerAccessor(client),

        Conversation: new ConversationAccessor(client),

        Inbox: new InboxAccessor(client),

        Report: {
          get main() {
            return client.findElement(SELECTORS.Report.main);
          },

          get header() {
            return client.findElement(SELECTORS.Report.header);
          }
        },

        Participants: {
          get main() {
            return client.findElement(SELECTORS.Participants.main);
          },

          get header() {
            return client.findElement(SELECTORS.Participants.header);
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

        get contactPromptMenu() {
          return client.helper.waitForElement(SELECTORS.contactPromptMenu);
        },

        launch: function() {
          client.switchToFrame();
          client.apps.launch(ORIGIN_URL);
          client.apps.switchToApp(ORIGIN_URL);
          client.helper.waitForElement(SELECTORS.main);
        },

        close: function() {
          client.apps.close(ORIGIN_URL);
        },

        /**
         * Sends system message to the Messages app using SystemMessageInternal
         * class available in chrome context. Should be replaced by marionette
         * apps built-in method or shared lib (see bug 1162165).
         * @param {string} name Name of the system message to send.
         * @param {Object} parameters Parameters object to pass with system
         * message.
         */
        sendSystemMessage: function(name, parameters) {
          var chromeClient = client.scope({ context: 'chrome' });
          chromeClient.executeScript(function(manifestURL, name, parameters) {
            /* global Components, Services */
            var managerClass = Components.classes[
              '@mozilla.org/system-message-internal;1'
            ];

            var systemMessageManager = managerClass.getService(
              Components.interfaces.nsISystemMessagesInternal
            );

            systemMessageManager.sendMessage(
              name,
              parameters,
              null, /* pageURI */
              Services.io.newURI(manifestURL, null, null)
            );
          }, [MANIFEST_URL, name, parameters]);
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

        selectSystemMenuOption: function(text) {
          this.selectMenuOption(this.systemMenu, text);
        },

        selectContactPromptMenuOption: function(text) {
          this.selectMenuOption(this.contactPromptMenu, text);
        },

        selectMenuOption: function(menuElement, text) {
          var menuOptions = menuElement.findElements('button');
          for (var i = 0; i < menuOptions.length; i++) {
            var menuOption = menuOptions[i];
            if (menuOption.text().toLowerCase() === text.toLowerCase()) {
              // XXX: Workaround util http://bugzil.la/912873 is fixed.
              // Wait for 750ms to let the element be clickable
              client.helper.wait(750);
              menuOption.tap();
              break;
            }
          }
        },

        addRecipient: function(recipient) {
          new NewMessageView(client).addNewRecipient(recipient);
        },

        getRecipient: function(number) {
          return client.helper.waitForElement(
            '#messages-recipients-list .recipient[data-number="' + number + '"]'
          );
        },

        clearRecipient: function() {
          this.Composer.recipientsInput.clear();
        },

        addAttachment: function() {
          client.waitFor(function() {
            return this.Composer.attachButton.enabled();
          }.bind(this));

          // XXX: See bug 1171950. Use click() instead of tap() to attach button
          // action always triggers in tests.
          this.Composer.attachButton.click();

          // This line we can either leave in tests or move here, up to you
          this.selectSystemMenuOption('Messages Activity Caller');
        },

        send: function() {
          // Once send button is enabled, tap on it
          client.waitFor(function() {
            return this.Composer.sendButton.enabled();
          }.bind(this));
          // XXX: See bug 1171950. Use click() instead of tap() to ensure the
          // send action always triggers in tests.
          this.Composer.sendButton.click();

          // Wait when after send we're redirected to Conversation panel
          client.helper.waitForElement(this.Conversation.message);
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
        },

        performReportHeaderAction: function() {
          this.Report.header.scriptWith(function(header) {
            var event = document.createEvent('HTMLEvents');
            event.initEvent('action', true, true);
            header.dispatchEvent(event);
          });
        },

        performGroupHeaderAction: function() {
          this.Participants.header.scriptWith(function(header) {
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
