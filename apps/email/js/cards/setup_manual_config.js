/*global define*/
define(function(require) {

var templateNode = require('tmpl!./setup_manual_config.html'),
    common = require('mail_common'),
    SetupAccountInfoCard = require('./setup_account_info'),
    Cards = common.Cards,
    FormNavigation = common.FormNavigation;

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
    composite: {},
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


  this.formItems.composite.hostname = domNode.getElementsByClassName(
    'sup-manual-composite-hostname')[0];
  this.formItems.composite.port = domNode.getElementsByClassName(
    'sup-manual-composite-port')[0];
  this.formItems.composite.socket = domNode.getElementsByClassName(
    'sup-manual-composite-socket')[0];
  this.formItems.composite.username = domNode.getElementsByClassName(
    'sup-manual-composite-username')[0];

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

  this.requireFields('composite', true);
  this.requireFields('smtp', true);
  this.requireFields('activeSync', false);

  this.formItems.composite.socket.addEventListener(
    'change', this.onChangeCompositeSocket.bind(this));
  this.formItems.smtp.socket.addEventListener(
    'change', this.onChangeSmtpSocket.bind(this));

  this.onChangeAccountType({target: this.accountTypeNode});

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

    if (config.type === 'imap+smtp' || config.type === 'pop3+smtp') {
      config.incoming = {
        hostname: this.formItems.composite.hostname.value,
        port: this.formItems.composite.port.value,
        socketType: this.formItems.composite.socket.value,
        username: this.formItems.composite.username.value
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
      'setup_progress', 'default', 'animate',
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
    var compositeSection = this.domNode.getElementsByClassName(
      'sup-manual-composite')[0];
    var activeSyncSection = this.domNode.getElementsByClassName(
      'sup-manual-activesync')[0];
    var isComposite = (event.target.value === 'imap+smtp' ||
                       event.target.value === 'pop3+smtp');
    var isImap = event.target.value === 'imap+smtp';

    if (isComposite) {
      compositeSection.classList.remove('collapsed');
      activeSyncSection.classList.add('collapsed');
      this.domNode.getElementsByClassName(
        'sup-manual-imap-title')[0].classList.toggle('collapsed', !isImap);
      this.domNode.getElementsByClassName(
        'sup-manual-pop3-title')[0].classList.toggle('collapsed', isImap);
    }
    else {
      compositeSection.classList.add('collapsed');
      activeSyncSection.classList.remove('collapsed');
    }

    this.requireFields('composite', isComposite);
    this.requireFields('smtp', isComposite);
    this.requireFields('activeSync', !isComposite);
    this.onChangeCompositeSocket({target: this.formItems.composite.socket});
  },

  // If the user selects a different socket type, autofill the most likely port.
  onChangeCompositeSocket: function(event) {
    var isImap = this.accountTypeNode.value === 'imap+smtp';
    var SSL_VALUE = (isImap ? '993' : '995');
    var STARTTLS_VALUE = (isImap ? '143' : '110');
    var socketType = event.target.value;
    var portField = this.formItems.composite.port;
    if (socketType === 'SSL') {
      portField.value = SSL_VALUE;
    } else if (socketType == 'STARTTLS') {
      portField.value = STARTTLS_VALUE;
    }
  },

  onChangeSmtpSocket: function(event) {
    const SSL_VALUE = '465';
    const STARTTLS_VALUE = '587';
    var socketType = event.target.value;
    var portField = this.formItems.smtp.port;
    if (socketType === 'SSL' && portField.value === STARTTLS_VALUE) {
      portField.value = SSL_VALUE;
    } else if (socketType == 'STARTTLS' && portField.value == SSL_VALUE) {
      portField.value = STARTTLS_VALUE;
    }
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
    'setup_manual_config',
    { tray: false },
    SetupManualConfig,
    templateNode
);

return SetupManualConfig;
});
