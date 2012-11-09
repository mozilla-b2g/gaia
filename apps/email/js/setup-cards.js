'use strict';
/**
 * Card definitions/logic for adding accounts, changing accounts, and
 * generally managing our settings.
 **/

/**
 * List of specifically called out services.  This should be the list of the
 * most popular services for the region the e-mail client is being used in,
 * based on locale or build settings.  It might make sense to break this out
 * into a separate JS file that is loaded along those lines.
 */
var MAIL_SERVICES = [
  // XXX fill these in once enough stuff is working...
  {
    name: 'HotmaiL AccounT',
    l10nId: 'setup-hotmail-account',
    domain: 'hotmail.com',
    hideDisplayName: true
  },
  {
    name: 'GmaiL AccounT',
    l10nId: 'setup-gmail-account',
    domain: 'gmail.com'
  },
  {
    name: 'OtheR EmaiL',
    l10nId: 'setup-other-email',
    domain: ''
  }
];

/**
 * Pick which provider to use / other.
 */
function SetupPickServiceCard(domNode, mode, args) {
  this.domNode = domNode;

  // The back button should only be enabled if there is at least one other
  // account already in existence.
  if (args.allowBack) {
    var backButton = domNode.getElementsByClassName('sup-back-btn')[0];
    backButton.addEventListener('click', this.onBack.bind(this), false);
    backButton.classList.remove('collapsed');
  }

  this.servicesContainer =
    domNode.getElementsByClassName('sup-services-container')[0];
  bindContainerHandler(this.servicesContainer, 'click',
                       this.onServiceClick.bind(this));

  this._populateServices();
}
SetupPickServiceCard.prototype = {
  _populateServices: function() {
    for (var i = 0; i < MAIL_SERVICES.length; i++) {
      var serviceDef = MAIL_SERVICES[i],
          serviceNode = supNodes['service-choice'].cloneNode(true),
          serviceLabel =
            serviceNode.getElementsByClassName('sup-service-choice-label')[0];

      if (serviceDef.l10nId)
        serviceLabel.textContent = mozL10n.get(serviceDef.l10nId);
      else
        serviceLabel.textContent = serviceDef.name;
      serviceNode.serviceDef = serviceDef;

      this.servicesContainer.appendChild(serviceNode);
    }
  },

  onBack: function(event) {
    // nuke this card.
    Cards.removeCardAndSuccessors(null, 'none');
    // Trigger the startup logic again to show the already existing account.
    App.showMessageViewOrSetup();
  },

  onServiceClick: function(serviceNode, event) {
    var serviceDef = serviceNode.serviceDef;

    Cards.pushCard(
      'setup-account-info', 'default', 'animate',
      {
        serviceDef: serviceDef
      });
  },

  die: function() {
  }
};
Cards.defineCardWithDefaultMode(
    'setup-pick-service',
     { tray: false },
    SetupPickServiceCard
);

/**
 * Enter basic account info card (name, e-mail address, password) to try and
 * autoconfigure an account.
 */
function SetupAccountInfoCard(domNode, mode, args) {
  this.domNode = domNode;

  var backButton = domNode.getElementsByClassName('sup-back-btn')[0];
  backButton.addEventListener('click', this.onBack.bind(this), false);

  this.nextButton = domNode.getElementsByClassName('sup-info-next-btn')[0];
  this.nextButton.addEventListener('click', this.onNext.bind(this), false);

  // placeholders need to be translated; they aren't automatically done
  // XXX actually, can we just have the l10n use ".placeholder"?
  this.nameNode = this.domNode.getElementsByClassName('sup-info-name')[0];
  this.nameNode.setAttribute('placeholder',
                             mozL10n.get('setup-info-name-placeholder'));
  if (args.serviceDef.hideDisplayName)
    this.nameNode.classList.add('collapsed');

  this.emailNode = this.domNode.getElementsByClassName('sup-info-email')[0];
  this.emailNode.setAttribute('placeholder',
                              mozL10n.get('setup-info-email-placeholder'));
  // XXX this should maybe be a magic separate label?
  this.emailNode.value = args.serviceDef.domain;

  this.passwordNode =
    this.domNode.getElementsByClassName('sup-info-password')[0];
  this.passwordNode.setAttribute(
    'placeholder', mozL10n.get('setup-info-password-placeholder'));

  // Add input event handler to prevent user submit empty name or password.
  this.emailNode.addEventListener('input', this.onInfoInput.bind(this));
  this.nameNode.addEventListener('input', this.onInfoInput.bind(this));
  this.passwordNode.addEventListener('input', this.onInfoInput.bind(this));

  // XXX testing, fake account
  if (args.serviceDef.domain === 'example.com') {
    this.nameNode.value = 'John Madeup';
    this.emailNode.value = 'john@example.com';
    this.passwordNode.value = 'secret!sosecret!';
    this.nextButton.disabled = false;
  }
}
SetupAccountInfoCard.prototype = {
  onBack: function(event) {
    Cards.removeCardAndSuccessors(this.domNode, 'animate');
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
        password: this.passwordNode.value
      });
  },
  onInfoInput: function(event) {
    var nameValid = this.nameNode.classList.contains('collapsed') ||
                    this.nameNode.checkValidity();
    var emailValid = this.emailNode.classList.contains('collapsed') ||
                     this.emailNode.checkValidity();
    var passwordValid = this.passwordNode.classList.contains('collapsed') ||
                        this.passwordNode.checkValidity();
    this.nextButton.disabled = !(nameValid && emailValid && passwordValid);
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
  this.args = args;

  var backButton = domNode.getElementsByClassName('sup-back-btn')[0];
  backButton.addEventListener('click', this.onBack.bind(this), false);

  var nextButton = domNode.getElementsByClassName('sup-manual-next-btn')[0];
  nextButton.addEventListener('click', this.onNext.bind(this), false);

  this.accountTypeNode = domNode.getElementsByClassName(
    'sup-manual-account-type')[0];
  this.accountTypeNode.addEventListener(
    'change', this.onChangeAccountType.bind(this), false);

  this.imapHostnameNode = domNode.getElementsByClassName(
    'sup-manual-imap-hostname')[0];
  this.imapHostnameNode.setAttribute('placeholder',
     mozL10n.get('setup-manual-hostname-placeholder'));

  this.imapPortNode = domNode.getElementsByClassName(
    'sup-manual-imap-port')[0];
  this.imapPortNode.setAttribute('placeholder',
     mozL10n.get('setup-manual-port-placeholder'));

  this.imapSocketNode = domNode.getElementsByClassName(
    'sup-manual-imap-socket')[0];

  this.imapUsernameNode = domNode.getElementsByClassName(
    'sup-manual-imap-username')[0];
  this.imapUsernameNode.setAttribute('placeholder',
     mozL10n.get('setup-manual-username-placeholder'));


  this.smtpHostnameNode = domNode.getElementsByClassName(
    'sup-manual-smtp-hostname')[0];
  this.smtpHostnameNode.setAttribute('placeholder',
     mozL10n.get('setup-manual-hostname-placeholder'));

  this.smtpPortNode = domNode.getElementsByClassName(
    'sup-manual-smtp-port')[0];
  this.smtpPortNode.setAttribute('placeholder',
     mozL10n.get('setup-manual-port-placeholder'));

  this.smtpSocketNode = domNode.getElementsByClassName(
    'sup-manual-smtp-socket')[0];

  this.smtpUsernameNode = domNode.getElementsByClassName(
    'sup-manual-smtp-username')[0];
  this.smtpUsernameNode.setAttribute('placeholder',
     mozL10n.get('setup-manual-username-placeholder'));


  this.activeSyncHostnameNode = domNode.getElementsByClassName(
    'sup-manual-activesync-hostname')[0];
  this.activeSyncHostnameNode.setAttribute('placeholder',
     mozL10n.get('setup-manual-hostname-placeholder'));
}
SetupManualConfig.prototype = {
  onBack: function(event) {
    Cards.removeCardAndSuccessors(this.domNode, 'animate');
  },

  onNext: function(event) {
    var config = { type: this.accountTypeNode.value };

    if (config.type === 'imap+smtp') {
      config.incoming = {
        hostname: this.imapHostnameNode.value,
        port: this.imapPortNode.value,
        socketType: this.imapSocketNode.value,
        username: this.imapUsernameNode.value
      };
      config.outgoing = {
        hostname: this.smtpHostnameNode.value,
        port: this.smtpPortNode.value,
        socketType: this.smtpSocketNode.value,
        username: this.smtpUsernameNode.value
      };
    }
    else { // config.type === 'activesync'
      config.incoming = {
        server: 'https://' + this.activeSyncHostnameNode.value
      };
    }

    // The progress card is the dude that actually tries to create the account.
    Cards.pushCard(
      'setup-progress', 'default', 'animate',
      {
        displayName: this.args.displayName,
        emailAddress: this.args.emailAddress,
        password: this.args.password,

        domainInfo: config
      });
  },

  onChangeAccountType: function(event) {
    var imapSmtpSection = this.domNode.getElementsByClassName(
      'sup-manual-imap-smtp')[0];
    var activeSyncSection = this.domNode.getElementsByClassName(
      'sup-manual-activesync')[0];

    if (event.target.value === 'imap+smtp') {
      imapSmtpSection.classList.remove('collapsed');
      activeSyncSection.classList.add('collapsed');
    }
    else {
      imapSmtpSection.classList.add('collapsed');
      activeSyncSection.classList.remove('collapsed');
    }
  },

  die: function() {
  }
};
Cards.defineCardWithDefaultMode(
    'setup-manual-config',
    { tray: false },
    SetupManualConfig
);

/**
 * Show a spinner until success, or errors when there is failure.
 */
function SetupProgressCard(domNode, mode, args) {
  this.domNode = domNode;
  this.args = args;

  var backButton = domNode.getElementsByClassName('sup-back-btn')[0];
  backButton.addEventListener('click', this.onBack.bind(this), false);

  var manualConfig = domNode.getElementsByClassName('sup-manual-config-btn')[0];
  manualConfig.addEventListener('click', this.onClickManualConfig.bind(this),
                                false);


  var self = this;
  this.creationInProcess = true;
  MailAPI.tryToCreateAccount(
    {
      displayName: args.displayName,
      emailAddress: args.emailAddress,
      password: args.password
    },
    args.domainInfo || null,
    function(err) {
      self.creationInProcess = false;
      if (err)
        self.onCreationError(err);
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
    Cards.removeCardAndSuccessors(this.domNode, 'animate');
  },

  onClickManualConfig: function() {
    // The progress card is the dude that actually tries to create the account.
    Cards.pushCard(
      'setup-manual-config', 'default', 'animate',
      this.args
    );
  },

  onCreationError: function(err) {
    this.domNode.getElementsByClassName('sup-progress-region')[0]
        .classList.add('collapsed');
    this.domNode.getElementsByClassName('sup-error-region')[0]
        .classList.remove('collapsed');
    var errorMessageNode =
      this.domNode.getElementsByClassName('sup-error-message')[0];

    // Attempt to get a user-friendly string for the error we got. If we can't
    // find a match, just show the "unknown error" string.
    var unknownErrorStr = mozL10n.get('setup-error-unknown');
    var errorStr = mozL10n.get('setup-error-' + err, null, unknownErrorStr);
    errorMessageNode.textContent = errorStr;
  },

  onCreationSuccess: function() {
    // nuke the current card stack, replace them with the done card.
    Cards.removeCardAndSuccessors(null, 'none');
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
    // Nuke this card
    Cards.removeCardAndSuccessors(null, 'none');
    // Show the first setup card again.
    // XXX add a mode that makes it possible to escape from account creation
    // given that the user has an account now.
    Cards.pushCard(
      'setup-pick-service', 'default', 'immediate',
      {
        allowBack: true
      });
  },
  onShowMail: function() {
    // Nuke this card
    Cards.removeCardAndSuccessors(null, 'none');
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
  this.passwordNode.setAttribute(
    'placeholder', mozL10n.get('setup-info-password-placeholder'));
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
    Cards.removeCardAndSuccessors(this.domNode, 'animate', 1,
                                  ['folder-picker', 'navigation']);
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
    // We want to tear down all cards and divert to the add flow; it will
    // re-create the standard stack once the addition cycle completes.
    Cards.removeCardAndSuccessors(null, 'none');
    Cards.pushCard(
      'setup-pick-service', 'default', 'immediate',
      {
        allowBack: true
      });
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
    CustomDialog.show(
      null,
      mozL10n.get('settings-account-delete-prompt', { account: account.name }),
      {
        title: mozL10n.get('settings-account-delete-cancel'),
        callback: function() {
          CustomDialog.hide();
        }
      },
      {
        title: mozL10n.get('settings-account-delete-confirm'),
        callback: function() {
          account.deleteAccount();
          CustomDialog.hide();
          Cards.removeCardAndSuccessors(null, 'none');
          App.showMessageViewOrSetup();
        }
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
    .addEventListener('click', this.onBack.bind(this), false);

  var usernameNodeInput =
    this.domNode.getElementsByClassName('tng-server-username-input')[0];
  usernameNodeInput.setAttribute('placeholder',
                                 mozL10n.get('settings-username'));
  this.passwordNodeInput =
    this.domNode.getElementsByClassName('tng-server-password-input')[0];
  this.passwordNodeInput.setAttribute('placeholder',
                                      mozL10n.get('settings-password'));

  usernameNodeInput.value = this.account.username;
  this.passwordNodeInput.value = '********';
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
  hostnameNodeInput.setAttribute('placeholder',
                                 mozL10n.get('settings-hostname'));
  var portNodeInput =
    this.domNode.getElementsByClassName('tng-server-port-input')[0];
  portNodeInput.setAttribute('placeholder',
                                 mozL10n.get('settings-port'));

  hostnameNodeInput.value = this.server.connInfo.hostname;
  portNodeInput.value = this.server.connInfo.port;
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

