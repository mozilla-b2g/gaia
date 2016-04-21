/* global evt, KeyNavigationAdapter, SpatialNavigator, Folder, SharedUtils,
          CardUtil, FOLDER_CAPACITY, Utils, Deck, Sanitizer */

(function(exports) {
  'use strict';

  function CardPicker() {}

  CardPicker.prototype = evt({
    container: document.getElementById('card-picker'),
    gridView: document.getElementById('card-picker-grid-view'),

    hideCardPickerButton: document.getElementById('hide-cardpicker-button'),
    counterLabel: document.getElementById('picker-selection-counter'),

    init: function(options) {
      this.appButtons = [];

      this._cardManager = options.cardManager;
      this._folder = null;

      this.navigableElements = [
        this.hideCardPickerButton
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
      this.container.addEventListener('keyup', this.onKeyUp.bind(this), true);

      this._selectedElements = this.gridView.getElementsByClassName('selected');
    },

    onFocus: function(elem) {
      elem.focus();
      if (elem.classList.contains('app-button')) {
        this._scrollTo(elem);
      }
    },

    onMove: function(direction) {
      var result = this._spatialNavigator.move(direction);
      if (result === false && direction === 'down') {
        this._spatialNavigator.focus(this.hideCardPickerButton);
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
        this.updateCapacityCount();
        if (this.mode == 'update') {
          this._showButton(this.selected.length ? 'done' : 'remove');
        }
      }
    },

    onKeyUp: function(evt) {
      if (SharedUtils.isBackKey(evt) && this.mode == 'add' && this.isShown) {
        document.l10n.formatValue('cancel-add-folder').then(message => {
          if (confirm(message)) {
            this.mode = null;
            this.hide();
          }
        });
      }
    },

    show: function(folderElem) {
      this.mode = folderElem ? 'update' : 'add';
      this._folder = null;
      this._showButton('done');
      this.refresh(folderElem);
      this.container.classList.remove('hidden');
      this.focus();
      this.fire('show');
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
          this._refreshCardButtons(folderList, cardList);
          this.updateCapacityCount();
          this._spatialNavigator.setCollection(
                            this.appButtons.concat(this.navigableElements));
          this._spatialNavigator.focus(this.appButtons[0]);
        });
    },

    focus: function() {
      this._spatialNavigator.focus();
    },

    updateCapacityCount: function() {
      document.l10n.formatValue('selection-count',{
        number: this.selected.length,
        limit: FOLDER_CAPACITY
      }).then(message => {
        var htmlmessage = Sanitizer.createSafeHTML(message);
        this.counterLabel.innerHTML = Sanitizer.unwrapSafeHTML(htmlmessage);
      });
    },

    _scrollTo: function(elem) {
      var scrollY = elem.offsetTop -
              (this.gridView.offsetHeight - elem.offsetHeight) / 2;
      this.gridView.scrollTo(0, scrollY);
    },

    _getSortKey: function(card) {
      var defaultOrder = {
        tv: 1,
        application: 2,
        device: 3,
        website: 4
      };

      var key = String(defaultOrder[card.group] || 5);
      if (!(card instanceof Deck)) {
        var lang = document.documentElement.lang;
        var name = this._cardManager.resolveCardName(card, lang);
        if (name.raw) {
          key += name.raw;
        } else if (name.id == 'channel-name' &&
                   name.args && name.args.number !== undefined) {
          // For tv channels only. We sort them by channel numbers.
          key += '0'.repeat(10 - name.args.number.length) + name.args.number;
        } else if (name.id) {
          // As a fallback, we sort cards by l10n-id.
          key += name.id;
        } else {
          // If nothing can be sorted, append the last printable character to
          // the key to make it be sorted follow other well-sorted cards.
          key += '~';
        }
      }

      return key.toUpperCase();
    },

    _refreshCardButtons: function(folderList, cardList, options) {
      var candidates = {};

      this.appButtons = [];
      this.gridView.innerHTML = '';

      var that = this;
      function appendToGridView(appButton) {
        that.gridView.appendChild(appButton);
        that.appButtons.push(appButton);
      }
      function createButtonHelper(card, parentType) {
        if(card instanceof Folder) {
          return;
        }
        var appButton = CardUtil.createCardButton(card, true);
        return appButton;
      }

      folderList && folderList.forEach(card => {
        var appButton = createButtonHelper(card);
        if (appButton) {
          appButton.dataset.parentType = 'folder';
          appButton.classList.add('selected');
          appendToGridView(appButton);
        }
      });

      cardList && cardList.forEach(card => {
        var appButton = createButtonHelper(card);
        if (appButton) {
          appButton.dataset.parentType = 'empty';
          candidates[this._getSortKey(card)] = appButton;
        }
      });

      var keys = Object.keys(candidates);
      if (keys.length) {
        keys.sort();
        keys.forEach(key => appendToGridView(candidates[key]));
      }
    },

    _showButton: function(id) {
      switch (id) {
        case 'done':
          this.hideCardPickerButton.classList.remove('danger');
          this.hideCardPickerButton.classList.add('primary');
          break;
        case 'remove':
          this.hideCardPickerButton.classList.add('danger');
          this.hideCardPickerButton.classList.remove('primary');
          break;
      }
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
      // Moves cards previously inside the folder back to cardList
      this.appButtons.every(elem => {
        // Buttons previously inside the folder are in the start of the array
        // and we want to process them only.
        if (elem.dataset.parentType !== 'folder') {
          return false;
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
        return true;
      });

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

      if (this._folder.isEmpty()) {
        this._cardManager.removeCard(this._folder);
      }
    },

    /**
     * Properties
     */
    get isShown() {
      return !this.container.classList.contains('hidden');
    },

    get selected() {
      return this._selectedElements;
    },

    get mode() {
      return this._mode;
    },

    set mode(param) {
      this.container.setAttribute('mode', param);
      this._mode = param;
    }
  });
  exports.CardPicker = CardPicker;
}(window));
