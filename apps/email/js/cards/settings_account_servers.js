/**
 * Per-account server settings, it can be activesync, imap+smtp, or
 * pop3+smtp
 */
'use strict';
define(function(require) {

var mozL10n = require('l10n!'),
    cards = require('cards');

return [
  require('./base_card')
         (require('template!./settings_account_servers.html')),
  {
    onArgs: function(args) {
      this.account = args.account;
      this.server = args.account.servers[args.index];

      this.headerLabel.textContent = this.account.name;

      mozL10n.setAttributes(this.serverLabel,
                            'settings-' + this.server.type + '-label');

      // activesync stores its data in 'server'
      this.hostnameNodeInput.value = this.server.connInfo.hostname ||
                                this.server.connInfo.server;
      // port is meaningless for activesync; display empty value
      this.portNodeInput.value = this.server.connInfo.port || '';
    },

    onBack: function() {
      cards.removeCardAndSuccessors(this, 'animate', 1);
    },

    die: function() {
    }
  }
];
});
