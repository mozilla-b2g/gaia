/*global define */
define(function(require) {

var templateNode = require('tmpl!./account_picker.html'),
    fldAccountItemNode = require('tmpl!./fld/account_item.html'),
    common = require('mail_common'),
    Cards = common.Cards,
    bindContainerHandler = common.bindContainerHandler;

/**
 * Account picker card
 */
function AccountPickerCard(domNode, mode, args) {
  this.domNode = domNode;

  this.curAccount = args.curAccount;
  this.acctsSlice = args.acctsSlice;
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

  // since the slice is already populated, generate a fake notification
  this.onAccountsSplice(0, 0, this.acctsSlice.items, true, false);
}

AccountPickerCard.prototype = {
  nextCards: ['settings_main'],

  die: function() {
    // Since this card is destroyed when hidden,
    // detach listeners from the acctSlice.
    if (this.acctsSlice) {
      this.acctsSlice.onsplice = null;
      this.acctsSlice.onchange = null;
    }
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
                        null : accountsContainer.children[index],
        self = this;
    addedItems.forEach(function(account) {
      var accountNode = account.element =
        fldAccountItemNode.cloneNode(true);
      accountNode.account = account;
      self.updateAccountDom(account, true);
      accountsContainer.insertBefore(accountNode, insertBuddy);
    });
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

    if (account === this.curAccount) {
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
    var oldAccount = this.curAccount,
        account = this.curAccount = accountNode.account;

    if (oldAccount !== account) {
      var folderCard = Cards.findCardObject(['folder_picker', 'navigation']);
      folderCard.cardImpl.updateAccount(account);
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
