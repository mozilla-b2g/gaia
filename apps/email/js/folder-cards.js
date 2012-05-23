/**
 * Card definitions/logic for the folder navigation / picker for move targets.
 **/

function FolderPickerCard(domNode, mode, args) {
  this.domNode = domNode;

  this.acctsSlice = args.acctsSlice;
  this.acctsSlice.onsplice = this.onAccountsSplice.bind(this);

  this.foldersSlice = args.foldersSlice;
  this.foldersSlice.onsplice = this.onFoldersSplice.bind(this);

  this.curAccount = args.curAccount;
  this.curFolder = args.curFolder;

  this.accountsContainer =
    domNode.getElementsByClassName('fld-accounts-container')[0];
  bindContainerHandler(this.accountsContainer, 'click',
                       this.onClickAccount.bind(this));

  this.foldersContainer =
    domNode.getElementsByClassName('fld-folders-container')[0];
  bindContainerHandler(this.foldersContainer, 'click',
                       this.onClickFolder.bind(this));
}
FolderPickerCard.prototype = {
  onAccountsSplice: function(index, howMany, addedItems,
                             requested, moreExpected) {
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
   *
   * UXXX get signoff on this behavior (e-mail out)
   */
  onClickAccount: function(accountNode, event) {
    if (accountNode.account === this.curAccount)
      return;
    var oldAccount = this.curAccount,
        account = this.curAccount = accountNode;

    // change selection status
    this.updateAccountDom(oldAccount);
    this.updateAccountDom(account);

    // kill the old slice and its related DOM
    this.foldersSlice.kill();
    this.foldersContainer.innerHTML = '';

    // stop the user from doing anything until we load the folders for the
    // account
    Cards.eatEventsUntilNextCard();

    // load the folders for the account
    this.foldersSlice = MailAPI.viewFolders('account', account);
    this.foldersSlice.onsplice = this.onFoldersSplice.bind(this);
    // T will cause the splice handler to select the inbox for us; we do
    // this in the splice handler rather than in oncomplete because the splice
    // handler happens first and creates the DOM, and so this way it will set
    // the selection to be reflected in the DOM from the get-go.
    this.curFolder = null;
  },

  onFoldersSplice: function(index, howMany, addedItems,
                             requested, moreExpected) {
    // automatically select the inbox if this is an oncomplete case and we have
    // no selected folder.
    if (!this.curFolder && !moreExpected) {
      // okay, the user can do things again now that our fast-async query has
      // completed.
      Cards.stopEatingEvents();
      this.curFolder = this.foldersSlice.getFirstFolderWithType('inbox');
      this._showFolder(this.curFolder);
    }

    var foldersContainer = this.foldersContainer;

    var folder;
    if (howMany) {
      for (var i = index + howMany - 1; i >= index; i--) {
        folder = msgSlice.items[i];
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

  updateFolderDom: function(folder, firstTime) {
    var folderNode = folder.element;

    if (firstTime) {
      if (!folder.selectable)
        folder.classList.add('fld-folder-unselectable');

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
  },

  /**
   * Tell the message-list to show this folder; exists for single code path.
   */
  _showFolder: function(folder) {
    Cards.tellCard('message-list', 'default', { folder: folder });
  },

  /**
   * Our card is going away; perform all cleanup except destroying our DOM.
   * This will enable the UI to animate away from our card without weird
   * graphical glitches.
   */
  die: function() {
  },
};
Cards.defineCard({
  name: 'folder-picker',
  modes: {
    // Navigation mode acts like a tray
    navigation: {
      tray: true,
    },
    movetarget: {
      tray: false,
    },
  },
  constructor: FolderPickerCard
});
