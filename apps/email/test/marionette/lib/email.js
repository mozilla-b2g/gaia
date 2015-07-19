/*jshint node: true, browser: true */
'use strict';
function Email(client) {
  this.client = client.scope({ searchTimeout: 20000 });
}
module.exports = Email;

Email.EMAIL_ORIGIN = 'app://email.gaiamobile.org';

var Selector = {
  setupNameInput: 'cards-setup-account-info .sup-info-name',
  setupEmailInput: 'cards-setup-account-info .sup-info-email',
  nextButton: 'cards-setup-account-info .sup-info-next-btn',
  prefsNextButton: 'cards-setup-account-prefs .sup-info-next-btn',
  manualSetupNameInput: '.sup-manual-form .sup-info-name',
  manualSetupEmailInput: '.sup-manual-form .sup-info-email',
  manualSetupImapPasswordInput:
    '.sup-manual-form .sup-manual-composite-password',
  manualSetupImapUsernameInput:
    '.sup-manual-form .sup-manual-composite-username',
  manualSetupImapHostnameInput:
    '.sup-manual-form .sup-manual-composite-hostname',
  manualSetupImapPortInput: '.sup-manual-form .sup-manual-composite-port',
  manualSetupImapSocket: '.sup-manual-form .sup-manual-composite-socket',
  manualSetupSmtpUsernameInput: '.sup-manual-form .sup-manual-smtp-username',
  manualSetupSmtpHostnameInput: '.sup-manual-form .sup-manual-smtp-hostname',
  manualSetupSmtpPasswordInput: '.sup-manual-form .sup-manual-smtp-password',
  manualSetupSmtpPortInput: '.sup-manual-form .sup-manual-smtp-port',
  manualSetupSmtpSocket: '.sup-manual-form .sup-manual-smtp-socket',
  manualNextButton: 'cards-setup-manual-config .sup-manual-next-btn',
  msgDownBtn: 'cards-message-reader .msg-down-btn',
  msgListScrollOuter: 'cards-message-list .msg-list-scrollouter',
  editMode: 'cards-message-list .msg-edit-btn',
  editModeCheckBoxes:
    'cards-message-list .msg-header-item[data-index="0"] gaia-checkbox',
  editModeTrash: 'cards-message-list button.msg-delete-btn',
  msgUpBtn: 'cards-message-reader .msg-up-btn',
  msgEnvelopeSubject: 'cards-message-reader .msg-envelope-subject',
  showMailButton: 'cards-setup-done .sup-show-mail-btn',
  confirmDialogOkButton: '.confirm-dialog-form .confirm-dialog-ok',
  manualConfigButton: '.scrollregion-below-header .sup-manual-config-btn',
  composeButton: '.msg-list-header .msg-compose-btn',
  composeEmailContainer: 'cards-compose .cmp-to-container',
  composeEmailInput: 'cards-compose .cmp-addr-text',
  composeSubjectInput: 'cards-compose .cmp-subject-text',
  composeBodyInput: 'cards-compose .cmp-body-text',
  composeSendButton: 'cards-compose .cmp-send-btn',
  composeBackButton: 'cards-compose .cmp-back-btn',
  composeDraftDiscard: '#cmp-draft-discard',
  composeDraftSave: '#cmp-draft-save',
  composeErrorMessage: 'cards-compose .cmp-error-message',
  refreshButton: '.card.center .msg-refresh-btn',
  messageHeaderItem:
  '.msg-messages-container .msg-header-item',
  cardMessageReader: 'cards-message-reader',
  currentCardInputs: '.card.center input[type="text"]',
  replyMenuButton: '.msg-reply-btn',
  replyMenu: '.msg-reply-menu',
  replyMenuReply: '.msg-reply-menu-reply',
  replyMenuForward: '.msg-reply-menu-forward',
  replyMenuAll: '.msg-reply-menu-reply-all',
  searchTextTease: '.msg-search-text-tease',
  searchCard: 'cards-message-list-search',
  folderListButton: '.msg-list-header .msg-folder-list-btn',
  folderListCloseButton: 'cards-folder-picker .fld-header-back',
  folderListContents: 'cards-folder-picker .fld-acct-scrollinner',
  settingsButton: '.fld-nav-toolbar',
  settingsDoneButton: 'cards-settings-main [data-l10n-id="settings-done"]',
  addAccountButton: 'cards-settings-main .tng-account-add',
  accountListButton: '.fld-acct-header',
  accountListContainer: '.fld-accountlist-container',
  settingsMainAccountItems: '.tng-accounts-container .tng-account-item',
  syncIntervalSelect: '.tng-account-check-interval ',
  // Checkboxes are weird: hidden to marionette, but the associated label
  // is clickable and does the job.
  notifyEmailCheckbox: '.tng-notify-mail-label',
  accountSettingsBackButton: 'cards-settings-account .tng-back-btn',
  localDraftsItem: '.fld-folders-container a[data-type=localdrafts]',
  outboxItem: '.fld-folders-container a[data-type=outbox]',
  outboxItemSyncIcon: '.msg-header-syncing-section',
  msgLastSync: '.msg-last-synced-value',
  toaster: 'section[role="status"]'
};

Email.prototype = {
  /**
   * Send some emails and then receive them.
   *
   * @param {Array} messages list of messages with to, subject, and body.
   * @param {Number} [messageSyncIndex] the index into the list of messages in
   * the message list that indicates synchronization is complete. Uses the last
   * index in messages by default.
   */
  sendAndReceiveMessages: function(messages, messageSyncIndex) {
    if (messageSyncIndex === undefined) {
      messageSyncIndex = messages.length - 1;
    }

    messages.forEach(function(message) {
      this.tapCompose();
      this.typeTo(message.to);
      this.typeSubject(message.subject);
      this.typeBody(message.body);
      this.tapSend();
    }.bind(this));

    this.tapRefreshButton();
    this.waitForSynchronized(messageSyncIndex);
  },

  waitForToaster: function() {
    var toaster = this.client.helper.waitForElement(Selector.toaster);
    this.client.helper.waitForElementToDisappear(toaster);
  },

  get msgDownBtn() {
    return this.client.helper.waitForElement(Selector.msgDownBtn);
  },

  get msgListScrollOuter() {
    return this.client.helper.waitForElement(Selector.msgListScrollOuter);
  },

  get msgUpBtn() {
    return this.client.helper.waitForElement(Selector.msgUpBtn);
  },

  /**
   * @param {boolean} up whether we're advancing up or down.
   */
  advanceMessageReader: function(up) {
    var el = up ? this.msgUpBtn : this.msgDownBtn;
    el.click();
    this.waitForMessageReader();
  },

  getMessageReaderSubject: function() {
    return this.client.helper
      .waitForElement(Selector.msgEnvelopeSubject)
      .text();
  },

  getComposeTo: function() {
    var container =
      this.client.helper.waitForElement(Selector.composeEmailContainer);
    var text = container.text();
    return text;
  },

  getComposeErrorMessage: function() {
    return this.client.helper
      .waitForElement(Selector.composeErrorMessage)
      .text();
  },

  getLastSyncText: function() {
    return this.client.helper
      .waitForElement(Selector.msgLastSync)
      .text();
  },

  manualSetupImapEmail: function(server, finalActionName) {
    // setup a IMAP email account
    var email = server.imap.username + '@' + server.imap.hostname;

    // wait for the setup page is loaded
    this._setupTypeName(server.imap.username);
    this._setupTypeEmail(email);

    this._waitForElementNoTransition(Selector.manualConfigButton).tap();
    this._waitForTransitionEnd('setup_manual_config');

    this._manualSetupTypeImapUsername(server.imap.username);
    this._manualSetupTypeImapHostname(server.imap.hostname);
    this._manualSetupTypeImapPassword(server.imap.password);
    this._manualSetupTypeImapPort(server.imap.port);
    this._manualSetupUpdateSocket('manualSetupImapSocket');

    this._manualSetupTypeSmtpUsername(server.smtp.username);
    this._manualSetupTypeSmtpHostname(server.smtp.hostname);
    this._manualSetupTypeSmtpPassword(server.smtp.password);
    this._manualSetupTypeSmtpPort(server.smtp.port);
    this._manualSetupUpdateSocket('manualSetupSmtpSocket');

    this._finishSetup(Selector.manualNextButton, finalActionName);
  },

  _finishSetup: function(nextSelector, finalActionName) {
    this._tapNext(nextSelector);
    this._waitForElementNoTransition(Selector.prefsNextButton);
    this._tapNext(Selector.prefsNextButton, 'setup_done');

    this._waitForElementNoTransition(Selector.showMailButton);
    this.client.helper
      .waitForElement(Selector.showMailButton)
      .tap();
    return this[finalActionName || 'waitForMessageList']();
  },

  // Waits for confirm dialog to show up, then clicks OK to confirm
  // going to setting up a new account after triggering email launch
  // from an activity.
  confirmWantAccount: function() {
    this.client.switchToFrame();
    this.client.apps.switchToApp(Email.EMAIL_ORIGIN);
    this.client.helper.waitForElement(Selector.confirmDialogOkButton).tap();
    this.client.helper.waitForElement(Selector.manualConfigButton);
    this.client.helper.waitForElement(Selector.manualConfigButton).tap();
  },

  tapFolderListButton: function() {
    this._tapSelector(Selector.folderListButton);
    this._waitForElementNoTransition(Selector.settingsButton);
    this._waitForTransitionEnd('folder_picker');
    this.client.helper.waitForElement(Selector.folderListContents);
  },

  tapFolderListCloseButton: function() {
    this._tapSelector(Selector.folderListCloseButton);
    this.waitForMessageList();
  },

  tapAccountListButton: function() {
    // XXX: Workaround util http://bugzil.la/912873 is fixed.
    // Wait for 500ms to let the element be clickable
    this.client.helper.wait(500);

    this.client.helper.waitForElement(Selector.accountListButton).tap();
    this.client.helper.waitForElement(Selector.accountListContainer);
  },

  tapLocalDraftsItem: function() {
    // we should already be looking at the folder list, no need to wait.
    this._waitForElementNoTransition(Selector.localDraftsItem).tap();
    // clicking that transitions us back to the message list; wait for us
    // to get there.
    this._waitForTransitionEnd('message_list');
  },

  tapOutboxItem: function() {
    this._waitForElementNoTransition(Selector.outboxItem).tap();
    this._waitForTransitionEnd('message_list');
  },

  getOutboxItemSyncIconForIndex: function(index) {
    var header = this.getHeaderAtIndex(index);
    var iconEl = header.findElement(Selector.outboxItemSyncIcon);
    var className = iconEl.getAttribute('className');
    if (/-syncing$/.test(className)) {
      return 'syncing';
    } else if (/-error$/.test(className)) {
      return 'error';
    } else {
      return '';
    }
  },

  switchAccount: function(number) {
    var accountSelector = '.fld-accountlist-container ' +
                          'a:nth-child(' + number + ')';
    this.client.helper
      .waitForElement(accountSelector)
      .tap();
    this._waitForTransitionEnd('folder_picker');
  },

  tapSettingsButton: function() {
    this.client.helper
      .waitForElement(Selector.settingsButton)
      .tap();
    this._waitForTransitionEnd('settings_main');
  },

  tapSettingsDoneButton: function() {
    this.client.helper
      .waitForElement(Selector.settingsDoneButton)
      .tap();
    this._waitForTransitionEnd('folder_picker');
  },

  tapSettingsAccountIndex: function(index) {
    var elements = this.client.findElements(Selector.settingsMainAccountItems);
    this.client.helper.waitForElement(elements[index]).tap();
    this._waitForTransitionEnd('settings_account');
  },

  tapAddAccountButton: function() {
    this.client.helper
      .waitForElement(Selector.addAccountButton)
      .tap();
    this._waitForTransitionEnd('setup_account_info');
  },

  tapNotifyEmailCheckbox: function() {
    this._tapSelector(Selector.notifyEmailCheckbox);
  },

  tapAccountSettingsBackButton: function() {
    this.client.helper
      .waitForElement(Selector.accountSettingsBackButton)
      .tap();
    this._waitForTransitionEnd('settings_main');
  },

  tapCompose: function() {
    this._tapSelector(Selector.composeButton);
    this.waitForCompose();
  },

  typeTo: function(email) {
    this.client.helper
      .waitForElement(Selector.composeEmailInput)
      .sendKeys(email);
  },

  typeSubject: function(subject) {
    this.client.helper
      .waitForElement(Selector.composeSubjectInput)
      .sendKeys(subject);
  },

  typeBody: function(string) {
    var bodyInput = this.client.
      findElement(Selector.composeBodyInput);
    bodyInput.click();
    bodyInput.sendKeys(string);
  },

  /**
   * Retrieve the textual representation of the contenteditable that is our
   * compose area using the app logic that does this for when we save and
   * send the draft.  Using innerHTML would not be realistic and textContent
   * over-simplifies our newline handling as well as risking oddities in the
   * future if we inline various affordances proposed by UX.
   */
  getComposeBody: function() {
    return this.client.executeScript(function() {
      var cards = window.wrappedJSObject.require('cards'),
          card = cards._cardStack[cards.activeCardIndex];
      if (card.nodeName.toLowerCase() !== 'cards-compose') {
        throw new Error('active card should be compose!');
      }

      return card.fromEditor();
    }, []);
  },

  /**
   * Enters edit mode.
   * Waits for an edit checkbox to appear.
   */
  editMode: function() {
    this.client.helper
      .waitForElement(Selector.editMode)
      .tap();

    this.client.helper
      .waitForElement(Selector.editModeCheckBoxes);
  },

  /**
   * Returns the edit mode checkboxes.
   */
  editModeCheckboxes: function() {
    var elements = this.client.findElements(Selector.editModeCheckBoxes);
    return elements;
  },

  isElementDisabled: function(selector) {
    var client = this.client;

    client.helper.waitForElement(selector);

    client.waitFor(function() {
      return client.executeScript(function(selector) {
        var doc = window.wrappedJSObject.document,
            selectNode = doc.querySelector(selector);

        return selectNode.disabled;
      }, [selector]);
    });
  },

  /**
   * Taps the trash button in edit mode.
   */
  isEditModeTrashDisabled: function() {
    this.isElementDisabled(Selector.editModeTrash);
  },

  abortCompose: function(cardId) {
    this._waitForElementNoTransition(Selector.composeBackButton).tap();
    this._waitForElementNoTransition(Selector.composeDraftDiscard).tap();
    this._waitForTransitionEnd(cardId);
  },

  /**
   * Returns the visible input elements for the current card.
   */
  getVisibleCardInputs: function() {
    var elements = this.client.findElements(Selector.currentCardInputs)
      .filter(function(element) {
        return element.displayed();
      });
    return elements;
  },

  saveLocalDrafts: function() {
    this._waitForElementNoTransition(Selector.composeBackButton).tap();
    this._waitForElementNoTransition(Selector.composeDraftSave).tap();
    this._waitForTransitionEnd('message_list');
  },

  tapSend: function() {
    var client = this.client;
    /*
     * We cannot tap the Selector.composeSendButton element with (0, 0) offset,
     * because the attachment button covers the left side of it a little bit.
     *
     * We could refer the css style in:
     * https://github.com/mozilla-b2g/gaia/blob/master/shared/style/headers.css#L117
     * And the patch in http://bugzil.la/907061 make us skip the issue luckily.
     *
     * We discuss and fix the issue in http://bugzil.la/907092
     */
    client.helper
      .waitForElement(Selector.composeSendButton)
      .tap();
    // wait for being in the email list page
    this._waitForElementNoTransition(Selector.refreshButton);
    this.waitForMessageList();
  },

  tapRefreshButton: function() {
    this.client.helper
      .waitForElement(Selector.refreshButton)
      .tap();
  },

  tapSearchArea: function() {
    this.client.helper
      .waitForElement(Selector.searchTextTease)
      .sendKeys('a');


    var client = this.client;
    client.waitFor(function() {
      return client.executeScript(function(selector) {
        var doc = window.wrappedJSObject.document,
            selectNode = doc.querySelector(selector);

        // Synthesize an event since focus does not work
        // through marionette API
        var event = document.createEvent('Event');
        event.initEvent('focus', true, true);
        selectNode.dispatchEvent(event);

        return true;
      }, [Selector.searchTextTease]);
    });

    this.client.helper
      .waitForElement(Selector.searchCard);
    this._waitForTransitionEnd('message_list_search');
  },

  waitForMessageList: function() {
    this._waitForTransitionEnd('message_list');
  },

  waitForMessageReader: function() {
    this._waitForTransitionEnd('message_reader');
  },

  waitForCompose: function() {
    this._waitForTransitionEnd('compose');
  },

  waitForSynchronized: function(index) {
    this.getHeaderAtIndex(index);
  },

  launch: function() {
    var client = this.client;
    client.apps.launch(Email.EMAIL_ORIGIN);
    client.apps.switchToApp(Email.EMAIL_ORIGIN);
    // wait for the document body to know we're really launched
    client.helper.waitForElement('body');
  },

  close: function() {
    var client = this.client;
    client.apps.close(Email.EMAIL_ORIGIN);
  },

  getHeaderAtIndex: function(index) {
    var element = this.client.findElement(Selector.messageHeaderItem +
                                             '[data-index="' + index + '"]');
    return this.client.helper.waitForElement(element);
  },

  tapEmailAtIndex: function(index) {
    var element = this.getHeaderAtIndex(index);
    element.tap();
    this.waitForMessageReader();
  },

  tapEmailBySubject: function(subject, cardId) {
    // The emails may not be present in the list yet.  So keep checking until
    // we see one.  Then tap on it.
    this.client.waitFor(function() {
      var element = this.getEmailBySubject(subject);
      if (!element) {
        return false;
      }

      element.tap();
      this._waitForTransitionEnd(cardId);
      return true;
    }.bind(this));
  },

  getMessageCount: function() {
    return this.client.findElements(Selector.messageHeaderItem).length;
  },

  getEmailBySubject: function(subject) {
    var messageHeaders = this.client.findElements(Selector.messageHeaderItem),
        messageHeadersLength = messageHeaders.length,
        element;

    for (var i = 0; i < messageHeadersLength; i++) {
      var header = this.client.helper
        .waitForChild(messageHeaders[i], '.msg-header-subject')
        .text();
      if (header === subject) {
        element = messageHeaders[i];
      }
    }

    return element;
  },

  /**
   * Opens the reply menu and selects 'reply', 'all', or 'forward'.
   */
  tapReply: function(mode) {
    var client = this.client;
    // open the reply menu
    client.helper.waitForElement(Selector.replyMenuButton).tap();
    client.helper.waitForElement(Selector.replyMenu);
    // select the appropriate option
    var whichButton;
    switch (mode) {
    case 'all':
      whichButton = Selector.replyMenuAll;
      break;
    case 'forward':
      whichButton = Selector.replyMenuForward;
      break;
    case 'reply':
      whichButton = Selector.replyMenuReply;
      break;
    default:
      whichButton = Selector.replyMenuReply;
      break;
    }
    client.helper.waitForElement(whichButton).tap();
    this._waitForTransitionEnd('compose');
  },

  setSyncIntervalSelectValue: function(value) {
    return this._setSelectValue(Selector.syncIntervalSelect, value);
  },

  // TODO: switch to https://github.com/mozilla-b2g/marionette-plugin-forms
  // once this bug is fixed:
  // https://bugzilla.mozilla.org/show_bug.cgi?id=915324
  _setSelectValue: function(selector, value) {
    var client = this.client;
    client.waitFor(function() {
      return client.executeScript(function(selector, value) {
        var doc = window.wrappedJSObject.document,
            selectNode = doc.querySelector(selector);

        selectNode.value = value;

        // Synthesize an event since changing the value on its own does
        // not trigger change listeners.
        var event = document.createEvent('Event');
        event.initEvent('change', true, true);
        selectNode.dispatchEvent(event);

        return true;
      }, [selector, value]);
    });
  },

  _onTransitionEndScriptTimeout: function(cardId) {
    var result = this.client.executeScript(function(cardId) {
      var cards = window.wrappedJSObject.require('cards'),
          htmlCache = window.wrappedJSObject.require('html_cache'),
          cardNode = cards._cardStack[cards.activeCardIndex];

      return {
        cardNode: !!cardNode,
        centered: cardNode && cardNode.classList.contains('center'),
        correctId: cardNode && htmlCache.nodeToKey(cardNode) === cardId,
        eventsClear: !cards._eatingEventsUntilNextCard
      };
    }, [cardId]);

    console.log('TRANSITION END TIMEOUT:');
    console.log(JSON.stringify(result, null, '  '));
  },

  _waitForTransitionEnd: function(cardId) {
    var client = this.client;

    // To find out what is wrong with an intermittent failure in here,
    // log the script test criteria
    client.onScriptTimeout = this._onTransitionEndScriptTimeout
                                 .bind(this, cardId);

    client.waitFor(function() {
      return client.executeScript(function(cardId) {
        var cards = window.wrappedJSObject.require('cards'),
            htmlCache = window.wrappedJSObject.require('html_cache'),
            cardNode = cards._cardStack[cards.activeCardIndex];

        return !!cardNode && cardNode.classList.contains('center') &&
               htmlCache.nodeToKey(cardNode) === cardId &&
               !cards._eatingEventsUntilNextCard;
      }, [cardId]);
    });

    client.onScriptTimeout = null;
  },

  _onNoTransitionScriptTimeout: function() {
    var result = this.client.executeScript(function() {
      var cards = window.wrappedJSObject.require('cards');

      return {
        cards: !!cards,
        eventsClear: !!cards && !cards._eatingEventsUntilNextCard
      };
    });

    console.log('NO TRANSITION TIMEOUT:');
    console.log(JSON.stringify(result, null, '  '));
  },

  _waitForNoTransition: function() {
    var client = this.client;

    // To find out what is wrong with an intermittent failure in here,
    // log the script test criteria
    client.onScriptTimeout = this._onNoTransitionScriptTimeout
                                 .bind(this);

    client.waitFor(function() {
      return client.executeScript(function() {
        var cards = window.wrappedJSObject.require('cards');
        return !cards._eatingEventsUntilNextCard;
      });
    });

    client.onScriptTimeout = null;
  },

  _setupTypeName: function(name) {
    this.client.helper
      .waitForElement(Selector.setupNameInput)
      .sendKeys(name);
  },

  _setupTypeEmail: function(email) {
    this.client.helper
      .waitForElement(Selector.setupEmailInput)
      .sendKeys(email);
  },

  _waitForElementNoTransition: function(selector) {
    this._waitForNoTransition();
    return this.client.helper.waitForElement(selector);
  },

  _tapSelector: function(selector) {
    this.client.helper.waitForElement(selector).tap();
  },

  _tapNext: function(selector, cardId) {
    this._tapSelector(selector);
    if (cardId) {
      this._waitForTransitionEnd(cardId);
    }
  },

  _clearAndSendKeys: function(selector, value) {
    var el = this.client.helper.waitForElement(selector);
    el.clear();
    el.sendKeys(value);
  },

  _manualSetupTypeName: function(name) {
    this._clearAndSendKeys(Selector.manualSetupNameInput, name);
  },

  _manualSetupTypeEmail: function(email) {
    this._clearAndSendKeys(Selector.manualSetupEmailInput, email);
  },

  _manualSetupTypeImapPassword: function(password) {
    this._clearAndSendKeys(Selector.manualSetupImapPasswordInput, password);
  },

  _manualSetupTypeSmtpPassword: function(password) {
    this._clearAndSendKeys(Selector.manualSetupSmtpPasswordInput, password);
  },

  _manualSetupTypeImapUsername: function(name) {
    this._clearAndSendKeys(Selector.manualSetupImapUsernameInput, name);
  },

  _manualSetupTypeImapHostname: function(hostname) {
    this._clearAndSendKeys(Selector.manualSetupImapHostnameInput, hostname);
  },

  _manualSetupTypeImapPort: function(port) {
    this._clearAndSendKeys(Selector.manualSetupImapPortInput, port);
  },

  _manualSetupTypeSmtpUsername: function(name) {
    this._clearAndSendKeys(Selector.manualSetupSmtpUsernameInput, name);
  },

  _manualSetupTypeSmtpHostname: function(hostname) {
    this._clearAndSendKeys(Selector.manualSetupSmtpHostnameInput, hostname);
  },

  _manualSetupTypeSmtpPort: function(port) {
    this._clearAndSendKeys(Selector.manualSetupSmtpPortInput, port);
  },

  /**
   * Because we never expose "plain" (zero security for users) as an option we
   * need to hack the html to expose it (the backend will know about this).
   */
  _manualSetupUpdateSocket: function(type) {
    var element = this.client.helper.waitForElement(Selector[type]);

    // select is a real dom select element
    element.scriptWith(function(select) {
      // create the option
      var option = document.createElement('option');
      option.value = 'plain';
      select.add(option, select.options[select.options.length - 1]);

      // update the form to plain so we can use insecure sockets for the
      // fakeserver.
      select.value = 'plain';
    });
  }
};

require('./debug')('email', Email.prototype);

