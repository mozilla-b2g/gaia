/**
 * Card definitions/logic for the folder navigation / picker for move targets.
 **/

const FOLDER_DEPTH_CLASSES = [
    'fld-folder-depth0',
    'fld-folder-depth1',
    'fld-folder-depth2',
    'fld-folder-depth3',
    'fld-folder-depth4',
    'fld-folder-depth5',
    'fld-folder-depthmax'
  ];

function FolderPickerCard(domNode, mode, args) {
  this.domNode = domNode;

  this.foldersSlice = args.foldersSlice;
  this.foldersSlice.onsplice = this.onFoldersSplice.bind(this);

  this.curAccount = args.curAccount;
  this.curFolder = args.curFolder;

  this.acctsSlice = args.acctsSlice;
  this.acctsSlice.onsplice = this.onAccountsSplice.bind(this);

  this.accountsContainer =
    domNode.getElementsByClassName('fld-accounts-container')[0];
  bindContainerHandler(this.accountsContainer, 'click',
                       this.onClickAccount.bind(this));

  this.foldersContainer =
    domNode.getElementsByClassName('fld-folders-container')[0];
  bindContainerHandler(this.foldersContainer, 'click',
                       this.onClickFolder.bind(this));

  this.accountButton = domNode.getElementsByClassName('fld-accounts-btn')[0];
  this.accountButton
    .addEventListener('click', this.onShowHideAccounts.bind(this), false);
  domNode.getElementsByClassName('fld-nav-settings-btn')[0]
    .addEventListener('click', this.onShowSettings.bind(this), false);

  // - DOM!
  this.updateSelfDom();
  // since the slice is already populated, generate a fake notification
  this.onAccountsSplice(0, 0, this.acctsSlice.items, true, false);
  this.onFoldersSplice(0, 0, this.foldersSlice.items, true, false);
}
FolderPickerCard.prototype = {
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
        fldNodes['account-item'].cloneNode(true);
      accountNode.account = account;
      self.updateAccountDom(account, true);
      accountsContainer.insertBefore(accountNode, insertBuddy);
    });
  },

  updateAccountDom: function(account, firstTime) {
    var accountNode = account.element;

    if (firstTime) {
      accountNode.getElementsByClassName('fld-account-name')[0]
        .textContent = account.name;
    }

    if (account === this.curAccount)
      accountNode.classList.add('fld-account-selected');
    else
      accountNode.classList.remove('fld-account-selected');

    // XXX unread count stuff once it exists
  },

  /**
   * Clicking a different account changes the list of folders displayed.  We
   * then trigger a select of the inbox for that account because otherwise
   * things get permutationally complex.
   */
  onClickAccount: function(accountNode, event) {
    var oldAccount = this.curAccount,
        account = this.curAccount = accountNode.account;

    this.updateSelfDom();
    if (oldAccount !== account) {
      // change selection status
      this.updateAccountDom(oldAccount);
      this.updateAccountDom(account);

      // kill the old slice and its related DOM
      this.foldersSlice.die();
      this.foldersContainer.innerHTML = '';

      // stop the user from doing anything until we load the folders for the
      // account and then transition to our card.
      Cards.eatEventsUntilNextCard();

      // load the folders for the account
      this.foldersSlice = MailAPI.viewFolders('account', account);
      this.foldersSlice.onsplice = this.onFoldersSplice.bind(this);
      // T will cause the splice handler to select the inbox for us; we do
      // this in the splice handler rather than in oncomplete because the splice
      // handler happens first and creates the DOM, and so this way it will set
      // the selection to be reflected in the DOM from the get-go.
      this.curFolder = null;
    }

    this.accountsContainer.classList.remove('show');
    this.foldersContainer.classList.add('show');
  },

  onShowHideAccounts: function() {
    this.accountsContainer.classList.toggle('show');
    this.foldersContainer.classList.toggle('show');
    var isAccount = this.accountsContainer.classList.contains('show');
    // Update header title
    this.updateSelfDom(isAccount);
  },

  onShowSettings: function() {
    Cards.pushCard(
      'settings-main', 'default', 'animate', {}, 'left');
  },

  onFoldersSplice: function(index, howMany, addedItems,
                             requested, moreExpected) {
    // automatically select the inbox if this is an oncomplete case and we have
    // no selected folder.
    if (!this.curFolder && !moreExpected) {
      // Now that we can populate ourselves, move to us.
      Cards.moveToCard(this);

      // Also, get the folder card started because of the tray visibility issue.
      this.curFolder = this.foldersSlice.getFirstFolderWithType('inbox',
                                                                addedItems);
      this._showFolder(this.curFolder);
    }

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
      var folderNode = folder.element = fldNodes['folder-item'].cloneNode(true);
      folderNode.folder = folder;
      self.updateFolderDom(folder, true);
      foldersContainer.insertBefore(folderNode, insertBuddy);
    });
  },

  updateSelfDom: function(isAccount) {
    var str = isAccount ? navigator.mozL10n.get('settings-account-section') :
      this.curAccount.name;
    this.domNode.getElementsByClassName('fld-folders-header-account-label')[0]
      .textContent = str;

    // Update header button icon status with title name.
    var icon = this.accountButton.firstElementChild;
    if (isAccount) {
      icon.classList.remove('icon-account');
      icon.classList.add('icon-back');
    } else {
      icon.classList.remove('icon-back');
      icon.classList.add('icon-account');
    }
  },

  updateFolderDom: function(folder, firstTime) {
    var folderNode = folder.element;

    if (firstTime) {
      if (!folder.selectable)
        folderNode.classList.add('fld-folder-unselectable');

      var depthIdx = Math.min(FOLDER_DEPTH_CLASSES.length - 1, folder.depth);
      folderNode.classList.add(FOLDER_DEPTH_CLASSES[depthIdx]);

      folderNode.getElementsByClassName('fld-folder-name')[0]
        .textContent = folder.name;
    }

    if (folder === this.curFolder)
      folderNode.classList.add('fld-folder-selected');
    else
      folderNode.classList.remove('fld-folder-selected');

    // XXX do the unread count stuff once we have that info
  },

  onClickFolder: function(folderNode, event) {
    var folder = folderNode.folder;
    if (!folder.selectable)
      return;

    var oldFolder = this.curFolder;
    this.curFolder = folder;
    this.updateFolderDom(oldFolder);
    this.updateFolderDom(folder);

    this._showFolder(folder);
    this.accountsContainer.classList.remove('show');
    Cards.moveToCard(['message-list', 'default']);
  },

  /**
   * Tell the message-list to show this folder; exists for single code path.
   */
  _showFolder: function(folder) {
    Cards.tellCard(['message-list', 'default'], { folder: folder });
  },

  /**
   * Our card is going away; perform all cleanup except destroying our DOM.
   * This will enable the UI to animate away from our card without weird
   * graphical glitches.
   */
  die: function() {
  }
};
Cards.defineCard({
  name: 'folder-picker',
  modes: {
    // Navigation mode acts like a tray
    navigation: {
      tray: true
    },
    movetarget: {
      tray: false
    }
  },
  constructor: FolderPickerCard
});

