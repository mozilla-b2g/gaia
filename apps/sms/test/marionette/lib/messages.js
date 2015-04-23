/* global module */
(function(module) {
  'use strict';

  var ORIGIN_URL = 'app://sms.gaiamobile.org';

  var Chars = {
    ENTER: '\ue007',
    BACKSPACE: '\ue003'
  };

  function observeElementStability(el) {
    delete el.dataset.__stable;

    function markElementAsStable() {
      return setTimeout(function() {
        el.dataset.__stable = 'true';
        observer.disconnect();
      }, 1000);
    }

    var timeout = markElementAsStable();
    var observer = new MutationObserver(function() {
      if (timeout) {
        clearTimeout(timeout);
        timeout = markElementAsStable();
      }
    });
    observer.observe(el, { childList: true, subtree: true });
  }

  var SELECTORS = Object.freeze({
    main: '#main-wrapper',

    optionMenu: 'body > form[data-type=action] menu',
    systemMenu: 'form[data-z-index-level="action-menu"]',
    attachmentMenu: '#attachment-options',

    Composer: {
      toField: '#messages-to-field',
      recipientsInput: '#messages-to-field [contenteditable=true]',
      recipient: '#messages-recipients-list .recipient[contenteditable=false]',
      messageInput: '#messages-input',
      subjectInput: '.subject-composer-input',
      sendButton: '#messages-send-button',
      attachButton: '#messages-attach-button',
      header: '#messages-header',
      charCounter: '.message-counter',
      moreHeaderButton: '#messages-options-button',
      mmsLabel: '.mms-label',
      attachment: '#messages-input .attachment-container',
      messageConvertNotice: '#messages-convert-notice'
    },

    Thread: {
      main: '#thread-messages',
      message: '.message .bubble',
      headerTitle: '#messages-header-text'
    },

    Message: {
      content: '.message-content > p:first-child',
      vcardAttachment: '[data-attachment-type="vcard"]',
      fileName: '.file-name'
    },

    ThreadList: {
      main: '#thread-list',
      firstThread: '.threadlist-item',
      smsThread: '.threadlist-item[data-last-message-type="sms"]',
      mmsThread: '.threadlist-item[data-last-message-type="mms"]',
      navigateToComposerHeaderButton: '#threads-composer-link'
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
      var actions = client.loader.getActions();

      return {
        Selectors: SELECTORS,

        Composer: {
          get toField() {
            return client.helper.waitForElement(SELECTORS.Composer.toField);
          },

          get recipientsInput() {
            return client.helper.waitForElement(
              SELECTORS.Composer.recipientsInput
            );
          },

          get recipients() {
            return client.findElements(SELECTORS.Composer.recipient);
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

          get attachment() {
            return client.findElement(SELECTORS.Composer.attachment);
          },

          get conversionBanner() {
            return client.findElement(SELECTORS.Composer.messageConvertNotice);
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
          },

          getMessageContent: function(message) {
            return client.helper.waitForElement(
              message.findElement(SELECTORS.Message.content)
            );
          },

          waitToAppear: function() {
            return client.helper.waitForElement(SELECTORS.Thread.main);
          }
        },

        ThreadList: {
          get firstThread() {
            return client.helper.waitForElement(
              SELECTORS.ThreadList.firstThread
            );
          },

          get smsThread() {
            return client.helper.waitForElement(
              SELECTORS.ThreadList.smsThread
            );
          },

          get mmsThread() {
            return client.helper.waitForElement(
              SELECTORS.ThreadList.mmsThread
            );
          },

          waitToAppear: function() {
            return client.helper.waitForElement(SELECTORS.ThreadList.main);
          },

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
              // Wait for 750ms to let the element be clickable
              client.helper.wait(750);
              menuOption.tap();
              break;
            }
          }
        },

        addRecipient: function(number) {
          this.Composer.recipientsInput.sendKeys(number + Chars.ENTER);

          // Since recipient.js re-renders recipients all the time (when new
          // recipient is added or old is removed) and it can happen several
          // times during single "add" or "remove" operation we should
          // wait until Recipients View is in a final state. The problem here is
          // that between "findElement" and "displayed" calls element can
          // actually be removed from DOM and re-created again that will lead to
          // "stale element" exception.
          var toField = this.Composer.toField;
          toField.scriptWith(observeElementStability);
          client.helper.waitFor(function() {
            return toField.scriptWith(function(el) {
              return !!el.dataset.__stable;
            });
          });
        },

        getRecipient: function(number) {
          return client.helper.waitForElement(
            '#messages-recipients-list .recipient[data-number="' + number + '"]'
          );
        },

        clearRecipient: function() {
          this.Composer.recipientsInput.clear();
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
