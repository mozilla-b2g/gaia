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

  var nextButton = domNode.getElementsByClassName('sup-info-next-btn')[0];
  nextButton.addEventListener('click', this.onNext.bind(this), false);

  // placeholders need to be translated; they aren't automatically done
  // XXX actually, can we just have the l10n use ".placeholder"?
  this.nameNode = this.domNode.getElementsByClassName('sup-info-name')[0];
  this.nameNode.setAttribute('placeholder',
                             mozL10n.get('setup-info-name-placeholder'));
  this.emailNode = this.domNode.getElementsByClassName('sup-info-email')[0];
  this.emailNode.setAttribute('placeholder',
                              mozL10n.get('setup-info-email-placeholder'));
  // XXX this should maybe be a magic separate label?
  this.emailNode.value = args.serviceDef.domain;
  this.passwordNode =
    this.domNode.getElementsByClassName('sup-info-password')[0];
  this.passwordNode.setAttribute(
    'placeholder', mozL10n.get('setup-info-password-placeholder'));

  // XXX testing, fake account
  if (args.serviceDef.domain === 'example.com') {
    this.nameNode.value = 'John Madeup';
    this.emailNode.value = 'john@example.com';
    this.passwordNode.value = 'secret!sosecret!';
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
      {});
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
        account = msgSlice.items[i];
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
      accountNode.getElementsByClassName('tng-account-item-label')[0]
        .textContent = account.name;
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
      {});
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
}
SettingsAccountCard.prototype = {
};
Cards.defineCardWithDefaultMode(
    'settings-account',
    { tray: false },
    SettingsAccountCard
);

/**
 * Quasi-secret card for troubleshooting/debugging support.  Not part of the
 * standard UX flow, potentially not to be localized, and potentially not to
 * be shipped after initial dogfooding.
 */
function SettingsDebugCard(domNode, mode, args) {
}
SettingsDebugCard.prototype = {
};
Cards.defineCardWithDefaultMode(
    'settings-debug',
    { tray: false },
    SettingsDebugCard
);

