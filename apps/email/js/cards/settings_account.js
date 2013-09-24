/*global define*/
define(function(require) {

var templateNode = require('tmpl!./settings_account.html'),
    tngAccountSettingsServerNode =
                             require('tmpl!./tng/account_settings_server.html'),
    tngAccountDeleteConfirmNode =
                              require('tmpl!./tng/account_delete_confirm.html'),
    evt = require('evt'),
    common = require('mail_common'),
    model = require('model'),
    mozL10n = require('l10n!'),
    prefsMixin = require('./account_prefs_mixins'),
    mix = require('mix'),
    Cards = common.Cards,
    ConfirmDialog = common.ConfirmDialog;

/**
 * Per-account settings, maybe some metadata.
 */
function SettingsAccountCard(domNode, mode, args) {
  this.domNode = domNode;
  this.account = args.account;

  var serversContainer = this.nodeFromClass('tng-account-server-container');

  this.nodeFromClass('tng-account-header-label').
       textContent = args.account.name;

  this._bindPrefs('tng-account-check-interval', 'tng-notify-mail');

  this.nodeFromClass('tng-back-btn')
    .addEventListener('click', this.onBack.bind(this), false);

  this.nodeFromClass('tng-account-delete')
    .addEventListener('click', this.onDelete.bind(this), false);

  var identity = this.account.identities[0];
  this.nodeFromClass('tng-account-name').
       textContent = (identity && identity.name) || this.account.name;

  // ActiveSync, IMAP and SMTP are protocol names, no need to be localized
  this.nodeFromClass('tng-account-type').textContent =
    (this.account.type === 'activesync') ? 'ActiveSync' :
    (this.account.type === 'imap+smtp') ? 'IMAP+SMTP' : 'POP3+SMTP';

  // Handle default account checkbox. If already a default, then the
  // checkbox cannot be unchecked. The default is changed by going to an
  // account that is not the default and checking that checkbox.
  this.defaultLabelNode = this.nodeFromClass('tng-default-label');
  this.defaultInputNode = this.nodeFromClass('tng-default-input');
  if (this.account.isDefault) {
    this.defaultInputNode.disabled = true;
    this.defaultInputNode.checked = true;
  } else {
    this.defaultLabelNode.addEventListener('click',
                                  this.onChangeDefaultAccount.bind(this),
                                  false);
  }

  if (this.account.type === 'activesync') {
    var synchronizeNode = this.nodeFromClass('tng-account-synchronize');
    synchronizeNode.value = this.account.syncRange;
    synchronizeNode.addEventListener(
      'change', this.onChangeSynchronize.bind(this), false);
  } else {
    this.nodeFromClass('synchronize-setting').style.display = 'none';
  }

  this.account.servers.forEach(function(server, index) {
    var serverNode = tngAccountSettingsServerNode.cloneNode(true);
    var serverLabel =
      serverNode.getElementsByClassName('tng-account-server-label')[0];

    serverLabel.textContent = mozL10n.get('settings-' + server.type + '-label');
    serverLabel.addEventListener('click',
      this.onClickServers.bind(this, index), false);

    serversContainer.appendChild(serverNode);
  }.bind(this));

  this.nodeFromClass('tng-account-credentials')
    .addEventListener('click', this.onClickCredentials.bind(this), false);
}
SettingsAccountCard.prototype = {
  onBack: function() {
    Cards.removeCardAndSuccessors(this.domNode, 'animate', 1);
  },

  onClickCredentials: function() {
    Cards.pushCard(
      'settings_account_credentials', 'default', 'animate',
      {
        account: this.account
      },
      'right');
  },

  onClickServers: function(index) {
    Cards.pushCard(
      'settings_account_servers', 'default', 'animate',
      {
        account: this.account,
        index: index
      },
      'right');
  },

  onChangeDefaultAccount: function(event) {
    event.stopPropagation();
    if (event.preventBubble)
      event.preventBubble();

    if (!this.defaultInputNode.disabled) {
      this.defaultInputNode.disabled = true;
      this.defaultInputNode.checked = true;
      this.account.modifyAccount({ setAsDefault: true });
    }
  },

  onChangeSynchronize: function(event) {
    this.account.modifyAccount({syncRange: event.target.value});
  },

  onDelete: function() {
    var account = this.account;

    var dialog = tngAccountDeleteConfirmNode.cloneNode(true);
    var content = dialog.getElementsByTagName('p')[0];
    content.textContent = mozL10n.get('settings-account-delete-prompt',
                                      { account: account.name });
    ConfirmDialog.show(dialog,
      { // Confirm
        id: 'account-delete-ok',
        handler: function() {
          account.deleteAccount();
          evt.emit('accountDeleted', account);
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

// Wire up some common pref handlers.
mix(SettingsAccountCard.prototype, prefsMixin);

Cards.defineCardWithDefaultMode(
    'settings_account',
    { tray: false },
    SettingsAccountCard,
    templateNode
);

return SettingsAccountCard;
});
