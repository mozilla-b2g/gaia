'use strict';
define(function(require) {

var tngAccountSettingsServerNode =
                             require('tmpl!./tng/account_settings_server.html'),
    tngAccountDeleteConfirmNode =
                              require('tmpl!./tng/account_delete_confirm.html'),
    evt = require('evt'),
    mozL10n = require('l10n!'),
    cards = require('cards'),
    ConfirmDialog = require('confirm_dialog');


return [
  require('./base')(require('template!./settings_account.html')),
  require('./account_prefs_mixins'),
  {

    onArgs: function(args) {
      this.account = args.account;

      this.headerLabel.textContent = args.account.name;

      this._bindPrefs('tng-account-check-interval', 'tng-notify-mail');

      var identity = this.account.identities[0];
      this.accountNameNode.textContent =
                               (identity && identity.name) || this.account.name;

      // ActiveSync, IMAP and SMTP are protocol names, no need to be localized
      this.accountTypeNode.textContent =
        (this.account.type === 'activesync') ? 'ActiveSync' :
        (this.account.type === 'imap+smtp') ? 'IMAP+SMTP' : 'POP3+SMTP';

      // Handle default account checkbox. If already a default, then the
      // checkbox cannot be unchecked. The default is changed by going to an
      // account that is not the default and checking that checkbox.
      if (this.account.isDefault) {
        this.defaultInputNode.disabled = true;
        this.defaultInputNode.checked = true;
      } else {
        this.defaultLabelNode.addEventListener('click',
                                      this.onChangeDefaultAccount.bind(this),
                                      false);
      }

      if (this.account.type === 'activesync') {
        this.synchronizeNode.value = this.account.syncRange;
      } else {
        this.syncSettingNode.style.display = 'none';
      }

      this.account.servers.forEach(function(server, index) {
        var serverNode = tngAccountSettingsServerNode.cloneNode(true);
        var serverLabel =
          serverNode.getElementsByClassName('tng-account-server-label')[0];

        serverLabel.textContent = mozL10n.get('settings-' +
                                              server.type + '-label');
        serverLabel.addEventListener('click',
          this.onClickServers.bind(this, index), false);

        this.serversContainer.appendChild(serverNode);
      }.bind(this));
    },

    onBack: function() {
      cards.removeCardAndSuccessors(this, 'animate', 1);
    },

    onClickCredentials: function() {
      cards.pushCard(
        'settings_account_credentials', 'animate',
        {
          account: this.account
        },
        'right');
    },

    onClickServers: function(index) {
      cards.pushCard(
        'settings_account_servers', 'animate',
        {
          account: this.account,
          index: index
        },
        'right');
    },

    onChangeDefaultAccount: function(event) {
      event.stopPropagation();
      if (event.preventBubble) {
        event.preventBubble();
      }

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
  }
];
});
