/* global evt, Folder */
'use strict';

(function(exports) {
  const EDIT_MODE_SCALE = 0.57;
  const CARD_TRANSFORM_LATENCY = 500;

  function Edit() {}

  Edit.prototype = evt({
    mainSection: document.getElementById('main-section'),
    doneButton: document.getElementById('done-button'),
    searchButton: document.getElementById('search-button'),
    addNewFolderButton: document.getElementById('add-new-folder-button'),
    editButton: document.getElementById('edit-button'),
    settingsButton: document.getElementById('settings-button'),

    regularNavElements: undefined,
    editNavElements: undefined,
    currentNode: undefined,

    init: function(spatialNavigator, cardManager,
                   cardScrollable, folderScrollable) {
      var that = this;

      this.spatialNavigator = spatialNavigator;
      this.cardManager = cardManager;
      this.cardScrollable = cardScrollable;
      this.folderScrollable = folderScrollable;

      this.regularNavElements =
              [this.searchButton, this.settingsButton, this.editButton];
      this.editNavElements = [this.doneButton, this.addNewFolderButton];

      this.cardManager.on('card-swapped', this.onCardSwapped.bind(this));
      this.cardManager.getCardList().then(function(cardList) {
        cardList.forEach(function(card) {
          if (card instanceof Folder) {
            card.on('card-swapped', that.onCardSwapped.bind(that));
          }
        });
      });

      this.cardScrollable.on('listTransformEnd',
                                  this.handleListTransformEnd.bind(this));
      this.cardScrollable.on('nodeTransformEnd',
        this.onCardMoveAnimationEnd.bind(this));
      this.cardScrollable.on('hovering-node-removed',
        this.onHoveringNodeRemoved.bind(this));

      this.spatialNavigator.on('focus', this.handleFocus.bind(this));
      this.spatialNavigator.on('unfocus', this.handleUnfocus.bind(this));

      // If a card is hovering over a folder
      this._isHovering = false;
      // A workaround for checking if the folder list is navigable
      this.isFolderReady = false;
      // The hovering card
      this._hoveringCard = null;
      // The hovering card button element
      this._hoveringItem = null;
      // The hovered folder element
      this._hoveredItem = null;
      // Previously pressed key
      this._previousKey = '';
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
        this.cardScrollable.setScale();
        this.folderScrollable.setScale();
        this.cardScrollable.listElem.classList.add('exiting-edit-mode');
        this.cardManager.writeCardlistInCardStore({cleanEmptyFolder: true})
          .then(function() {
            // Since writeCardlistInCardStore triggers card-removed event that
            // causes re-focus on other elements in card list, we need to wait
            // until those actions to be done before focusing editButton.
            this.spatialNavigator.focus(this.editButton);
            this.currentNode.classList.remove('focused');
          }.bind(this));
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
        this.folderScrollable.setScale(EDIT_MODE_SCALE);
      }
    },

    toggleArrangeMode: function() {
      if (this.mainSection.dataset.mode === 'edit') {
        this.mainSection.dataset.mode = 'arrange';
        this._concealPanel(this.currentScrollable, this.currentNode);
        this.currentScrollable.spatialNavigator.focus(
          this.currentScrollable.getItemFromNode(this.currentNode));
        this._setHintArrow();
        this.fire('arrange');
      } else if (this.mainSection.dataset.mode == 'arrange') {
        this.mainSection.dataset.mode = 'edit';

        this.currentNode = this.currentScrollable.getNodeFromItem(
                                            this.currentScrollable.currentItem);
        this._revealPanel(this.currentScrollable, this.currentNode);
        this._clearHintArrow();
        if (this.currentScrollable === this.folderScrollable) {
          // Update scrollable positions
          this.cardScrollable.setNodesPosition();
          // folderScrollable should trace the position of cardScrollable,
          // leave this in bug 1158665
        }
      }
    },

    _moveQueue: {
      queue: [],
      isEmpty: function() {
        return (this.queue.length === 0);
      },
      push: function(obj) {
        this.queue.push(obj);
      },
      shift: function() {
        return this.queue.shift();
      },
      getLength: function() {
        return this.queue.length;
      },
      clearQueue: function() {
        this.queue.length = 0;
      }
    },

    _moveTimer: undefined,

    _produceMove: function(key) {
      this._moveQueue.push(key);
      if (!this._moveTimer) {
        this._consumeMove();
      }
    },

    _consumeMove: function() {
      var focus = this.spatialNavigator.getFocusedElement();
      var keepConsuming = false;

      if (!this._moveQueue.isEmpty() && focus.CLASS_NAME === 'XScrollable') {
        var key = this._moveQueue.shift();
        var targetItem = focus.getTargetItem(key);

        switch (key) {
        case 'left':
        case 'right':
          if (!this._isHovering && targetItem &&
              focus.currentItem.getAttribute('app-type') !== 'folder' &&
              targetItem.getAttribute('app-type') === 'folder') {
            // hover on folder
            this.hoverCard(focus, focus.currentItem, targetItem);
            this._moveTimer =
              window.setTimeout(this.onCardMoveAnimationEnd.bind(this),
                CARD_TRANSFORM_LATENCY, targetItem);
          } else if (this._isHovering &&
                     (this._previousKey === 'left' && key === 'right' ||
                      this._previousKey === 'right' && key === 'left')) {
            this.unhoverCard(focus, true);
            this._moveTimer =
              window.setTimeout(this.onCardMoveAnimationEnd.bind(this),
                CARD_TRANSFORM_LATENCY, targetItem);
          } else if (targetItem) {
            if (this._isHovering) {
              this.unhoverCard(focus, false);
            }
            var focusedCard = this.cardManager.findCardFromCardList(
                                    {cardId: focus.currentItem.dataset.cardId});
            var nonFocusedCard = this.cardManager.findCardFromCardList(
                                      {cardId: targetItem.dataset.cardId});
            if (this.currentScrollable === this.folderScrollable) {
              var containingFolder = this.cardManager.findContainingFolder(
                                    {cardId: focus.currentItem.dataset.cardId});
              containingFolder.swapCard(focusedCard, nonFocusedCard);
            } else {
              this.cardManager.swapCard(focusedCard, nonFocusedCard);
            }

            this._moveTimer =
              window.setTimeout(this.onCardMoveAnimationEnd.bind(this),
                CARD_TRANSFORM_LATENCY, targetItem);
          } else {
            // if queue is not empty but we are failed to get targetItem
            // that means we reach the boundary of cards. Thus we should
            // consume next action in queue
            keepConsuming = true;
          }

          break;
        case 'down':
          if (this.isFolderReady) {
            this.moveToFolder();
            this._moveTimer =
              window.setTimeout(this.onCardMoveAnimationEnd.bind(this),
              CARD_TRANSFORM_LATENCY);
          }
          this._moveQueue.clearQueue();
          break;
        case 'up':
          // Implement remove from folder in bug 1156143
          break;
        }

        this._previousKey = key;
      }
      if (keepConsuming) {
        this._consumeMove();
      }
    },

    onCardMoveAnimationEnd: function(elem) {
      if (this._moveTimer) {
        window.clearTimeout(this._moveTimer);
        this._moveTimer = undefined;
      }
      if (elem &&
          !elem.classList.contains('focused') &&
          !this._moveQueue.isEmpty()) {
        this._consumeMove();
      }
    },

    onCardSwapped: function(card1, card2, idx1, idx2) {
      this.currentScrollable.swap(idx1, idx2);
      this._setHintArrow();
    },

    onMove: function(key) {
      if (this.mode !== 'arrange') {
        return false;
      }
      this._produceMove(key);

      return true;
    },

    _setHintArrow: function() {
      var index = parseInt(this.currentNode.dataset.idx, 10);
      if (this._isHovering) {
        this.currentNode.classList.toggle('left_arrow', true);
        this.currentNode.classList.toggle('right_arrow', true);
        // If the current node can be moved into a folder
        this.currentNode.classList.toggle('down_arrow', true);
        // If the current node can be removed from a folder
        this.currentNode.classList.toggle('up_arrow', false);
      } else {
        this.currentNode.classList.toggle('left_arrow', index > 0);
        this.currentNode.classList.toggle('right_arrow',
                                    index < this.currentScrollable.length - 1);
        this.currentNode.classList.remove('down_arrow');
        this.currentNode.classList.remove('up_arrow');
      }
    },

    _clearHintArrow: function() {
      this.currentNode.classList.remove('left_arrow');
      this.currentNode.classList.remove('right_arrow');
    },

    addNewFolder: function() {
      var folder = this.cardManager.insertNewFolder({id: 'new-folder'},
        this.cardScrollable.currentIndex);
      folder.on('card-swapped', this.onCardSwapped.bind(this));
      this.spatialNavigator.focus(this.cardScrollable);
    },

    moveToFolder: function() {
      var cardItem = this._hoveringItem;
      var card = this.cardManager.findCardFromCardList(
                      {cardId: cardItem.dataset.cardId});
      this._hoveringCard = card;
      // Remove the card from the main list
      // this.deleteCard(this.cardScrollable,
      //                 this.cardScrollable.getNodeFromItem(cardItem));
      var nodeElem = this.cardScrollable.getNodeFromItem(cardItem);
      this.cardManager.removeCard(parseInt(nodeElem.dataset.idx, 10));
    },

    onHoveringNodeRemoved: function() {
      var folderItem = this._hoveredItem;
      var folder = this.cardManager.findCardFromCardList(
                    {cardId: folderItem.dataset.cardId});
      // Align the folderScrollable with the folder,
      // leave this in bug 1158665
      // this.folderScrollable.setReferenceElement(folderItem);

      this.cardScrollable.spatialNavigator.focusSilently(folderItem);

      var card = this._hoveringCard;
      // Add the card into the folder
      folder.addCard(card, 0);

      var folderNode = this.cardScrollable.getNodeFromItem(this._hoveredItem);
      this._hoveredItem.classList.remove('hovered');
      folderNode.classList.remove('hovered');
      this._isHovering = false;
      this._hoveringItem = null;
      this._hoveredItem = null;
      this._hoveringCard = null;
      // this.spatialNavigator.add(this.folderScrollable);
      this.currentScrollable = this.folderScrollable;
      this.currentNode = this.folderScrollable.getNodeFromItem(
                                            this.folderScrollable.currentItem);
      this.spatialNavigator.focus(this.folderScrollable);
      this._setHintArrow();
    },

    onEnter: function() {
      if (this.mode !== 'edit' && this.mode !== 'arrange' || this._isHovering) {
        return false;
      }

      var focus = this.spatialNavigator.getFocusedElement();
      if (focus === this.doneButton) {
        this.toggleEditMode();
      } else if (focus === this.addNewFolderButton) {
        this.addNewFolder();
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

      var lang = document.documentElement.lang;
      var oldName = this.cardManager.resolveCardName(card, lang);
      oldName = oldName.raw ? oldName.raw : _(oldName.id);

      var result = prompt(_('enter-new-name'), oldName);
      if (!result) {
        return;
      }
      card.name = {raw: result};
      this.cardManager.updateCard(card);
    },

    deleteCard: function(scrollable, nodeElem) {
      this._concealPanel(scrollable, nodeElem);
      scrollable.spatialNavigator.focus(scrollable.getItemFromNode(nodeElem));
      this.cardManager.removeCard(parseInt(nodeElem.dataset.idx, 10));
    },

    hoverCard: function(scrollable, focusedItem, targetItem) {
      var node1 = scrollable.getNodeFromItem(focusedItem);
      var node2 = scrollable.getNodeFromItem(targetItem);
      this.cardScrollable.hover(node1, node2);
      focusedItem.classList.add('hover');
      targetItem.classList.add('hovered');
      node1.classList.add('hover');
      node2.classList.add('hovered');
      this._isHovering = true;
      this._hoveringItem = focusedItem;
      this._hoveredItem = targetItem;
      // set up/bottom arrow
      this._setHintArrow();
    },

    unhoverCard: function(scrollable, shouldResetCardPositions) {
      var node1 = scrollable.getNodeFromItem(this._hoveringItem);
      var node2 = scrollable.getNodeFromItem(this._hoveredItem);
      this.cardScrollable.unhover(shouldResetCardPositions);
      this._hoveringItem.classList.remove('hover');
      this._hoveredItem.classList.remove('hovered');
      node1.classList.remove('hover');
      node2.classList.remove('hovered');
      this._isHovering = false;
      this._hoveringItem = null;
      this._hoveredItem = null;
      // clear up/bottom arrow
      if (shouldResetCardPositions) {
        this._setHintArrow();
      }
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
    },

    handleFocus: function(elem) {
      if (this.mode === 'edit' && elem.CLASS_NAME === 'XScrollable') {
        this.handleCardFocus(
                elem, elem.currentItem, elem.getNodeFromItem(elem.currentItem));
      }
    },

    handleUnfocus: function(elem) {
      if (this.mode === 'edit' && elem === this.currentScrollable) {
        this._concealPanel(this.currentScrollable, this.currentNode);
        this.currentScrollable.spatialNavigator.focusSilently(
          this.currentScrollable.getItemFromNode(this.currentNode));
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
        this._concealPanel(this.currentScrollable, this.currentNode);

        this.currentNode = nodeElem;
        this.currentScrollable = scrollable;
      }
      this._revealPanel(scrollable, nodeElem);
      itemElem.focus();
      nodeElem.classList.add('focused');
    },

    handleListTransformEnd: function() {
      if (this.mode === '') {
        this.cardScrollable.listElem.classList.remove('exiting-edit-mode');
      }
    },

    get mode() {
      return this.mainSection.dataset.mode;
    }
  });

  exports.Edit = Edit;
}(window));
