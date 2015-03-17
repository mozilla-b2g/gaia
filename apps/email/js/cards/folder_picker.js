/*global define */
'use strict';
define(function(require) {

var fldFolderItemNode = require('tmpl!./fld/folder_item.html'),
    fldAccountItemNode = require('tmpl!./fld/account_item.html'),
    FOLDER_DEPTH_CLASSES = require('folder_depth_classes'),
    cards = require('cards'),
    model = require('model'),
    evt = require('evt'),
    transitionEnd = require('transition_end');

require('css!style/folder_cards');

return [
  require('./base')(require('template!./folder_picker.html')),
  {
    createdCallback: function() {
      this.bindContainerHandler(this.foldersContainer, 'click',
                                this.onClickFolder.bind(this));

      this.updateAccount = this.updateAccount.bind(this);
      model.latest('account', this.updateAccount);

      this.bindContainerHandler(this.accountListContainer, 'click',
                                this.onClickAccount.bind(this));

      transitionEnd(this, this.onTransitionEnd.bind(this));

      // If more than one account, need to show the account dropdown
      var accountCount = model.getAccountCount();
      if (accountCount > 1) {
        this.classList.remove('one-account');
        // Set up size needed to handle translation animation for showing
        // accounts later.
        this.currentAccountContainerHeight = this.accountHeader
                                             .getBoundingClientRect().height *
                                             accountCount;
        this.hideAccounts();
      }

      this.acctsSlice = model.api.viewAccounts(false);
      this.acctsSlice.onsplice = this.onAccountsSplice.bind(this);
      this.acctsSlice.onchange = this.onAccountsChange.bind(this);
    },

    extraClasses: ['anim-vertical', 'anim-overlay', 'one-account'],

    onShowSettings: function(event) {
      cards.pushCard('settings_main', 'animate');
    },

    /**
     * Clicking a different account changes the list of folders displayed.  We
     * then trigger a select of the inbox for that account because otherwise
     * things get permutationally complex.
     */
    updateAccount: function(account) {
      var oldAccount = this.curAccount;

      this.mostRecentSyncTimestamp = 0;

      if (oldAccount !== account) {
        this.foldersContainer.innerHTML = '';

        model.latestOnce('folder', function(folder) {
          this.curAccount = account;

          // - DOM!
          // update header
          this.querySelector('.fld-acct-header-account-label')
              .textContent = account.name;

          // If no current folder, means this is the first startup, do some
          // work to populate the
          if (!this.curFolder) {
            this.curFolder = folder;
          }

          // Clean up any old bindings.
          if (this.foldersSlice) {
            this.foldersSlice.onsplice = null;
            this.foldersSlice.onchange = null;
          }

          this.foldersSlice = model.foldersSlice;

          // since the slice is already populated, generate a fake notification
          this.onFoldersSplice(0, 0, this.foldersSlice.items, true, false);

          // Listen for changes in the foldersSlice.
          // TODO: perhaps slices should implement an event listener
          // interface vs. only allowing one handler. This is slightly
          // dangerous in that other cards may access model.foldersSlice
          // and could decide to set these handlers, wiping these ones
          // out. However, so far folder_picker is the only one that cares
          // about these dynamic updates.
          this.foldersSlice.onsplice = this.onFoldersSplice.bind(this);
        }.bind(this));
      }
    },

    /**
     * Tapping a different account will jump to the inbox for that
     * account, but only do the jump if a new account selection,
     * and only after hiding the folder_picker.
     */
    onClickAccount: function(accountNode, event) {
      var oldAccountId = this.curAccount.id,
          accountId = accountNode.account.id;

      this.curAccount = accountNode.account;

      if (oldAccountId !== accountId) {
        // Store the ID and wait for the closing animation to finish
        // for the card before switching accounts, so that the
        // animations are smoother and have fewer jumps.
        this._waitingAccountId = accountId;
        this._closeCard();
      }
    },

    toggleAccounts: function() {
      // During initial setup, to get the sizes right for animation later,
      // the translateY was modified. During that time, do not want animation,
      // but now for toggling the display/hiding based on user action, enable
      // it.
      var hadAnimated = this.fldAcctContainer.classList.contains('animated');
      if (!hadAnimated) {
        this.fldAcctContainer.classList.add('animated');
        // Trigger acknowledgement of the transition by causing a reflow
        // for account container element.
        this.fldAcctContainer.clientWidth;
      }

      if (this.accountHeader.classList.contains('closed')) {
        this.showAccounts();
      } else {
        this.hideAccounts();
      }
    },

    /**
     * Use a translateY transition to show accounts. But to do that correctly,
     * need to use the height of the account listing. The scroll inner needs
     * to be updated too, so that it does not cut off some of the folders.
     */
    showAccounts: function() {
      var height = this.currentAccountContainerHeight;
      this.fldAcctScrollInner.style.height = (height +
                   this.foldersContainer.getBoundingClientRect().height) + 'px';
      this.fldAcctContainer.style.transform = 'translateY(0)';

      this.accountHeader.classList.remove('closed');
    },

    /**
     * Use a translateY transition to hide accounts. But to do that correctly,
     * need to use the height of the account listing. The scroll inner needs to
     * be updated too, so that it form-fits over the folder list.
     */
    hideAccounts: function() {
      var foldersHeight = this.foldersContainer.getBoundingClientRect().height;
      if (foldersHeight) {
        this.fldAcctScrollInner.style.height = foldersHeight + 'px';
      }
      this.fldAcctContainer.style.transform = 'translateY(-' +
                           this.currentAccountContainerHeight +
                           'px)';

      this.accountHeader.classList.add('closed');
    },

    /**
     * Used to populate the account list.
     */
    onAccountsSplice: function(index, howMany, addedItems,
                               requested, moreExpected) {
      var accountListContainer = this.accountListContainer;

      // Note! We get called before the splice() is run on this.acctsSlice.items
      var postSliceCount = this.acctsSlice.items.length +
                           addedItems.length - howMany;

      this.classList.toggle('one-account', postSliceCount <= 1);

      // Clear out accounts that have been removed
      var account;
      if (howMany) {
        for (var i = index + howMany - 1; i >= index; i--) {
          account = this.acctsSlice.items[i];
          if (account.element) {
            accountListContainer.removeChild(account.element);
          }
        }
      }

      var insertBuddy = (index >= accountListContainer.childElementCount) ?
                          null : accountListContainer.children[index];

      // Add DOM for each account
      addedItems.forEach(function(account) {
        var accountNode = account.element =
          fldAccountItemNode.cloneNode(true);
        accountNode.account = account;
        this.updateAccountDom(account, true);
        accountListContainer.insertBefore(accountNode, insertBuddy);
      }.bind(this));

      // Use the accountHeader as a unit of height and multiple
      // by the number of children, to get total height needed for
      // all accounts. Doing this instead of measuring the height
      // for accountListContainer, since to get a good measurement
      // needs to not be display none, which could introduce a flash
      // of seeing the element.
      this.currentAccountContainerHeight = this.accountHeader
                                           .getBoundingClientRect().height *
                                           accountListContainer.children.length;
      // Recalculate heights needed to properly hide the accounts.
      this.hideAccounts();
    },

    onAccountsChange: function(account) {
      this.updateAccountDom(account, false);
    },

    updateAccountDom: function(account, firstTime) {
      var accountNode = account.element;

      if (firstTime) {
        accountNode.querySelector('.fld-account-name')
          .textContent = account.name;

        // Highlight the account currently in use
        if (this.curAccount && this.curAccount.id === account.id) {
          accountNode.classList.add('fld-account-selected');
        }
      }
    },

    onFoldersSplice: function(index, howMany, addedItems,
                               requested, moreExpected) {
      var foldersContainer = this.foldersContainer;

      var folder;
      if (howMany) {
        for (var i = index + howMany - 1; i >= index; i--) {
          folder = this.foldersSlice.items[i];
          foldersContainer.removeChild(folder.element);
        }
      }

      var insertBuddy = (index >= foldersContainer.childElementCount) ?
                          null : foldersContainer.children[index],
          self = this;
      addedItems.forEach(function(folder) {
        var folderNode = folder.element = fldFolderItemNode.cloneNode(true);
        folderNode.folder = folder;
        self.updateFolderDom(folder, true);
        foldersContainer.insertBefore(folderNode, insertBuddy);
      });
    },

    updateFolderDom: function(folder, firstTime) {
      var folderNode = folder.element;

      if (firstTime) {
        if (!folder.selectable) {
          folderNode.classList.add('fld-folder-unselectable');
        }

        var depthIdx = Math.min(FOLDER_DEPTH_CLASSES.length - 1, folder.depth);
        folderNode.classList.add(FOLDER_DEPTH_CLASSES[depthIdx]);
        if (depthIdx > 0) {
          folderNode.classList.add('fld-folder-depthnonzero');
        }

        folderNode.querySelector('.fld-folder-name')
          .textContent = folder.name;
        folderNode.dataset.type = folder.type;
      }

      if (folder === this.curFolder) {
        folderNode.classList.add('fld-folder-selected');
      } else {
        folderNode.classList.remove('fld-folder-selected');
      }

      // XXX do the unread count stuff once we have that info
    },

    onClickFolder: function(folderNode, event) {
      var folder = folderNode.folder;
      if (!folder.selectable) {
        return;
      }

      var oldFolder = this.curFolder;
      this.curFolder = folder;
      this.updateFolderDom(oldFolder);
      this.updateFolderDom(folder);

      this._showFolder(folder);
      this._closeCard();
    },

    onTransitionEnd: function(event) {
      // If this is an animation for the content closing, then
      // it means the card should be removed now.
      if (!this.classList.contains('opened') &&
          event.target.classList.contains('fld-content')) {
        cards.removeCardAndSuccessors(this, 'none');

        // After card is removed, then switch the account, to provide
        // smooth animation on closing of drawer.
        if (this._waitingAccountId) {
          model.changeAccountFromId(this._waitingAccountId, function() {
            model.selectInbox();
          });
          this._waitingAccountId = null;
        }
      }
    },

    // Closes the card. Relies on onTransitionEnd to do the
    // final close, this just sets up the closing transition.
    _closeCard: function() {
      evt.emit('folderPickerClosing');
      this.classList.remove('opened');
    },

    /**
     * Tell the message-list to show this folder; exists for single code path.
     */
    _showFolder: function(folder) {
      model.changeFolder(folder);
    },

    /**
     * When the card is visible, start the animations to show the content
     * and fade in the tap shield.
     */
    onCardVisible: function() {
      this.classList.add('opened');
    },

    /**
     * Our card is going away; perform all cleanup except destroying our DOM.
     * This will enable the UI to animate away from our card without weird
     * graphical glitches.
     */
    die: function() {
      this.acctsSlice.die();
      model.removeListener('account', this.updateAccount);
    }
  }
];
});
