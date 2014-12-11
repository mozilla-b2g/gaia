'use strict';

(function(exports) {
  const EDIT_MODE_SCALE = 0.536;


  function Edit() {}

  Edit.prototype = {
    mainSection: document.getElementById('main-section'),
    doneButton: document.getElementById('done-button'),
    searchButton: document.getElementById('search-button'),
    addNewFolderButton: document.getElementById('add-new-folder-button'),
    editButton: document.getElementById('edit-button'),
    settingsButton: document.getElementById('settings-button'),

    regularNavElements: undefined,
    editNavElements: undefined,

    init: function(spatialNavigator, cardManager, cardScrollable) {
      this.spatialNavigator = spatialNavigator;
      this.cardManager = cardManager;
      this.cardScrollable = cardScrollable;

      this.regularNavElements =
              [this.searchButton, this.settingsButton, this.editButton];
      this.editNavElements = [this.doneButton, this.addNewFolderButton];

      this.cardManager.on('card-swapped', this.onCardSwapped.bind(this));

    },
    /**
     * State of home app looks like this:
     * (normal state)<-->Edit mode<-->Arrange mode
     * (Only adjacant states are switchable)
     */
    toggleEditMode: function() {
      if (this.mainSection.dataset.mode === 'edit') {
        this.mainSection.dataset.mode = '';
        this.spatialNavigator.multiAdd(this.regularNavElements);
        this.spatialNavigator.multiRemove(this.editNavElements);
        this.spatialNavigator.focus(this.editButton);
        this.cardScrollable.setScale();
      } else {
        this.mainSection.dataset.mode = 'edit';
        this.spatialNavigator.multiRemove(this.regularNavElements);
        this.spatialNavigator.multiAdd(this.editNavElements);
        this.spatialNavigator.focus(this.cardScrollable);
        this.cardScrollable.setScale(EDIT_MODE_SCALE);
      }
    },
    toggleArrangeMode: function() {
      if (this.mainSection.dataset.mode === 'edit') {
        this.mainSection.dataset.mode = 'arrange';
      } else if (this.mainSection.dataset.mode == 'arrange') {
        this.mainSection.dataset.mode = 'edit';
      }
    },

    onCardSwapped: function(card1, card2, idx1, idx2) {
      this.cardScrollable.swap(idx1, idx2);
    },

    onMove: function(key) {
      if (this.mode !== 'arrange') {
        return false;
      }

      var focus = this.spatialNavigator.getFocusedElement();
      if (focus.CLASS_NAME === 'XScrollable') {
        var targetItem = focus.getTargetItem(key);
        if (targetItem) {
          this.cardManager.swapCard(
            this.cardManager.findCardFromCardList(
                                    {cardId: focus.currentItem.dataset.cardId}),
            this.cardManager.findCardFromCardList(
                                    {cardId: targetItem.dataset.cardId}));
        }
      }
      return true;
    },

    addNewFolder: function() {
      //TODO: Notify CardManager to add New Folder
    },

    onEnter: function() {
      if (this.mode !== 'edit' && this.mode !== 'arrange') {
        return false;
      }

      var focus = this.spatialNavigator.getFocusedElement();
      if (focus === this.doneButton) {
        this.toggleEditMode();
      } else if (focus === this.addNewFolderButton) {
        this.addNewFolder();

      // Current focus is on a card
      } else if (focus.CLASS_NAME === 'XScrollable') {
        this.toggleArrangeMode();
      }
      return true;
    },

    get mode() {
      return this.mainSection.dataset.mode;
    }
  };

  exports.Edit = Edit;
}(window));
