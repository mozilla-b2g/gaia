/*global define */
define(function(require) {

var templateNode = require('tmpl!./account_picker.html'),
    fldAccountItemNode = require('tmpl!./fld/account_item.html'),
    date = require('date'),
    common = require('mail_common'),
    model = require('model'),
    Cards = common.Cards,
    bindContainerHandler = common.bindContainerHandler;

/**
 * Account picker card
 */
function AccountPickerCard(domNode, mode, args) {
  this.domNode = domNode;

  this.curAccountId = args.curAccountId;

  this.acctsSlice = model.api.viewAccounts(false);
  this.acctsSlice.onsplice = this.onAccountsSplice.bind(this);
  this.acctsSlice.onchange = this.onAccountsChange.bind(this);

  this.accountsContainer =
    domNode.getElementsByClassName('acct-list-container')[0];
  bindContainerHandler(this.accountsContainer, 'click',
                       this.onClickAccount.bind(this));

  domNode.getElementsByClassName('fld-accounts-btn')[0]
    .addEventListener('click', this.onHideAccounts.bind(this), false);

  domNode.getElementsByClassName('fld-nav-settings-btn')[0]
    .addEventListener('click', this.onShowSettings.bind(this), false);
}

AccountPickerCard.prototype = {
  nextCards: ['settings_main'],

  die: function() {
    this.acctsSlice.die();
  },

  onShowSettings: function() {
    Cards.pushCard(
      'settings_main', 'default', 'animate', {}, 'left');
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
    Cards.removeCardAndSuccessors(this.domNode, 'animate', 1,
                                  ['folder_picker', 'navigation']);
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
};

Cards.defineCard({
  name: 'account_picker',
  modes: {
    // Navigation mode acts like a tray
    navigation: {
      tray: true
    },
    movetarget: {
      tray: false
    }
  },
  constructor: AccountPickerCard,
  templateNode: templateNode
});

return AccountPickerCard;
});
