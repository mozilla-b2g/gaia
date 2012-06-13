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
    domain: '',
  },
  {
    name: 'Fake Account',
    l10nId: null,
    domain: 'example.com',
  }
];

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
        serviceDef: serviceDef,
      });
  },

  die: function() {
  },
};
Cards.defineCard({
  name: 'setup-pick-service',
  modes: {
    default: {
      tray: false
    },
  },
  constructor: SetupPickServiceCard,
});

function SetupAccountInfoCard(domNode, mode, args) {
  this.domNode = domNode;

  var backButton = domNode.getElementsByClassName('sup-back-btn')[0];
  backButton.addEventListener('click', this.onBack.bind(this), false);

  var nextButton = domNode.getElementsByClassName('sup-info-next-btn')[0];
  nextButton.addEventListener('click', this.onNext.bind(this), false);

  // placeholders need to be translated; they aren't automatically done
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
    this.passwordNode.value= 'secret!sosecret!';
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
        password: this.passwordNode.value,
      });
  },

  die: function() {
  },
};
Cards.defineCard({
  name: 'setup-account-info',
  modes: {
    default: {
      tray: false
    },
  },
  constructor: SetupAccountInfoCard,
});

function SetupProgressCard(domNode, mode, args) {
  var backButton = domNode.getElementsByClassName('sup-back-btn')[0];
  backButton.addEventListener('click', this.onBack.bind(this), false);

  var self = this;
  this.creationInProcess = true;
  MailAPI.tryToCreateAccount(
    {
      displayName: args.name,
      emailAddress: args.emailAddress,
      password: args.password,
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
  },
};
Cards.defineCard({
  name: 'setup-progress',
  modes: {
    default: {
      tray: false
    },
  },
  constructor: SetupProgressCard,
});

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
  },
};
Cards.defineCard({
  name: 'setup-done',
  modes: {
    default: {
      tray: false
    },
  },
  constructor: SetupDoneCard,
});
