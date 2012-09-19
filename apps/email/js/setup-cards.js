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
    domain: 'gmail.com',
  },
  {
    name: 'OtheR EmaiL',
    l10nId: 'setup-other-email',
    domain: ''
  },
  {
    name: 'Fake Account',
    l10nId: null,
    domain: 'example.com'
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
          serviceNode = supNodes['service-choice'].cloneNode(true);
      if (serviceDef.l10nId)
        serviceNode.textContent = mozL10n.get(serviceDef.l10nId);
      else
        serviceNode.textContent = serviceDef.name;
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
        name: this.nameNode.value,
        emailAddress: this.emailNode.value,
        password: this.passwordNode.value
      });
  },
  onInfoInput: function(event) {
    var nameValid = this.nameNode.classList.contains('collapsed') ||
                    this.nameNode.value.length > 0;
    var emailValid = this.emailNode.classList.contains('collapsed') ||
                     this.emailNode.value.length > 0;
    var passwordValid = this.passwordNode.classList.contains('collapsed') ||
                        this.passwordNode.value.length > 0;
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
 * Show a spinner until success, or errors when there is failure.
 */
function SetupProgressCard(domNode, mode, args) {
  this.domNode = domNode;

  var backButton = domNode.getElementsByClassName('sup-back-btn')[0];
  backButton.addEventListener('click', this.onBack.bind(this), false);

  var self = this;
  this.creationInProcess = true;
  MailAPI.tryToCreateAccount(
    {
      displayName: args.name,
      emailAddress: args.emailAddress,
      password: args.password
    },
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

  onCreationError: function(err) {
    this.domNode.getElementsByClassName('sup-progress-region')[0]
        .classList.add('collapsed');
    this.domNode.getElementsByClassName('sup-error-region')[0]
        .classList.remove('collapsed');
    var errorMessageNode =
      this.domNode.getElementsByClassName('sup-error-message')[0];

    // XXX use the error message to key the right localized explanation
    // For now, we just show the error code.
    errorMessageNode.textContent = err;
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
    App.showMessageViewOrSetup();
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

  this.accountsContainer =
    domNode.getElementsByClassName('tng-accounts-container')[0];
  bindContainerClickAndHold(this.accountsContainer,
                            this.onClickAccount.bind(this),
                            this.onHoldAccount.bind(this));

  domNode.getElementsByClassName('tng-account-add')[0]
    .addEventListener('click', this.onClickAddAccount.bind(this), false);

  this._secretButtonClickCount = 0;
  this._secretButtonTimer = null;
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

  onClickAccount: function(accountNode, event) {
    // XXX we would show account settings if we had any...
  },

  onHoldAccount: function(accountNode, event) {
    Cards.popupMenuForNode(
      tngNodes['account-menu'].cloneNode(true), accountNode,
      ['menu-item'],
      function(clickedNode) {
        if (!clickedNode)
          return;

        switch (clickedNode.classList[0]) {
          case 'tng-account-menu-delete':
            // Delete the account and re-do the startup process again in order
            // to avoid having to deal with either of the following annoying
            // complexities specially:
            // - The user deleted the last account!
            // - The user delete the account that was being displayed
            accountNode.account.deleteAccount();
            Cards.removeCardAndSuccessors(null, 'none');
            App.showMessageViewOrSetup();
            break;
        }
      });

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

  // ActiveSync, IMAP and SMTP are protocol names, no need to be localized
  domNode.getElementsByClassName('tng-account-type')[0].textContent =
    (this.account.type === 'activesync') ? 'ActiveSync' : 'IMAP+SMTP';

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

