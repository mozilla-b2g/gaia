'use strict';

/* global module */
var InboxAccessor = require('./views/inbox/accessors');
var NewMessageAccessor = require('./views/new-message/accessors');
var NewMessageView = require('./views/new-message/view');
var ConversationAccessor = require('./views/conversation/accessors');
var MenuAccessor = require('./views/shared/menu_accessors');
var ComposerAccessor = require('./views/shared/composer_accessors');
var ReportAccessor = require('./views/report/accessors');
var ParticipantsAccessor = require('./views/participants/accessors');

(function(module) {

  var ORIGIN_URL = 'app://sms.gaiamobile.org';
  var MANIFEST_URL = ORIGIN_URL + '/manifest.webapp';

  // TODO Move these constants to marionette, see bug 1207516
  var Chars = {
    ENTER: '\ue007',
    BACKSPACE: '\ue003'
  };

  var SELECTORS = Object.freeze({
    main: '#main-wrapper',
    appReady: 'body.js-app-ready',

    Message: {
      content: '.message-content > p:first-child',
      vcardAttachment: '[data-attachment-type="vcard"]',
      fileName: '.file-name'
    }
  });

  module.exports = {
    create: function(client) {
      var actions = client.loader.getActions();
      var newMessageView = new NewMessageView(client);

      return {
        Selectors: SELECTORS,

        manifestURL: MANIFEST_URL,

        Composer: new ComposerAccessor(client),

        NewMessage: new NewMessageAccessor(client),

        Conversation: new ConversationAccessor(client),

        Inbox: new InboxAccessor(client),

        Menu: new MenuAccessor(client),

        Report: new ReportAccessor(client),

        Participants: new ParticipantsAccessor(client),

        launch(doNotWaitForAppToBecomeReady) {
          client.switchToFrame();
          client.apps.launch(ORIGIN_URL);
          client.apps.switchToApp(ORIGIN_URL);

          // In 99.99% cases we'd like to wait for the app to become fully ready
          // before we do anything in the tests, but sometimes we'd like to
          // verify that app is actionable before it's marked as ready, in this
          // case we just wait for the main app container to appear.
          if (!doNotWaitForAppToBecomeReady) {
            client.helper.waitForElement(SELECTORS.appReady);
          } else {
            client.helper.waitForElement(SELECTORS.main);
          }
        },

        close: function() {
          client.apps.close(ORIGIN_URL);
        },

        loadMocks: function() {
          client.loader.getMockManager('sms').inject([
            'test_storages',
            'test_blobs',
            'navigator_moz_icc_manager',
            'navigator_moz_mobile_message',
            'navigator_moz_contacts'
          ]);
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
          client.helper.waitForElement(SELECTORS.appReady);
        },

        waitForAppToAppear: function() {
          client.switchToFrame();
          var frame = client.scope({ searchTimeout: 50 }).helper.waitForElement(
            'iframe[src*="' + ORIGIN_URL + '"]'
          );
          return frame;
        },

        waitForAppToDisappear: function() {
          client.switchToFrame();
          client.scope({ searchTimeout: 50 }).helper.waitForElementToDisappear(
            'iframe[src*="' + ORIGIN_URL + '"]'
          );
        },

        addRecipient: function(recipient) {
          newMessageView.addNewRecipient(recipient);
        },

        getActivePanelName: function() {
          var cls = client.findElement('.panel-active').getAttribute('class');
          var matchResult = /\bpanel-([A-Z]\w+)\b/g.exec(cls);
          return matchResult && matchResult[1];
        },

        clearRecipient: function() {
          newMessageView.clearRecipients();
        },

        send: function() {
          newMessageView.send();
        },

        showSubject: function() {
          newMessageView.showSubject();
        },

        hideSubject: function() {
          newMessageView.hideSubject();
        },

        contextMenu: function(element) {
          actions.longPress(element, 1).perform();
        },

        performHeaderAction: function() {
          client.switchToShadowRoot(this.NewMessage.header);
          this.NewMessage.headerActionButton.tap();
          client.switchToShadowRoot();
        }
      };
    },

    Chars: Chars
  };
})(module);
