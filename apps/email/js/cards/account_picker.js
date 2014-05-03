/*global define */
'use strict';
define(function(require) {

var fldAccountItemNode = require('tmpl!./fld/account_item.html'),
    date = require('date'),
    model = require('model'),
    cards = require('cards');

return [
  require('./base')(require('template!./account_picker.html')),
  {
    createdCallback: function(domNode, mode, args) {
      this.acctsSlice = model.api.viewAccounts(false);
      this.acctsSlice.onsplice = this.onAccountsSplice.bind(this);
      this.acctsSlice.onchange = this.onAccountsChange.bind(this);

      this.bindContainerHandler(this.accountsContainer, 'click',
                           this.onClickAccount.bind(this));
    },

    onArgs: function(args) {
      this.curAccountId = args.curAccountId;
    },

    extraClasses: ['anim-overlay'],

    nextCards: ['settings_main'],

    die: function() {
      this.acctsSlice.die();
    },

    onShowSettings: function() {
      cards.pushCard(
        'settings_main', 'animate', {}, 'left');
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
                          null : accountsContainer.children[index];

      addedItems.forEach(function(account) {
        var accountNode = account.element =
          fldAccountItemNode.cloneNode(true);
        accountNode.account = account;
        this.updateAccountDom(account, true);
        accountsContainer.insertBefore(accountNode, insertBuddy);

        //fetch last sync date for display
        this.fetchLastSyncDate(account,
                     accountNode.querySelector('.fld-account-lastsync-value'));
      }.bind(this));
    },

    fetchLastSyncDate: function(account, node) {
      var foldersSlice = model.api.viewFolders('account', account);
      foldersSlice.oncomplete = (function() {
        var inbox = foldersSlice.getFirstFolderWithType('inbox'),
            lastSyncTime = inbox && inbox.lastSyncedAt;

        if (lastSyncTime) {
          date.setPrettyNodeDate(node, lastSyncTime);
        }
        foldersSlice.die();
      }).bind(this);
    },

    onHideAccounts: function() {
      cards.removeCardAndSuccessors(this, 'animate', 1, 'folder_picker');
    },

    onAccountsChange: function(account) {
      this.updateAccountDom(account, false);
    },

    updateAccountDom: function(account, firstTime) {
      var accountNode = account.element;

      if (firstTime) {
        accountNode.getElementsByClassName('fld-account-name')[0]
          .textContent = account.name;
      }

      if (account.id === this.curAccountId) {
        accountNode.classList.add('fld-account-selected');
      }
      else {
        accountNode.classList.remove('fld-account-selected');
      }
    },

    /**
     * Clicking a different account changes the list of folders displayed.  We
     * then trigger a select of the inbox for that account because otherwise
     * things get permutationally complex.
     */
    onClickAccount: function(accountNode, event) {
      var oldAccountId = this.curAccountId,
          accountId = this.curAccountId = accountNode.account.id;

      if (oldAccountId !== accountId) {
        model.changeAccountFromId(accountId);
      }

      this.onHideAccounts();
    }

  }
];

});
