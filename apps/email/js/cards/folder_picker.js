/*global define */
define(function(require) {

var templateNode = require('tmpl!./folder_picker.html'),
    // a normal folder
    fldFolderItemNode = require('tmpl!./fld/folder_item.html'),
    // a folder that has an empty trash icon
    fldFolderTrashyItemNode = require('tmpl!./fld/folder_trashy_item.html'),
    emptyTrashConfirmMsgNode = require('tmpl!./fld/empty_trash_confirm.html'),
    FOLDER_DEPTH_CLASSES = require('folder_depth_classes'),
    common = require('mail_common'),
    date = require('date'),
    model = require('model'),
    mozL10n = require('l10n!'),
    Cards = common.Cards,
    bindContainerHandler = common.bindContainerHandler,
    ConfirmDialog = common.ConfirmDialog;

require('css!style/folder_cards');

function FolderPickerCard(domNode, mode, args) {
  this.domNode = domNode;

  this.foldersContainer =
    domNode.getElementsByClassName('fld-folders-container')[0];
  bindContainerHandler(this.foldersContainer, 'click',
                       this.onClickFolder.bind(this));

  this.accountButton = domNode.getElementsByClassName('fld-accounts-btn')[0];
  this.accountButton
    .addEventListener('click', this.onShowAccounts.bind(this), false);
  domNode.getElementsByClassName('fld-nav-settings-btn')[0]
    .addEventListener('click', this.onShowSettings.bind(this), false);

  this.toolbarAccountProblemNode =
    domNode.getElementsByClassName('fld-nav-account-problem')[0];
  this.lastSyncedAtNode =
    domNode.getElementsByClassName('fld-nav-last-synced-value')[0];

  this._boundUpdateAccount = this.updateAccount.bind(this);
  model.latest('account', this._boundUpdateAccount);
}
FolderPickerCard.prototype = {
  nextCards: ['settings_main', 'account_picker'],

  onShowSettings: function() {
    Cards.pushCard(
      'settings_main', 'default', 'animate', {}, 'left');
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
      date.setPrettyNodeDate(this.lastSyncedAtNode);

      model.latestOnce('folder', function(folder) {
        this.curAccount = account;

        // - DOM!
        this.updateSelfDom();

        // update header
        this.domNode
            .getElementsByClassName('fld-folders-header-account-label')[0]
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
        this.foldersSlice.onchange = this.onFoldersChange.bind(this);
      }.bind(this));
    }
  },
  onShowAccounts: function() {
    if (!this.curAccount)
      return;

    // Add account picker before this folder list.
    Cards.pushCard(
      'account_picker', 'navigation', 'animate',
      {
        curAccountId: this.curAccount.id
      },
      // Place to left of message list
      'left');
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

    var dirtySyncTime = false;
    var insertBuddy = (index >= foldersContainer.childElementCount) ?
                        null : foldersContainer.children[index],
        self = this;
    addedItems.forEach(function(folder) {
      // The node that has its selection state set
      var containerNode;
      // The node that we set the name, type, and indentation on
      var folderNode;

      // Is this a folder that we provide 'empty trash' functionality for?
      if (folder.type === 'trash' && folder.accountType === 'pop3+smtp') {
        containerNode = fldFolderTrashyItemNode.cloneNode(true);
        folderNode =
          containerNode.getElementsByClassName('fld-trashy-folder-item')[0];
      }
      else {
        containerNode = folderNode = fldFolderItemNode.cloneNode(true);
      }

      // We only need to manipulate the selected status of the container from
      // here on out, and for click purposes we only care about the container
      // too.
      folder.element = containerNode;
      containerNode.folder = folder;
      if (!folder.selectable)
        containerNode.classList.add('fld-folder-unselectable');

      var depthIdx = Math.min(FOLDER_DEPTH_CLASSES.length - 1, folder.depth);
      folderNode.classList.add(FOLDER_DEPTH_CLASSES[depthIdx]);

      folderNode.getElementsByClassName('fld-folder-name')[0]
        .textContent = folder.name;
      folderNode.dataset.type = folder.type;

      self.updateFolderDom(folder);
      foldersContainer.insertBefore(containerNode, insertBuddy);

      if (self.mostRecentSyncTimestamp < folder.lastSyncedAt) {
        self.mostRecentSyncTimestamp = folder.lastSyncedAt;
        dirtySyncTime = true;
      }
    });
    if (dirtySyncTime)
      this.updateLastSyncedUI();
  },

  onFoldersChange: function(folder) {
    if (this.mostRecentSyncTimestamp < folder.lastSyncedAt) {
      this.mostRecentSyncTimestamp = folder.lastSyncedAt;
      this.updateLastSyncedUI();
    }
  },

  updateLastSyncedUI: function() {
    if (this.mostRecentSyncTimestamp) {
      date.setPrettyNodeDate(this.lastSyncedAtNode,
                             this.mostRecentSyncTimestamp);
    } else {
      this.lastSyncedAtNode.textContent = mozL10n.get('account-never-synced');
    }
  },

  updateSelfDom: function(isAccount) {
    var str = isAccount ? mozL10n.get('settings-account-section') :
      this.curAccount.name;
    this.domNode.getElementsByClassName('fld-folders-header-account-label')[0]
      .textContent = str;

    // Update account problem status
    if (this.curAccount.problems.length)
      this.toolbarAccountProblemNode.classList.remove('collapsed');
    else
      this.toolbarAccountProblemNode.classList.add('collapsed');
  },

  updateFolderDom: function(folder, firstTime) {
    var containerNode = folder.element;

    if (folder === this.curFolder)
      containerNode.classList.add('fld-folder-selected');
    else
      containerNode.classList.remove('fld-folder-selected');

    // XXX do the unread count stuff once we have that info
  },

  _confirmEmptyTrash: function(folder) {
    var dialog = emptyTrashConfirmMsgNode.cloneNode(true);
    ConfirmDialog.show(dialog,
      { // Confirm
        id: 'fld-empty-trash-ok',
        handler: function() {
          console.log('Emptying trash folder:', folder.path, 'type:',
                      folder.type);
          folder.emptyFolder();
        }.bind(this)
      },
      { // Cancel
        id: 'fld-empty-trash-cancel',
        handler: null
      }
    );
  },

  onClickFolder: function(folderContainerNode, event) {
    // bindContainerHandler is telling us the node whose immediate parent is
    // the container DOM node.  For normal folders, this is just what we
    // think of as the folderNode when adding, but for trashy folders, it's
    // the containerNode.
    var folder = folderContainerNode.folder;
    if (!folder.selectable)
      return;

    // A click on the empty trash button (even with its expanded hit area) will
    // still resolve to the folderContainerNode of the trash folder.  But
    // we can check the original click target for being the empty trash button.
    // Note that we set pointer-events: none on the icon so that the target
    // can't possibly be the stupid icon.
    if (event.target.classList.contains('fld-folder-empty-trash')) {
      this._confirmEmptyTrash(folder);
      return;
    }

    var oldFolder = this.curFolder;
    this.curFolder = folder;
    this.updateFolderDom(oldFolder);
    this.updateFolderDom(folder);

    this._showFolder(folder);
    Cards.moveToCard(['message_list', 'nonsearch']);
  },

  /**
   * Tell the message-list to show this folder; exists for single code path.
   */
  _showFolder: function(folder) {
    model.changeFolder(folder);
  },

  /**
   * Our card is going away; perform all cleanup except destroying our DOM.
   * This will enable the UI to animate away from our card without weird
   * graphical glitches.
   */
  die: function() {
    model.removeListener('account', this._boundUpdateAccount);
  }
};
Cards.defineCard({
  name: 'folder_picker',
  modes: {
    // Navigation mode acts like a tray
    navigation: {
      tray: true
    },
    movetarget: {
      tray: false
    }
  },
  constructor: FolderPickerCard,
  templateNode: templateNode
});

return FolderPickerCard;
});
