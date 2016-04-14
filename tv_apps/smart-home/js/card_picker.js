/* global evt, KeyNavigationAdapter, SpatialNavigator, Folder, Deck,
          CardUtil, FOLDER_CAPACITY, Utils */

(function(exports) {
  'use strict';

  function CardPicker() {}

  CardPicker.prototype = evt({
    container: document.getElementById('card-picker'),
    gridView: document.getElementById('card-picker-grid-view'),

    hideCardPickerButton: document.getElementById('hide-cardpicker-button'),

    init: function(options) {
      this.appCardElems = [];

      this._cardManager = options.cardManager;
      this._folder = null;

      this.navigableElements = [
        CardPicker.prototype.hideCardPickerButton
      ];

      this.container.addEventListener('click', this.focus.bind(this));

      this._spatialNavigator = new SpatialNavigator(this.navigableElements);
      this._spatialNavigator.on('focus', this.onFocus.bind(this));
      this._spatialNavigator.focus();

      this.hideCardPickerButton.addEventListener('click', this.hide.bind(this));

      this._keyNavigationAdapter = new KeyNavigationAdapter();
      this._keyNavigationAdapter.init(this.container);
      this._keyNavigationAdapter.on('move', this.onMove.bind(this));
      this._keyNavigationAdapter.on('enter-keyup', this.onEnter.bind(this));

      this._selectedButtons = this.gridView.getElementsByClassName('selected');
      this._appButtons = this.gridView.getElementsByTagName('smart-button');

      this.refresh();
    },

    onMove: function(direction) {
      this._spatialNavigator.move(direction);
    },

    onFocus: function(elem) {
      elem.focus();
      if (elem.classList.contains('app-button')) {
        this._scrollTo(elem);
      }
    },

    onEnter: function() {
      var elem = this._spatialNavigator.getFocusedElement();
      if (elem.classList.contains('app-button')) {
        if (this.selected.length >= FOLDER_CAPACITY &&
            !elem.classList.contains('selected')) {
          Utils.showCapacityWarning();
          return;
        }

        elem.classList.toggle('selected');
      }
    },

    show: function(folderElem) {
      this._mode = folderElem ? 'update' : 'add';
      this._folder = null;
      this.refresh(folderElem);
      this.container.classList.remove('hidden');
      this.focus();
    },

    hide: function() {
      this.container.classList.add('hidden');
      this.fire('hide');
    },

    refresh: function(folderElem) {
      var folderList = null;
      if (folderElem) {
        this._folder = this._cardManager.findCardFromCardList({
          cardId: folderElem.dataset.cardId
        });
        folderList = this._folder.getCardList();
      }

      this._cardManager.getCardList()
        .then(cardList => {
          this._refreshCardElements(folderList, cardList);
          this._spatialNavigator.setCollection(
                      this.navigableElements.concat(Array.from(this.allItems)));
          this._spatialNavigator.focus(this.allItems[0]);
        });
    },

    focus: function() {
      this._spatialNavigator.focus();
    },

    _scrollTo: function(elem) {
      var scrollY = (elem.offsetTop - this.gridView.offsetTop) -
              (this.gridView.offsetHeight - elem.offsetHeight) / 2;
      this.gridView.scrollTo(0, scrollY);
    },

    _refreshCardElements: function(folderList, cardList, options) {
      this.appCardElems = [];
      this.gridView.innerHTML = '';

      var that = this;
      function createCardElemHelper(card) {
        if(card instanceof Folder || card instanceof Deck) {
          return;
        }

        var nodeElem = document.createElement('div');
        nodeElem.appendChild(CardUtil.createCardFragment(card));
        that.gridView.appendChild(nodeElem);
        return nodeElem;
      }

      folderList && folderList.forEach(card => {
        var appCardElem = createCardElemHelper(card);
        if (appCardElem) {
          var cardButton = appCardElem.firstElementChild;
          cardButton.dataset.parentType = 'folder';
          cardButton.classList.add('selected');
        }
      });

      cardList && cardList.forEach(card => {
        var appCardElem = createCardElemHelper(card);
        if (appCardElem) {
          var cardButton = appCardElem.firstElementChild;
          cardButton.dataset.parentType = 'empty';
        }
      });
    },

    /**
     * Functions for adding and updating to databases
     */

    saveToNewFolder: function(position) {
      if (this.selected.length <= 0) {
        return;
      }

      this._folder = this._cardManager.insertNewFolder(
          {id: 'new-folder'}, position);

      this._saveToFolderHelper();
      return this._folder;
    },

    updateFolder: function() {
      if (!this._folder) {
        return;
      }
      var buttons = this.allItems;
      // Moves cards previously inside the folder back to cardList
      for (var i = 0; i < buttons.length; i++) {
        var elem = buttons[i];
        // Buttons previously inside the folder are in the start of the array
        // and we want to process them only.
        if (elem.dataset.parentType !== 'folder') {
          break;
        }
        if (!elem.classList.contains('selected')) {
          var card = this._folder.findCard({
            cardId: elem.dataset.cardId
          });
          this._folder.removeCard(card);
          this._cardManager.insertCard({
            card: card,
            position: 'end',
            silent: true
          });
        }
      }
      // Then save newly added ones
      this._saveToFolderHelper();
    },

    _saveToFolderHelper: function() {
      if (!this._folder) {
        return;
      }

      for (var i = 0; i < this.selected.length; i++) {
        var button = this.selected[i];
        if (button.dataset.parentType === 'folder') {
          continue;
        }

        var card = this._cardManager.findCardFromCardList({
          cardId: button.dataset.cardId
        });
        this._cardManager.removeCard(card);
        this._folder.addCard(card, {silent: true});
      }
    },

    /**
     * Properties
     */
    get isShown() {
      return !this.container.classList.contains('hidden');
    },

    get selected() {
      return this._selectedButtons;
    },

    get allItems() {
      return this._appButtons;
    },

    get mode() {
      return this._mode;
    }
  });
  exports.CardPicker = CardPicker;
}(window));
