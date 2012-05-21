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


}
FolderPickerCard.prototype = {
  onAccountsSplice: function(index, howMany, addedItems,
                             requested, moreExpected) {
  },
  onFoldersSplice: function(index, howMany, addedItems,
                             requested, moreExpected) {
    var folder;
    if (howMany) {
      for (var i = index + howMany - 1; i >= index; i--) {
        folder = msgSlice.items[i];
        folder.element.parentNode.removeChild(folder.element);
      }
    }

    var insertBuddy = (index >= nodes.folders.childElementCount) ?
                        null : nodes.folders.children[index];
    addedItems.forEach(function(folder) {
      folder.element =
      nodes.folders.insertBefore(folder.element, insertBuddy);
      if (folder.selectable) {
        // (we don't actually need a closure)
        folder.element.addEventListener('click', function() {
            nodes.folderScreen.hidden = true;
            mail.mailScreen(folder);
          }, false);
      }
    });
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
