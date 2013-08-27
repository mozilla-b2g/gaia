function Email(client) {
  this.client = client;
}
module.exports = Email;

Email.EMAIL_ORIGIN = 'app://email.gaiamobile.org';

const Selector = {
  notificationBar: '.card-message-list .msg-list-topbar',
  setupNameInput: '.card-setup-account-info .sup-info-name',
  setupEmailInput: '.card-setup-account-info .sup-info-email',
  setupPasswordInput: '.card-setup-account-info .sup-info-password',
  nextButton: '.sup-account-header .sup-info-next-btn',
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
  replyMenuAll: '.msg-reply-menu-reply-all'
};

Email.prototype = {
  get notificationBar() {
    return this.client.findElement(Selector.notificationBar);
  },

  setupImapEmail: function() {
    const USER_NAME = 'GAIA';
    const EMAIL_ADDRESS = 'marionette.js.client@gmail.com';
    const PASSWORD = 'tpemozilla';
    // wait for the setup page is loaded
    this.client.helper.
      waitForElement(Selector.manualConfigButton);
    // setup a IMAP email account
    this._setupTypeName(USER_NAME);
    this._setupTypeEmail(EMAIL_ADDRESS);
    this._setupTypePassword(PASSWORD);
    this._setupTapNext();
    this._waitForSetupCompleted();
    this._tapContinue();
  },

  manualSetupImapEmail: function(server) {
    // wait for the setup page is loaded
    this.client.helper.
      waitForElement(Selector.manualConfigButton).
      tap();
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

    this._manualSetupTapNext();
    this._waitForSetupCompleted();
    this._tapContinue();
  },

  tapCompose: function() {
    this.client.findElement(Selector.composeButton).tap();
    // wait for being in the compose page
    this._waitForTransitionEnd();
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
    return this.client.helper.
      waitForElement(Selector.composeBodyInput).getAttribute('value');
  },

  abortCompose: function() {
    this.client.helper.waitForElement(Selector.composeBackButton).tap();
    this.client.helper.waitForElement(Selector.composeDraftDiscard).tap();
    this._waitForTransitionEnd();
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
    client.helper.waitForElement(Selector.refreshButton);
    this._waitForTransitionEnd();
  },

  waitForNewEmail: function() {
    var client = this.client;
    client.
      findElement(Selector.refreshButton).
      tap();
    // show a new email notification
    client.helper.waitForElement(Selector.notificationBar);
  },

  launch: function() {
    var client = this.client;
    client.apps.launch(Email.EMAIL_ORIGIN);
    client.apps.switchToApp(Email.EMAIL_ORIGIN);
    // wait for the document body to know we're really launched
    client.helper.waitForElement('body');
  },

  tapEmailAtIndex: function(index) {
    var client = this.client;
    var element = client.findElements(Selector.messageHeaderItem)[index];
    element.tap();
    this._waitForTransitionEnd();
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
    this._waitForTransitionEnd();
  },

  _waitForTransitionEnd: function() {
    var client = this.client;
    client.waitFor(function() {
      var condition = false;
      client.executeScript(
        function() {
          return window.wrappedJSObject.
                   require('mail_common').
                   Cards.
                   _eatingEventsUntilNextCard;
        },
        function(error, result) {
          if (result === false) {
            condition = true;
          }
        }
      );
      return condition;
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

  _setupTapNext: function() {
    this._waitForTransitionEnd();
    this.client.
      findElement(Selector.nextButton).
      tap();
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
  },

  _manualSetupTapNext: function() {
    this._waitForTransitionEnd();
    this.client.
      findElement(Selector.manualNextButton).
      tap();
  },

  _waitForSetupCompleted: function() {
    this.client.helper.waitForElement(Selector.showMailButton);
  },

  _tapContinue: function() {
    this.client.
      findElement(Selector.showMailButton).
      tap();
  }
};
