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
    'setup_manual_config',
    { tray: false },
    SetupManualConfig,
    templateNode
);

return SetupManualConfig;
});
