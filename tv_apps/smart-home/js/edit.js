/* global evt, Folder, SmartModalDialog, Utils */

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
      this.modalDialog = new SmartModalDialog();

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
      this.cardScrollable.on('node-inserted-over-folder',
        this.onNodeInsertedOverFolder.bind(this));

      this.spatialNavigator.on('focus', this.handleFocus.bind(this));
      this.spatialNavigator.on('unfocus', this.handleUnfocus.bind(this));

      // A workaround for checking if the folder list is navigable
      this.isFolderReady = false;
      // The hovering card
      this._hoveringCard = null;
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
        this.fire('exit-edit-mode');
      } else {
        this.mainSection.dataset.mode = 'edit';
        this.spatialNavigator.multiRemove(this.regularNavElements);
        this.spatialNavigator.multiAdd(this.editNavElements);

        this._setCurrentScrollable(this.cardScrollable);
        this.currentNode =
          this.cardScrollable.getNodeFromItem(this.cardScrollable.currentItem);
        this._revealPanel(this.currentScrollable, this.currentNode);

        this.spatialNavigator.focus(this.cardScrollable);
        this.cardScrollable.setScale(EDIT_MODE_SCALE);
        this.folderScrollable.setScale(EDIT_MODE_SCALE);
        this.fire('enter-edit-mode');
      }
    },

    toggleArrangeMode: function() {
      if (this.mainSection.dataset.mode === 'edit') {
        this.mainSection.dataset.mode = 'arrange';
        this._concealPanel(this.currentScrollable, this.currentNode);
        this.currentScrollable.focus(this.currentScrollable.currentItem);
        this._setHintArrow();
        if (this.currentScrollable === this.folderScrollable) {
          this.cardScrollable.setColspanOnFocus(1);
        }
        this.fire('arrange');
      } else if (this.mainSection.dataset.mode == 'arrange') {
        this.mainSection.dataset.mode = 'edit';

        this.currentNode = this.currentScrollable.getNodeFromItem(
                                            this.currentScrollable.currentItem);
        this._revealPanel(this.currentScrollable, this.currentNode);
        this._clearHintArrow();
        this.cardScrollable.setColspanOnFocus(0);
        this.folderScrollable.realignToReferenceElement();
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

      if (!this._moveQueue.isEmpty() && focus.CLASS_NAME === 'XScrollable') {
        var key = this._moveQueue.shift();
        var targetItem = focus.getTargetItem(key);

        switch (key) {
        case 'left':
        case 'right':
          if (!focus.isHovering && targetItem &&
              focus.currentItem.getAttribute('app-type') !== 'deck' &&
              focus.currentItem.getAttribute('app-type') !== 'folder' &&
              targetItem.getAttribute('app-type') === 'folder') {
            // hover on folder
            this.hoverCard(focus, focus.currentItem, targetItem);
            this._moveTimer =
              window.setTimeout(this.onCardMoveAnimationEnd.bind(this),
                CARD_TRANSFORM_LATENCY, targetItem);
          } else if (focus.isHovering && targetItem !== focus.hoveredItem) {
            this.unhoverCard(focus, true);
            this._moveTimer =
              window.setTimeout(this.onCardMoveAnimationEnd.bind(this),
                CARD_TRANSFORM_LATENCY, targetItem);
          } else if (targetItem) {
            if (focus.isHovering) {
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
            this._consumeMove();
          }

          break;
        case 'down':
          if (focus.isHovering && this.isFolderReady) {
            this.moveToFolder();
            this._moveTimer =
              window.setTimeout(this.onCardMoveAnimationEnd.bind(this),
              CARD_TRANSFORM_LATENCY);
          }
          this._moveQueue.clearQueue();
          break;
        case 'up':
          if (this.currentScrollable === this.folderScrollable) {
            this.moveToCardList(focus);
            this._moveTimer =
              window.setTimeout(this.onCardMoveAnimationEnd.bind(this),
              CARD_TRANSFORM_LATENCY);
          }
          break;
        }
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
      if (this.modalDialog.isOpened) {
        return true;
      }

      if (this.mode !== 'arrange') {
        return false;
      }
      this._produceMove(key);

      return true;
    },

    _setHintArrow: function(scrollable) {
      var index = parseInt(this.currentNode.dataset.idx, 10);
      if (scrollable && scrollable.isHovering) {
        this.currentNode.classList.toggle('left_arrow', true);
        this.currentNode.classList.toggle('right_arrow', true);
        this.currentNode.classList.toggle('down_arrow', true);
        this.currentNode.classList.remove('up_arrow');
      } else {
        this.currentNode.classList.toggle('left_arrow', index > 0);
        this.currentNode.classList.toggle('right_arrow',
                                    index < this.currentScrollable.length - 1);
        this.currentNode.classList.remove('down_arrow');
        this.currentNode.classList.toggle('up_arrow',
                              this.currentScrollable === this.folderScrollable);
      }
    },

    _setCurrentScrollable: function(scrollable) {
      this.currentScrollable = scrollable;
      document.getElementById('card-viewer').classList.toggle(
        'current-scrollable', scrollable === this.cardScrollable);
      document.getElementById('folder-viewer').classList.toggle(
        'current-scrollable', scrollable === this.folderScrollable);
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
      // Remove the card from the main list
      this.cardManager.removeCard(this._hoveringCard);
    },

    /**
     * Runs after moveToFolder call, when the hovering card is successfully
     * removed by cardManager and the node is removed from cardScrollable.
     */
    onHoveringNodeRemoved: function(cardItem, folderItem) {
      var card = this._hoveringCard;
      var folder = this.cardManager.findCardFromCardList(
                    {cardId: folderItem.dataset.cardId});
      // Add the card into the folder
      folder.addCard(card, this.folderScrollable.isReversed ? null : 0);
      this._hoveringCard = null;
      this._setCurrentScrollable(this.folderScrollable);
      this.folderScrollable.realignToReferenceElement();
      this.currentNode = this.folderScrollable.getNodeFromItem(
                                            this.folderScrollable.currentItem);
      if (!this.spatialNavigator.focus(this.folderScrollable)) {
        // When a card is added to a new empty folder,
        // add the folderScrollable to this.spatialNavigator.
        this.spatialNavigator.add(this.folderScrollable);
        this.spatialNavigator.focus(this.folderScrollable);
      }
      this._setHintArrow();
    },

    moveToCardList: function(focus) {
      var folder = this.cardManager.findContainingFolder(
                                    {cardId: focus.currentItem.dataset.cardId});
      var card = this.cardManager.findCardFromCardList(
                                    {cardId: focus.currentItem.dataset.cardId});
      var folderItem = this.cardScrollable.currentItem;
      var idx = this.cardScrollable.getNodeFromItem(folderItem).dataset.idx;

      this._hoveringCard = card;

      folder.removeCard(card);

      // insert card
      this.cardManager.insertCard({
        card: card,
        index: parseInt(idx, 10),
        overFolder: true
      });
    },

    onNodeInsertedOverFolder: function() {
      this.spatialNavigator.focus(this.cardScrollable);
      this._setCurrentScrollable(this.cardScrollable);
      this.currentNode = this.cardScrollable.getNodeFromItem(
                                            this.cardScrollable.currentItem);
      this._setHintArrow(this.currentScrollable);
      this.folderScrollable.realignToReferenceElement();
    },

    onEnter: function() {
      if (this.mode !== 'edit' && this.mode !== 'arrange') {
        return false;
      }

      if (this.modalDialog.isOpened) {
        return true;
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
          this.openDeleteCardDialog(focus, focus.getNodeFromItem(currentItem));
        } else if (currentItem.classList.contains('hover')) {
          // When a card is hovering over a folder, do nothing here.
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

    openDeleteCardDialog: function(scrollable, nodeElem) {
      Utils.holdFocusForAnimation();
      this.modalDialog.open({
        message: {
          textL10nId: 'delete-card-alert'
        },
        buttonSettings: [
          {
            textL10nId: 'cancel',
            defaultFocus: true,
            onClick: this.spatialNavigator.focus.bind(this.spatialNavigator)
          },
          {
            textL10nId: 'delete',
            class: 'danger',
            onClick: this.deleteCard.bind(this, scrollable, nodeElem)
          }
        ],
        onCancel: this.spatialNavigator.focus.bind(this.spatialNavigator)
      });
    },

    deleteCard: function(scrollable, nodeElem) {
      var itemElem = scrollable.getItemFromNode(nodeElem);
      this._concealPanel(scrollable, nodeElem);
      nodeElem.classList.add('delete');

      if (scrollable === this.folderScrollable) {
        var folder = this.cardManager.findContainingFolder(
                          {cardId: itemElem.dataset.cardId});
        var card = this.cardManager.findCardFromCardList(
                          {cardId: itemElem.dataset.cardId});
      }

      var deletedItem = scrollable.getItemFromNode(nodeElem);
      deletedItem.addEventListener('transitionend', function(evt) {
        if (evt.propertyName === 'transform') {
          scrollable.spatialNavigator
                    .focus(scrollable.getItemFromNode(nodeElem));
          if (scrollable === this.cardScrollable) {
            this.cardManager.removeCard(parseInt(nodeElem.dataset.idx, 10));
          } else {
            folder.removeCard(card);

            if (folder.isEmpty()) {
              this.spatialNavigator.focus(this.cardScrollable);
            }
          }
        }
      }.bind(this));
    },

    hoverCard: function(scrollable, focusedItem, targetItem) {
      var card = this.cardManager.findCardFromCardList(
                      {cardId: focusedItem.dataset.cardId});
      this._hoveringCard = card;
      scrollable.hover(focusedItem, targetItem);
      // set up/bottom arrow
      this._setHintArrow(scrollable);
    },

    unhoverCard: function(scrollable, shouldResetCardPositions) {
      scrollable.unhover(shouldResetCardPositions);
      this._hoveringCard = null;
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
        this._setCurrentScrollable(scrollable);
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
