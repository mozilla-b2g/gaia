/*jshint node: true, browser: true */
function Email(client) {
  this.client = client;
}
module.exports = Email;

Email.EMAIL_ORIGIN = 'app://email.gaiamobile.org';

var Selector = {
  notificationBar: '.card-message-list .msg-list-topbar',
  setupNameInput: '.card-setup-account-info .sup-info-name',
  setupEmailInput: '.card-setup-account-info .sup-info-email',
  setupPasswordInput: '.card-setup-account-info .sup-info-password',
  nextButton: '.card-setup-account-info .sup-info-next-btn',
  prefsNextButton: '.card-setup-account-prefs .sup-info-next-btn',
  manualSetupNameInput: '.sup-manual-form .sup-info-name',
  manualSetupEmailInput: '.sup-manual-form .sup-info-email',
  manualSetupPasswordInput: '.sup-manual-form .sup-info-password',
  manualSetupImapUsernameInput: '.sup-manual-form .sup-manual-imap-username',
  manualSetupImapHostnameInput: '.sup-manual-form .sup-manual-imap-hostname',
  manualSetupImapPortInput: '.sup-manual-form .sup-manual-imap-port',
  manualSetupImapSocket: '.sup-manual-form .sup-manual-imap-socket',
  manualSetupSmtpUsernameInput: '.sup-manual-form .sup-manual-smtp-username',
  manualSetupSmtpHostnameInput: '.sup-manual-form .sup-manual-smtp-hostname',
  manualSetupSmtpPortInput: '.sup-manual-form .sup-manual-smtp-port',
  manualSetupSmtpSocket: '.sup-manual-form .sup-manual-smtp-socket',
  manualNextButton: '.sup-account-header .sup-manual-next-btn',
  showMailButton: '.card-setup-done .sup-show-mail-btn',
  manualConfigButton: '.scrollregion-below-header .sup-manual-config-btn',
  composeButton: '.msg-list-header .msg-compose-btn',
  composeEmailContainer: '.card-compose .cmp-to-container',
  composeEmailInput: '.card-compose .cmp-addr-text',
  composeSubjectInput: '.card-compose .cmp-subject-text',
  composeBodyInput: '.card-compose .cmp-body-text',
  composeSendButton: '.card-compose .cmp-send-btn',
  composeBackButton: '.card-compose .cmp-back-btn',
  composeDraftDiscard: '#cmp-draft-discard',
  refreshButton: '.card.center .msg-refresh-btn',
  messageHeaderItem: '.msg-messages-container .msg-header-item',
  cardMessageReader: '.card-message-reader',
  replyMenuButton: '.msg-reply-btn',
  replyMenu: '.msg-reply-menu',
  replyMenuReply: '.msg-reply-menu-reply',
  replyMenuForward: '.msg-reply-menu-forward',
  replyMenuAll: '.msg-reply-menu-reply-all',
  folderListButton: '.msg-list-header .msg-folder-list-btn',
  settingsButton: '.fld-nav-toolbar .fld-nav-settings-btn',
  settingsDoneButton: '.card-settings-main [data-l10n-id="settings-done"]',
  addAccountButton: '.tng-accounts-container .tng-account-add',
  accountListButton: '.fld-folders-header .fld-accounts-btn',
  settingsMainAccountItems: '.tng-accounts-container .tng-account-item',
  syncIntervalSelect: '.tng-account-check-interval ',
  // Checkboxes are weird: hidden to marionette, but the associated span
  // is clickable and does the job.
  notifyEmailCheckbox: '.tng-notify-mail-label > span',
  accountSettingsBackButton: '.card-settings-account .tng-back-btn'
};

Email.prototype = {
  get notificationBar() {
    return this.client.findElement(Selector.notificationBar);
  },

  getComposeBody: function() {
    var input = this.client.findElement(Selector.composeBodyInput);
    var value = input.getAttribute('value');
    return value;
  },

  getComposeTo: function() {
    var container = this.client.findElement(Selector.composeEmailContainer);
    var text = container.text();
    return text;
  },

  manualSetupImapEmail: function(server, finalActionName) {
    // wait for the setup page is loaded
    this._waitForElementNoTransition(Selector.manualConfigButton).tap();
    this._waitForTransitionEnd('setup_manual_config');
    // setup a IMAP email account
    var email = server.imap.username + '@' + server.imap.hostname;
    this._manualSetupTypeName(server.imap.username);
    this._manualSetupTypeEmail(email);
    this._manualSetupTypePassword(server.imap.password);

    this._manualSetupTypeImapUsername(server.imap.username);
    this._manualSetupTypeImapHostname(server.imap.hostname);
    this._manualSetupTypeImapPort(server.imap.port);
    this._manualSetupUpdateSocket('manualSetupImapSocket');

    this._manualSetupTypeSmtpUsername(server.smtp.username);
    this._manualSetupTypeSmtpHostname(server.smtp.hostname);
    this._manualSetupTypeSmtpPort(server.smtp.port);
    this._manualSetupUpdateSocket('manualSetupSmtpSocket');

    this._finishSetup(Selector.manualNextButton, finalActionName);
  },

  _finishSetup: function(nextSelector, finalActionName) {
    this._tapNext(nextSelector);
    this._waitForElementNoTransition(Selector.prefsNextButton);
    this._tapNext(Selector.prefsNextButton, 'setup_done');

    this._waitForElementNoTransition(Selector.showMailButton);
    this.client.
      findElement(Selector.showMailButton).
      tap();
    return this[finalActionName || 'waitForMessageList']();
  },

  // Waits for confirm dialog to show up, then clicks OK to confirm
  // going to setting up a new account after triggering email launch
  // from an activity.
  confirmWantAccount: function() {
    this.client.helper.waitForAlert('not set up to send or receive email');
    // inlined selector since it is specific to the out-of-app confirm
    // dialog found in system/index.html
    this._tapSelector('#modal-dialog-confirm-ok');
    this.client.switchToFrame();
    this.client.apps.switchToApp(Email.EMAIL_ORIGIN);
    this.client.helper.waitForElement(Selector.manualConfigButton);
    this.client.findElement(Selector.manualConfigButton).tap();
  },

  tapFolderListButton: function() {
    this._tapSelector(Selector.folderListButton);
    this._waitForElementNoTransition(Selector.settingsButton);
    this._waitForTransitionEnd('folder_picker');
  },

  tapFolderListCloseButton: function() {
    this._tapSelector(Selector.folderListButton);
    this._waitForElementNoTransition(Selector.settingsButton);
    this.waitForMessageList();
  },

  tapAccountListButton: function() {
    // XXX: Workaround util http://bugzil.la/912873 is fixed.
    // Wait for 500ms to let the element be clickable
    this.client.helper.wait(500);
    this._waitForElementNoTransition(Selector.accountListButton).tap();
    this._waitForTransitionEnd('account_picker');
  },

  switchAccount: function(number) {
    var accountSelector = '.acct-list-container ' +
                          'a:nth-child(' + number + ')';
    this.client.
      findElement(accountSelector).
      tap();
    this._waitForTransitionEnd('folder_picker');
  },

  tapSettingsButton: function() {
    this.client.
      findElement(Selector.settingsButton).
      tap();
    this._waitForTransitionEnd('settings_main');
  },

  tapSettingsDoneButton: function() {
    this.client.
      findElement(Selector.settingsDoneButton).
      tap();
    this._waitForTransitionEnd('folder_picker');
  },

  tapSettingsAccountIndex: function(index) {
    var elements = this.client.findElements(Selector.settingsMainAccountItems);
    elements[index].tap();
    this._waitForTransitionEnd('settings_account');
  },

  tapAddAccountButton: function() {
    this.client.
      findElement(Selector.addAccountButton).
      tap();
    this._waitForTransitionEnd('setup_account_info');
  },

  tapNotifyEmailCheckbox: function() {
    this._tapSelector(Selector.notifyEmailCheckbox);
  },

  tapAccountSettingsBackButton: function() {
    this.client.
      findElement(Selector.accountSettingsBackButton).
      tap();
    this._waitForTransitionEnd('settings_main');
  },

  tapCompose: function() {
    this._tapSelector(Selector.composeButton);
    this.waitForCompose();
  },

  typeTo: function(email) {
    this.client.
      findElement(Selector.composeEmailInput).
      sendKeys(email);
  },

  typeSubject: function(string) {
    this.client.
      findElement(Selector.composeSubjectInput).
      sendKeys(string);
  },

  typeBody: function(string) {
    this.client.
      findElement(Selector.composeBodyInput).
      sendKeys(string);
  },

  getComposeBody: function() {
    return this._waitForElementNoTransition(Selector.composeBodyInput)
           .getAttribute('value');
  },

  abortCompose: function(cardId) {
    this._waitForElementNoTransition(Selector.composeBackButton).tap();
    this._waitForElementNoTransition(Selector.composeDraftDiscard).tap();
    this._waitForTransitionEnd(cardId);
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
    client.
      findElement(Selector.composeSendButton).
      tap();
    // wait for being in the email list page
    this._waitForElementNoTransition(Selector.refreshButton);
    this.waitForMessageList();
  },

  tapRefreshButton: function() {
    this.client.
      findElement(Selector.refreshButton).
      tap();
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

  waitForNewEmail: function() {
    this._waitForElementNoTransition(Selector.notificationBar);
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

  tapEmailAtIndex: function(index) {
    var client = this.client;
    var element = client.findElements(Selector.messageHeaderItem)[index];
    element.tap();
    this.waitForMessageReader();
  },

  /**
   * Opens the reply menu and selects 'reply', 'all', or 'forward'.
   */
  tapReply: function(mode) {
    var client = this.client;
    // open the reply menu
    client.findElement(Selector.replyMenuButton).tap();
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
    default:
      whichButton = Selector.replyMenuReply;
      break;
    }
    client.findElement(whichButton).tap();
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

  _waitForTransitionEnd: function(cardId) {
    var client = this.client;
    client.waitFor(function() {
      return client.executeScript(function(cardId) {
        var Cards = window.wrappedJSObject.require('mail_common').Cards,
            card = Cards._cardStack[Cards.activeCardIndex],
            cardNode = card && card.domNode;
        return !!cardNode && cardNode.classList.contains('center') &&
               cardNode.dataset.type === cardId &&
               !Cards._eatingEventsUntilNextCard;
      }, [cardId]);
    });
  },

  _waitForNoTransition: function() {
    var client = this.client;
    client.waitFor(function() {
      return client.executeScript(function() {
        var Cards = window.wrappedJSObject.require('mail_common').Cards;
        return !Cards._eatingEventsUntilNextCard;
      });
    });
  },

  _setupTypeName: function(name) {
    this.client.
      findElement(Selector.setupNameInput).
      sendKeys(name);
  },

  _setupTypeEmail: function(email) {
    this.client.
      findElement(Selector.setupEmailInput).
      sendKeys(email);
  },

  _setupTypePassword: function(password) {
    this.client.
      findElement(Selector.setupPasswordInput).
      sendKeys(password);
  },

  _waitForElementNoTransition: function(selector) {
    this._waitForNoTransition();
    return this.client.helper.waitForElement(selector);
  },

  _tapSelector: function(selector) {
    this.client.helper.waitForElement(selector);
    this.client.findElement(selector).tap();
  },

  _tapNext: function(selector, cardId) {
    this._tapSelector(selector);
    if (cardId)
      this._waitForTransitionEnd(cardId);
  },

  _manualSetupTypeName: function(name) {
    this.client.
      findElement(Selector.manualSetupNameInput).
      sendKeys(name);
  },

  _manualSetupTypeEmail: function(email) {
    this.client.
      findElement(Selector.manualSetupEmailInput).
      sendKeys(email);
  },

  _manualSetupTypePassword: function(password) {
    this.client.
      findElement(Selector.manualSetupPasswordInput).
      sendKeys(password);
  },

  _manualSetupTypeImapUsername: function(name) {
    this.client.
      findElement(Selector.manualSetupImapUsernameInput).
      sendKeys(name);
  },

  _manualSetupTypeImapHostname: function(hostname) {
    this.client.
      findElement(Selector.manualSetupImapHostnameInput).
      sendKeys(hostname);
  },

  _manualSetupTypeImapPort: function(port) {
    var manualSetupImapPortInput =
        this.client.findElement(Selector.manualSetupImapPortInput);
    manualSetupImapPortInput.clear();
    manualSetupImapPortInput.sendKeys(port);
  },

  _manualSetupTypeSmtpUsername: function(name) {
    this.client.
      findElement(Selector.manualSetupSmtpUsernameInput).
      sendKeys(name);
  },

  _manualSetupTypeSmtpHostname: function(hostname) {
    this.client.
      findElement(Selector.manualSetupSmtpHostnameInput).
      sendKeys(hostname);
  },

  _manualSetupTypeSmtpPort: function(port) {
    var manualSetupSmtpPortInput =
        this.client.findElement(Selector.manualSetupSmtpPortInput);
    manualSetupSmtpPortInput.clear();
    manualSetupSmtpPortInput.sendKeys(port);
  },

  /**
   * Because we never expose "plain" (zero security for users) as an option we
   * need to hack the html to expose it (the backend will know about this).
   */
  _manualSetupUpdateSocket: function(type) {
    var element = this.client.findElement(Selector[type]);

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

