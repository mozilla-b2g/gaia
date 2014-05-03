/*global define*/
'use strict';
define(function(require) {

var tngAccountItemNode = require('tmpl!./tng/account_item.html'),
    MailAPI = require('api'),
    cards = require('cards');

return [
  require('./base')(require('template!./settings_main.html')),
  {
    createdCallback: function() {
      this.acctsSlice = MailAPI.viewAccounts(false);
      this.acctsSlice.onsplice = this.onAccountsSplice.bind(this);

      this._secretButtonClickCount = 0;
      this._secretButtonTimer = null;
    },

    extraClasses: ['anim-vertical', 'anim-overlay'],

    //nextCards: ['setup_account_info', 'settings_account'],

    onClose: function() {
      cards.removeCardAndSuccessors(this, 'animate', 1, 1);
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
          tngAccountItemNode.cloneNode(true);
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

    onClickAddAccount: function() {
      cards.pushCard(
        'setup_account_info', 'animate',
        {
          allowBack: true
        },
        'right');
    },

    onClickEnterAccount: function(account) {
      cards.pushCard(
        'settings_account', 'animate',
        {
          account: account
        },
        'right');
    },

    onClickSecretButton: function() {
      if (this._secretButtonTimer === null) {
        this._secretButtonTimer = window.setTimeout(
          function() {
            this._secretButtonTimer = null;
            this._secretButtonClickCount = 0;
          }.bind(this), 2000);
      }

      if (++this._secretButtonClickCount >= 5) {
        window.clearTimeout(this._secretButtonTimer);
        this._secretButtonTimer = null;
        this._secretButtonClickCount = 0;
        cards.pushCard('settings_debug', 'animate', {}, 'right');
      }
    },

    die: function() {
      this.acctsSlice.die();
    }
  }
];
});
