'use strict';

(function(exports) {
  const EDIT_MODE_SCALE = 0.57;


  function Edit() {}

  Edit.prototype = {
    mainSection: document.getElementById('main-section'),
    doneButton: document.getElementById('done-button'),
    searchButton: document.getElementById('search-button'),
    // TODO: We'll hide new folder button until folder features are implemented.
    // addNewFolderButton: document.getElementById('add-new-folder-button'),
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
      this.editNavElements = [this.doneButton];

      this.cardManager.on('card-swapped', this.onCardSwapped.bind(this));

      this.cardScrollable.on('focus', this.handleCardFocus.bind(this));
      this.cardScrollable.on('listTransformEnd',
                                  this.handleListTransformEnd.bind(this));

      this.spatialNavigator.on('focus', this.handleFocus.bind(this));
      this.spatialNavigator.on('unfocus', this.handleUnfocus.bind(this));

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
        this.cardScrollable.listElem.classList.add('exiting-edit-mode');
        this.cardManager.writeCardlistInCardStore({cleanEmptyFolder: true});
        this._concealPanel(this.currentScrollable, this.currentNode);
      } else {
        this.mainSection.dataset.mode = 'edit';
        this.spatialNavigator.multiRemove(this.regularNavElements);
        this.spatialNavigator.multiAdd(this.editNavElements);

        // Keep track of scrollable and node for showing/hiding panel
        this.currentScrollable = this.cardScrollable;
        this.currentNode =
          this.cardScrollable.getNodeFromItem(this.cardScrollable.currentItem);
        this._revealPanel(this.currentScrollable, this.currentNode);

        this.spatialNavigator.focus(this.cardScrollable);
        this.cardScrollable.setScale(EDIT_MODE_SCALE);
      }
    },

    toggleArrangeMode: function() {
      if (this.mainSection.dataset.mode === 'edit') {
        this.mainSection.dataset.mode = 'arrange';
        this._concealPanel(this.currentScrollable, this.currentNode);
        this._setHintArrow();
      } else if (this.mainSection.dataset.mode == 'arrange') {
        this.mainSection.dataset.mode = 'edit';

        this.currentNode =
           this.cardScrollable.getNodeFromItem(this.cardScrollable.currentItem);
        this.currentScrollable = this.cardScrollable;
        this._revealPanel(this.currentScrollable, this.currentNode);
        this._clearHintArrow();
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
          this._setHintArrow();
        }
      }
      return true;
    },

    _setHintArrow: function() {
      var index = parseInt(this.currentNode.dataset.idx, 10);
      this.currentNode.classList.toggle('left_arrow', index > 0);
      this.currentNode.classList.toggle('right_arrow',
                                    index < this.currentScrollable.length - 1);
    },

    _clearHintArrow: function() {
      this.currentNode.classList.remove('left_arrow');
      this.currentNode.classList.remove('right_arrow');
    },

    addNewFolder: function() {
      // XXX: mozL10n.get is going to be obsoleted. We'd plan to let smartButton
      // able to do l10n by itself.
      var _ = navigator.mozL10n.get;
      this.cardManager.insertNewFolder(_('new-folder'),
        this.cardScrollable.currentIndex);
      this.spatialNavigator.focus(this.cardScrollable);
    },

    onEnter: function() {
      if (this.mode !== 'edit' && this.mode !== 'arrange') {
        return false;
      }

      var focus = this.spatialNavigator.getFocusedElement();
      if (focus === this.doneButton) {
        this.toggleEditMode();
      // TODO: We disable new folders until folder features are implemented.
      // } else if (focus === this.addNewFolderButton) {
      //  this.addNewFolder();

      } else if (focus.CLASS_NAME === 'XScrollable') {
        var currentItem = focus.currentItem;

        if (currentItem.classList.contains('rename-btn')) {
          this.renameCard(focus, focus.getNodeFromItem(currentItem));
        } else if (currentItem.classList.contains('delete-btn')) {
          this.deleteCard(focus, focus.getNodeFromItem(currentItem));
        } else {
          // Current focus is on a card
          this.toggleArrangeMode();
        }
      }
      return true;
    },

    renameCard: function(scrollable, nodeElem) {
      var card = this.cardManager.findCardFromCardList({
        cardId: scrollable.getItemFromNode(nodeElem).dataset.cardId
      });
      var _ = navigator.mozL10n.get;
      var result = prompt(_('enter-new-name'), card.name);
      if (!result) {
        return;
      }
      card.name = result;
      this.cardManager.updateCard(card);
    },

    deleteCard: function(scrollable, nodeElem) {
      this._concealPanel(scrollable, nodeElem);
      this.cardManager.removeCard(parseInt(nodeElem.dataset.idx, 10));
    },

    _getPanel: function(nodeElem) {
      var cardPanel = nodeElem.getElementsByClassName('card-panel')[0];
      return {
        panel: cardPanel,
        renameBtn: cardPanel.getElementsByClassName('rename-btn')[0],
        deleteBtn: cardPanel.getElementsByClassName('delete-btn')[0]
      };
    },

    _revealPanel: function(scrollable, nodeElem) {
      var panel = this._getPanel(nodeElem);
      if(scrollable.getItemFromNode(nodeElem).getAttribute('app-type') ===
                                                                  'deck') {
        // Decks can't be renamed or deleted.
        return;
      }
      scrollable.spatialNavigator.add(panel.renameBtn);
      scrollable.spatialNavigator.add(panel.deleteBtn);
    },

    _concealPanel: function(scrollable, nodeElem) {
      var panel = this._getPanel(nodeElem);
      scrollable.spatialNavigator.remove(panel.renameBtn);
      scrollable.spatialNavigator.remove(panel.deleteBtn);
      if (!scrollable.spatialNavigator.getFocusedElement()) {
        scrollable.spatialNavigator.focus(scrollable.getItemFromNode(nodeElem));
      }
    },

    handleFocus: function(elem) {
      if (this.mode === 'edit' && elem.CLASS_NAME === 'XScrollable') {
        this.handleCardFocus(
                elem, elem.currentItem, elem.getNodeFromItem(elem.currentItem));
      }
    },

    handleUnfocus: function(elem) {
      if (this.mode === 'edit' && elem.CLASS_NAME === 'XScrollable') {
        this.handleCardUnfocus(
                elem, elem.currentItem, elem.getNodeFromItem(elem.currentItem));
      }
    },

    handleCardFocus: function(scrollable, itemElem, nodeElem) {
      if (this.mode !== 'edit' ||
          // When focus goes outside the scrollable and the last selected item
          // is a panel button, we still focus back to the card corresponding to
          // that button to keep track of the last focused card. But in this
          // case we don't need any further action on UI view.
          this.spatialNavigator.getFocusedElement() !== scrollable) {
        return;
      }
      // If users are moving from card to panel button, they're under the same
      // node element. We need to "unfocus" the node only when user really move
      // to another card. So here we call handleCardUnfocus manually.
      if (this.currentNode != nodeElem) {
        this.handleCardUnfocus(this.currentScrollable,
                          this.currentScrollable.currentItem, this.currentNode);

        this.currentNode = nodeElem;
        this.currentScrollable = scrollable;
      }
      this._revealPanel(scrollable, nodeElem);
      itemElem.focus();
      nodeElem.classList.add('focused');
    },

    handleCardUnfocus: function(scrollable, itemElem, nodeElem) {
      this._concealPanel(scrollable, nodeElem);
      nodeElem.classList.remove('focused');
    },

    handleListTransformEnd: function() {
      if (this.mode === '') {
        this.cardScrollable.listElem.classList.remove('exiting-edit-mode');
      }
    },

    get mode() {
      return this.mainSection.dataset.mode;
    }
  };

  exports.Edit = Edit;
}(window));
