'use strict';
/**
 * Card definitions/logic for adding accounts, changing accounts, and
 * generally managing our settings.
 **/

/**
 * Map error codes to their l10n string id.  This exists because we have
 * revised some of the strings and so a direct transformation is no longer
 * sufficient.  If an error code does not exist in this map, it gets mapped
 * to the "unknown" value's l10n string id.
 */
var SETUP_ERROR_L10N_ID_MAP = {
  'offline': 'setup-error-offline',
  'bad-user-or-pass': 'setup-error-bad-user-or-pass2',
  'not-authorized': 'setup-error-not-authorized',
  'unknown': 'setup-error-unknown2',
  'needs-app-pass': 'setup-error-needs-app-pass',
  'imap-disabled': 'setup-error-imap-disabled',
  'bad-security': 'setup-error-bad-security',
  'unresponsive-server': 'setup-error-unresponsive-server',
  'server-problem': 'setup-error-server-problem',
  'no-config-info': 'setup-error-no-config-info',
  'server-maintenance': 'setup-error-server-maintenance'
};

/**
 * Enter basic account info card (name, e-mail address, password) to try and
 * autoconfigure an account.
 */
function SetupAccountInfoCard(domNode, mode, args) {
  this.domNode = domNode;

  // The back button should only be enabled if there is at least one other
  // account already in existence.
  if (args.allowBack) {
    var backButton = domNode.getElementsByClassName('sup-back-btn')[0];
    backButton.addEventListener('click', this.onBack.bind(this), false);
    backButton.classList.remove('collapsed');
  }

  this.nextButton = domNode.getElementsByClassName('sup-info-next-btn')[0];
  this.nextButton.addEventListener('click', this.onNext.bind(this), false);

  this.formNode = domNode.getElementsByClassName('sup-account-form')[0];

  this.nameNode = this.domNode.getElementsByClassName('sup-info-name')[0];
  this.emailNode = this.domNode.getElementsByClassName('sup-info-email')[0];
  this.passwordNode =
    this.domNode.getElementsByClassName('sup-info-password')[0];

  // Add input event handler to prevent user submit empty name or password.
  this.emailNode.addEventListener('input', this.onInfoInput.bind(this));
  this.nameNode.addEventListener('input', this.onInfoInput.bind(this));
  this.passwordNode.addEventListener('input', this.onInfoInput.bind(this));

  var manualConfig = domNode.getElementsByClassName('sup-manual-config-btn')[0];
  manualConfig.addEventListener('click', this.onClickManualConfig.bind(this),
                                false);

  new FormNavigation({
    formElem: domNode.getElementsByTagName('form')[0],
    onLast: this.onNext.bind(this)
  });
}

SetupAccountInfoCard.prototype = {
  onBack: function(event) {
    // If we are the only card, we need to remove ourselves and tell the app
    // to do initial card pushing.  This would happen if the app was started
    // without any accounts.
    if (Cards._cardStack.length === 1) {
      Cards.removeAllCards();
      App.showMessageViewOrSetup();
    }
    // Otherwise we were triggered from the settings UI and we can just pop
    // our way back to that UI.
    else {
      Cards.removeCardAndSuccessors(this.domNode, 'animate', 1);
    }
  },
  onNext: function(event) {
    var nameNode = this.domNode.getElementsByClassName('sup-info-name')[0],
        emailNode = this.domNode.getElementsByClassName('sup-info-email')[0],
        passwordNode =
          this.domNode.getElementsByClassName('sup-info-password')[0];

    // The progress card is the dude that actually tries to create the account.
    Cards.pushCard(
      'setup-progress', 'default', 'animate',
      {
        displayName: this.nameNode.value,
        emailAddress: this.emailNode.value,
        password: this.passwordNode.value,
        callingCard: this
      },
      'right');
  },

  onInfoInput: function(event) {
    this.nextButton.disabled = !this.formNode.checkValidity();
  },

  onClickManualConfig: function() {
    Cards.pushCard(
      'setup-manual-config', 'default', 'animate',
      {
        displayName: this.nameNode.value,
        emailAddress: this.emailNode.value,
        password: this.passwordNode.value
      },
      'right');
  },

  // note: this method is also reused by the manual config card
  showError: function(errName, errDetails) {
    this.domNode.getElementsByClassName('sup-error-region')[0]
        .classList.remove('collapsed');
    var errorMessageNode =
      this.domNode.getElementsByClassName('sup-error-message')[0];
    var errorCodeNode =
      this.domNode.getElementsByClassName('sup-error-code')[0];

    // Attempt to get a user-friendly string for the error we got. If we can't
    // find a match, just show the "unknown" error string.
    var errorStr = mozL10n.get(
      SETUP_ERROR_L10N_ID_MAP.hasOwnProperty(errName) ?
        SETUP_ERROR_L10N_ID_MAP[errName] :
        SETUP_ERROR_L10N_ID_MAP['unknown'],
      errDetails);
    errorMessageNode.textContent = errorStr;

    // Expose the error code to the UI.  Additionally, if there was a status,
    // expose that too.
    var errorCodeStr = errName;
    if (errDetails && errDetails.status)
      errorCodeStr += '(' + errDetails.status + ')';
    errorCodeNode.textContent = errorCodeStr;

    // Make sure we are scrolled to the top of the scroll region so that the
    // error message is visible.
    this.domNode.getElementsByClassName('scrollregion-below-header')[0]
      .scrollTop = 0;
  },

  die: function() {
  }
};
Cards.defineCardWithDefaultMode(
    'setup-account-info',
    { tray: false },
    SetupAccountInfoCard
);

/**
 * Asks the user to manually configure their account.
 */
function SetupManualConfig(domNode, mode, args) {
  this.domNode = domNode;

  var backButton = domNode.getElementsByClassName('sup-back-btn')[0];
  backButton.addEventListener('click', this.onBack.bind(this), false);

  this.nextButton = domNode.getElementsByClassName('sup-manual-next-btn')[0];
  this.nextButton.addEventListener('click', this.onNext.bind(this), false);

  this.formNode = domNode.getElementsByClassName('sup-manual-form')[0];

  this.accountTypeNode = domNode.getElementsByClassName(
    'sup-manual-account-type')[0];
  this.accountTypeNode.addEventListener(
    'change', this.onChangeAccountType.bind(this), false);

  this.formItems = {
    common: {},
    imap: {},
    smtp: {},
    activeSync: {}
  };

  this.formItems.common.displayName = domNode.getElementsByClassName(
    'sup-info-name')[0];
  this.formItems.common.displayName.value = args.displayName;
  this.formItems.common.emailAddress = domNode.getElementsByClassName(
    'sup-info-email')[0];
  this.formItems.common.emailAddress.value = args.emailAddress;
  this.formItems.common.password = domNode.getElementsByClassName(
    'sup-info-password')[0];
  this.formItems.common.password.value = args.password;


  this.formItems.imap.hostname = domNode.getElementsByClassName(
    'sup-manual-imap-hostname')[0];
  this.formItems.imap.port = domNode.getElementsByClassName(
    'sup-manual-imap-port')[0];
  this.formItems.imap.socket = domNode.getElementsByClassName(
    'sup-manual-imap-socket')[0];
  this.formItems.imap.username = domNode.getElementsByClassName(
    'sup-manual-imap-username')[0];

  this.formItems.smtp.hostname = domNode.getElementsByClassName(
    'sup-manual-smtp-hostname')[0];
  this.formItems.smtp.port = domNode.getElementsByClassName(
    'sup-manual-smtp-port')[0];
  this.formItems.smtp.socket = domNode.getElementsByClassName(
    'sup-manual-smtp-socket')[0];
  this.formItems.smtp.username = domNode.getElementsByClassName(
    'sup-manual-smtp-username')[0];

  this.formItems.activeSync.hostname = domNode.getElementsByClassName(
    'sup-manual-activesync-hostname')[0];
  this.formItems.activeSync.username = domNode.getElementsByClassName(
    'sup-manual-activesync-username')[0];

  for (var type in this.formItems) {
    for (var field in this.formItems[type]) {
      if (this.formItems[type][field].tagName === 'INPUT') {
        this.formItems[type][field].addEventListener(
          'input', this.onInfoInput.bind(this));
      }
    }
  }

  this.requireFields('imap', true);
  this.requireFields('smtp', true);
  this.requireFields('activeSync', false);

  new FormNavigation({
    formElem: this.formNode,
    onLast: this.onNext.bind(this)
  });
}

SetupManualConfig.prototype = {
  onBack: function(event) {
    Cards.removeCardAndSuccessors(this.domNode, 'animate', 1);
  },

  onNext: function(event) {
    var config = { type: this.accountTypeNode.value };

    if (config.type === 'imap+smtp') {
      config.incoming = {
        hostname: this.formItems.imap.hostname.value,
        port: this.formItems.imap.port.value,
        socketType: this.formItems.imap.socket.value,
        username: this.formItems.imap.username.value
      };
      config.outgoing = {
        hostname: this.formItems.smtp.hostname.value,
        port: this.formItems.smtp.port.value,
        socketType: this.formItems.smtp.socket.value,
        username: this.formItems.smtp.username.value
      };
    }
    else { // config.type === 'activesync'
      config.incoming = {
        server: 'https://' + this.formItems.activeSync.hostname.value,
        username: this.formItems.activeSync.username.value
      };
    }

    // The progress card is the dude that actually tries to create the account.
    Cards.pushCard(
      'setup-progress', 'default', 'animate',
      {
        displayName: this.formItems.common.displayName.value,
        emailAddress: this.formItems.common.emailAddress.value,
        password: this.formItems.common.password.value,

        domainInfo: config,
        callingCard: this
      },
      'right');
  },


  onInfoInput: function(event) {
    this.nextButton.disabled = !this.formNode.checkValidity();
  },

  onChangeAccountType: function(event) {
    var imapSmtpSection = this.domNode.getElementsByClassName(
      'sup-manual-imap-smtp')[0];
    var activeSyncSection = this.domNode.getElementsByClassName(
      'sup-manual-activesync')[0];
    var isImapSmtp = event.target.value === 'imap+smtp';

    if (isImapSmtp) {
      imapSmtpSection.classList.remove('collapsed');
      activeSyncSection.classList.add('collapsed');
    }
    else {
      imapSmtpSection.classList.add('collapsed');
      activeSyncSection.classList.remove('collapsed');
    }

    this.requireFields('imap', isImapSmtp);
    this.requireFields('smtp', isImapSmtp);
    this.requireFields('activeSync', !isImapSmtp);
  },

  requireFields: function(type, required) {
    for (var field in this.formItems[type]) {
      var item = this.formItems[type][field];
      if (!item.hasAttribute('data-maybe-required'))
        continue;

      if (required)
        item.setAttribute('required', '');
      else
        item.removeAttribute('required');
    }
  },

  showError: SetupAccountInfoCard.prototype.showError,

  die: function() {
  }
};
Cards.defineCardWithDefaultMode(
    'setup-manual-config',
    { tray: false },
    SetupManualConfig
);

/**
 * Show a spinner until the tryToCreateAccount returns; on success we
 * transition to 'setup-done', on failure we pop ourselves off and return the
 * error information to the card that invoked us.
 */
function SetupProgressCard(domNode, mode, args) {
  this.domNode = domNode;
  this.callingCard = args.callingCard;

  var backButton = domNode.getElementsByClassName('sup-back-btn')[0];
  backButton.addEventListener('click', this.onBack.bind(this), false);

  var self = this;
  this.creationInProcess = true;
  MailAPI.tryToCreateAccount(
    {
      displayName: args.displayName,
      emailAddress: args.emailAddress,
      password: args.password
    },
    args.domainInfo || null,
    function(err, errDetails) {
      self.creationInProcess = false;
      if (err)
        self.onCreationError(err, errDetails);
      else
        self.onCreationSuccess();
    });
}
SetupProgressCard.prototype = {
  cancelCreation: function() {
    if (!this.creationInProcess)
      return;
    // XXX implement cancellation
  },

  onBack: function() {
    this.cancelCreation();
    Cards.removeCardAndSuccessors(this.domNode, 'animate', 1);
  },

  onCreationError: function(err, errDetails) {
    this.callingCard.showError(err, errDetails);
    Cards.removeCardAndSuccessors(this.domNode, 'animate', 1);
  },

  onCreationSuccess: function() {
    // nuke the current card stack, replace them with the done card.
    Cards.removeAllCards();
    Cards.pushCard(
      'setup-done', 'default', 'immediate',
      {});
  },

  die: function() {
    this.cancelCreation();
  }
};
Cards.defineCardWithDefaultMode(
    'setup-progress',
    { tray: false },
    SetupProgressCard
);

/**
 * Setup is done; add another account?
 */
function SetupDoneCard(domNode, mode, args) {
  domNode.getElementsByClassName('sup-add-another-account-btn')[0]
    .addEventListener('click', this.onAddAnother.bind(this), false);
  domNode.getElementsByClassName('sup-show-mail-btn')[0]
    .addEventListener('click', this.onShowMail.bind(this), false);
}
SetupDoneCard.prototype = {
  onAddAnother: function() {
    // Nuke all cards
    Cards.removeAllCards();
    // Show the first setup card again.
    Cards.pushCard(
      'setup-account-info', 'default', 'immediate',
      {
        allowBack: true
      });
  },
  onShowMail: function() {
    // Nuke this card
    Cards.removeAllCards();
    // Trigger the startup logic again; this should show the inbox this time.
    App.showMessageViewOrSetup(true);
  },

  die: function() {
  }
};
Cards.defineCardWithDefaultMode(
    'setup-done',
    { tray: false },
    SetupDoneCard
);

/**
 * Asks the user to re-enter their password for the account
 */
function SetupFixPassword(domNode, mode, args) {
  this.domNode = domNode;
  this.account = args.account;
  this.restoreCard = args.restoreCard;

  var accountNode =
    domNode.getElementsByClassName('sup-bad-password-account')[0];
  accountNode.textContent = this.account.name;

  var useButton = domNode.getElementsByClassName('sup-use-password-btn')[0];
  useButton.addEventListener('click', this.onUsePassword.bind(this), false);

  this.passwordNode =
    this.domNode.getElementsByClassName('sup-info-password')[0];
}
SetupFixPassword.prototype = {
  /**
   * Assume we will be successful; update the password, trigger a reauth
   * attempt, then close the card.
   */
  onUsePassword: function() {
    var password = this.passwordNode.value;
    if (password)
      this.account.modifyAccount({ password: password });
    this.account.clearProblems();
    Cards.removeCardAndSuccessors(this.domNode, 'animate', 1,
                                  this.restoreCard);
  },

  die: function() {
    // no special cleanup required
  }
};
Cards.defineCardWithDefaultMode(
    'setup-fix-password',
    { tray: false },
    SetupFixPassword
);
// The app password card is just the bad password card with different text
Cards.defineCardWithDefaultMode(
    'setup-fix-gmail-twofactor',
    { tray: false },
    SetupFixPassword
);

/**
 * Tells the user how to enable IMAP for Gmail
 */
function SetupFixGmailImap(domNode, mode, args) {
  this.domNode = domNode;
  this.account = args.account;
  this.restoreCard = args.restoreCard;

  var accountNode =
    domNode.getElementsByClassName('sup-gmail-imap-account')[0];
  accountNode.textContent = this.account.name;

  var useButton = domNode.getElementsByClassName('sup-dismiss-btn')[0];
  useButton.addEventListener('click', this.onDismiss.bind(this), false);
}
SetupFixGmailImap.prototype = {
  die: function() {
    // no special cleanup required
  },

  onDismiss: function() {
    this.account.clearProblems();
    Cards.removeCardAndSuccessors(this.domNode, 'animate', 1,
                                  this.restoreCard);
  }
};
Cards.defineCardWithDefaultMode(
    'setup-fix-gmail-imap',
    { tray: false },
    SetupFixGmailImap
);

/**
 * Global settings, list of accounts.
 */
function SettingsMainCard(domNode, mode, args) {
  this.domNode = domNode;

  this.acctsSlice = MailAPI.viewAccounts(false);
  this.acctsSlice.onsplice = this.onAccountsSplice.bind(this);

  domNode.getElementsByClassName('tng-close-btn')[0]
    .addEventListener('click', this.onClose.bind(this), false);

  var checkIntervalNode =
    domNode.getElementsByClassName('tng-main-check-interval')[0];
console.log('  CONFIG CURRENTLY:', JSON.stringify(MailAPI.config));//HACK
  checkIntervalNode.value = MailAPI.config.syncCheckIntervalEnum;
  checkIntervalNode.addEventListener(
    'change', this.onChangeSyncInterval.bind(this), false);

  this.accountsContainer =
    domNode.getElementsByClassName('tng-accounts-container')[0];

  domNode.getElementsByClassName('tng-account-add')[0]
    .addEventListener('click', this.onClickAddAccount.bind(this), false);

  this._secretButtonClickCount = 0;
  this._secretButtonTimer = null;
  // TODO: Need to remove the secret debug entry before shipping.
  domNode.getElementsByClassName('tng-email-lib-version')[0]
    .addEventListener('click', this.onClickSecretButton.bind(this), false);
}
SettingsMainCard.prototype = {
  onClose: function() {
    Cards.removeCardAndSuccessors(this.domNode, 'animate', 1, 1);
  },

  onAccountsSplice: function(index, howMany, addedItems,
                             requested, moreExpected) {
    var accountsContainer = this.accountsContainer;

    var account;
    if (howMany) {
      for (var i = index + howMany - 1; i >= index; i--) {
        account = this.acctsSlice.items[i];
        accountsContainer.removeChild(account.element);
      }
    }

    var insertBuddy = (index >= accountsContainer.childElementCount) ?
                        null : accountsContainer.children[index],
        self = this;
    addedItems.forEach(function(account) {
      var accountNode = account.element =
        tngNodes['account-item'].cloneNode(true);
      accountNode.account = account;
      self.updateAccountDom(account, true);
      accountsContainer.insertBefore(accountNode, insertBuddy);
    });
  },

  updateAccountDom: function(account, firstTime) {
    var accountNode = account.element;

    if (firstTime) {
      var accountLabel =
        accountNode.getElementsByClassName('tng-account-item-label')[0];

      accountLabel.textContent = account.name;
      accountLabel.addEventListener('click',
        this.onClickEnterAccount.bind(this, account), false);
    }
  },

  onChangeSyncInterval: function(event) {
    console.log('sync interval changed to', event.target.value);
    MailAPI.modifyConfig({
      syncCheckIntervalEnum: event.target.value });
  },

  onClickAddAccount: function() {
    Cards.pushCard(
      'setup-account-info', 'default', 'animate',
      {
        allowBack: true
      },
      'right');
  },

  onClickEnterAccount: function(account) {
    Cards.pushCard(
      'settings-account', 'default', 'animate',
      {
        account: account
      },
      'right');
  },

  onClickSecretButton: function() {
    if (this._secretButtonTimer === null) {
      this._secretButtonTimer = window.setTimeout(
        function() {
          self._secretButtonTimer = null;
          self._secretButtonClickCount = 0;
        }.bind(this), 2000);
    }

    if (++this._secretButtonClickCount >= 5) {
      window.clearTimeout(this._secretButtonTimer);
      this._secretButtonTimer = null;
      this._secretButtonClickCount = 0;
      Cards.pushCard('settings-debug', 'default', 'animate', {}, 'right');
    }
  },

  die: function() {
    this.acctsSlice.die();
  }
};
Cards.defineCardWithDefaultMode(
    'settings-main',
    { tray: false },
    SettingsMainCard
);

/**
 * Per-account settings, maybe some metadata.
 */
function SettingsAccountCard(domNode, mode, args) {
  this.domNode = domNode;
  this.account = args.account;

  var serversContainer =
    domNode.getElementsByClassName('tng-account-server-container')[0];

  domNode.getElementsByClassName('tng-account-header-label')[0]
    .textContent = args.account.name;

  domNode.getElementsByClassName('tng-back-btn')[0]
    .addEventListener('click', this.onBack.bind(this), false);

  domNode.getElementsByClassName('tng-account-delete')[0]
    .addEventListener('click', this.onDelete.bind(this), false);

  // ActiveSync, IMAP and SMTP are protocol names, no need to be localized
  domNode.getElementsByClassName('tng-account-type')[0].textContent =
    (this.account.type === 'activesync') ? 'ActiveSync' : 'IMAP+SMTP';

  var synchronizeNode = domNode.getElementsByClassName(
    'tng-account-synchronize')[0];
  synchronizeNode.value = this.account.syncRange;
  synchronizeNode.addEventListener(
    'change', this.onChangeSynchronize.bind(this), false);

  this.account.servers.forEach(function(server, index) {
    var serverNode = tngNodes['account-settings-server'].cloneNode(true);
    var serverLabel =
      serverNode.getElementsByClassName('tng-account-server-label')[0];

    serverLabel.textContent = mozL10n.get('settings-' + server.type + '-label');
    serverLabel.addEventListener('click',
      this.onClickServers.bind(this, index), false);

    serversContainer.appendChild(serverNode);
  }.bind(this));

  domNode.getElementsByClassName('tng-account-credentials')[0]
    .addEventListener('click',
      this.onClickCredentials.bind(this), false);
}
SettingsAccountCard.prototype = {
  onBack: function() {
    Cards.removeCardAndSuccessors(this.domNode, 'animate', 1);
  },

  onClickCredentials: function() {
    Cards.pushCard(
      'settings-account-credentials', 'default', 'animate',
      {
        account: this.account
      },
      'right');
  },

  onClickServers: function(index) {
    Cards.pushCard(
      'settings-account-servers', 'default', 'animate',
      {
        account: this.account,
        index: index
      },
      'right');
  },

  onChangeSynchronize: function(event) {
    this.account.modifyAccount({syncRange: event.target.value});

    // If we just changed the currently-selected account, refresh the
    // currently-open folder to propagate the syncRange change.
    var curAccount = Cards.findCardObject(['folder-picker', 'navigation'])
                          .cardImpl.curAccount;
    if (curAccount.id === this.account.id) {
      Cards.findCardObject(['message-list', 'nonsearch']).cardImpl.onRefresh();
    }
  },

  onDelete: function() {
    var account = this.account;

    var dialog = tngNodes['account-delete-confirm'].cloneNode(true);
    var content = dialog.getElementsByTagName('p')[0];
    content.textContent = mozL10n.get('settings-account-delete-prompt',
                                      { account: account.name });
    ConfirmDialog.show(dialog,
      { // Confirm
        id: 'account-delete-ok',
        handler: function() {
          account.deleteAccount();
          Cards.removeAllCards();
          App.showMessageViewOrSetup();
        }
      },
      { // Cancel
        id: 'account-delete-cancel',
        handler: null
      }
    );
  },

  die: function() {
  }
};
Cards.defineCardWithDefaultMode(
    'settings-account',
    { tray: false },
    SettingsAccountCard
);

/**
 * Per-account credentials settings, it can be activesync or imap+smtp
 */
function SettingsAccountCredentialsCard(domNode, mode, args) {
  this.domNode = domNode;
  this.account = args.account;

  var connInfoContainer =
    domNode.getElementsByClassName('tng-account-connInfo-container')[0];

  domNode.getElementsByClassName('tng-account-header-label')[0]
    .textContent = this.account.name;

  domNode.getElementsByClassName('tng-back-btn')[0]
    .addEventListener('click', this.onBack.bind(this), false);

  domNode.getElementsByClassName('tng-account-save')[0]
    .addEventListener('click', this.onClickSave.bind(this), false);

  var usernameNodeInput =
    this.domNode.getElementsByClassName('tng-server-username-input')[0];
  this.passwordNodeInput =
    this.domNode.getElementsByClassName('tng-server-password-input')[0];

  usernameNodeInput.value = this.account.username;
}
SettingsAccountCredentialsCard.prototype = {
  onBack: function() {
    Cards.removeCardAndSuccessors(this.domNode, 'animate', 1);
  },

  onClickSave: function() {
    var password = this.passwordNodeInput.value;

    if (password) {
      this.account.modifyAccount({password: password});
      this.account.clearProblems();
    } else {
      alert(mozL10n.get('settings-password-empty'));
    }

    this.onBack();
  },

  die: function() {
  }
};
Cards.defineCardWithDefaultMode(
    'settings-account-credentials',
    { tray: false },
    SettingsAccountCredentialsCard
);

/**
 * Per-account server settings, it can be activesync or imap+smtp
 */
function SettingsAccountServerCard(domNode, mode, args) {
  this.domNode = domNode;
  this.account = args.account;
  this.server = args.account.servers[args.index];

  var connInfoContainer =
    domNode.getElementsByClassName('tng-account-connInfo-container')[0];

  domNode.getElementsByClassName('tng-account-header-label')[0]
    .textContent = this.account.name;

  domNode.getElementsByClassName('tng-back-btn')[0]
    .addEventListener('click', this.onBack.bind(this), false);

  domNode.getElementsByClassName('tng-account-save')[0]
    .addEventListener('click', this.onBack.bind(this), false);

  domNode.getElementsByClassName('tng-account-server-label')[0]
    .textContent = mozL10n.get('settings-' + this.server.type + '-label');

  var hostnameNodeInput =
    this.domNode.getElementsByClassName('tng-server-hostname-input')[0];
  var portNodeInput =
    this.domNode.getElementsByClassName('tng-server-port-input')[0];

  // activesync stores its data in 'server'
  hostnameNodeInput.value = this.server.connInfo.hostname ||
                            this.server.connInfo.server;
  // port is meaningless for activesync; display empty value
  portNodeInput.value = this.server.connInfo.port || '';
}
SettingsAccountServerCard.prototype = {
  onBack: function() {
    Cards.removeCardAndSuccessors(this.domNode, 'animate', 1);
  },

  die: function() {
  }
};
Cards.defineCardWithDefaultMode(
    'settings-account-servers',
    { tray: false },
    SettingsAccountServerCard
);

/**
 * Quasi-secret card for troubleshooting/debugging support.  Not part of the
 * standard UX flow, potentially not to be localized, and potentially not to
 * be shipped after initial dogfooding.
 */
function SettingsDebugCard(domNode, mode, args) {
  this.domNode = domNode;

  domNode.getElementsByClassName('tng-close-btn')[0]
    .addEventListener('click', this.onClose.bind(this), false);

  // - hookup buttons
  domNode.getElementsByClassName('tng-dbg-reset')[0]
    .addEventListener('click', window.location.reload.bind(window.location),
                      false);

  domNode.getElementsByClassName('tng-dbg-dump-storage')[0]
    .addEventListener('click', this.dumpLog.bind(this, 'storage'), false);

  this.loggingButton = domNode.getElementsByClassName('tng-dbg-logging')[0];
  this.dangerousLoggingButton =
    domNode.getElementsByClassName('tng-dbg-dangerous-logging')[0];

  this.loggingButton.addEventListener(
    'click', this.cycleLogging.bind(this, true, true), false);
  this.dangerousLoggingButton.addEventListener(
    'click', this.cycleLogging.bind(this, true, 'dangerous'), false);
  this.cycleLogging(false);

  // - hookup
}
SettingsDebugCard.prototype = {
  onClose: function() {
    Cards.removeCardAndSuccessors(this.domNode, 'animate', 1);
  },

  dumpLog: function(target) {
    MailAPI.debugSupport('dumpLog', target);
  },

  cycleLogging: function(doChange, changeValue) {
    var value = MailAPI.config.debugLogging;
    if (doChange) {
      if (changeValue === true)
        value = !value;
      // only upgrade to dangerous from enabled...
      else if (changeValue === 'dangerous' && value === true)
        value = 'dangerous';
      else if (changeValue === 'dangerous' && value === 'dangerous')
        value = true;
      // (ignore dangerous button if not enabled)
      else
        return;
      MailAPI.debugSupport('setLogging', value);
    }
    var label, dangerLabel;
    if (value === true) {
      label = 'Logging is ENABLED; toggle';
      dangerLabel = 'Logging is SAFE; toggle';
    }
    else if (value === 'dangerous') {
      label = 'Logging is ENABLED; toggle';
      dangerLabel = 'Logging DANGEROUSLY ENTRAINS USER DATA; toggle';
    }
    else {
      label = 'Logging is DISABLED; toggle';
      dangerLabel = '(enable logging to access this secret button)';
    }
    this.loggingButton.textContent = label;
    this.dangerousLoggingButton.textContent = dangerLabel;
  },

  die: function() {
  }
};
Cards.defineCardWithDefaultMode(
    'settings-debug',
    { tray: false },
    SettingsDebugCard
);

