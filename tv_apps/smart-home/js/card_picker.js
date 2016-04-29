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

    panel: document.querySelector('section.card-picker-panel'),
    input: document.getElementById('card-picker-input'),

    init: function(options) {
      this.appButtons = [];
      this._cardScrollable = options.cardScrollable;
      this._cardManager = options.cardManager;
      this._folder = null;

      this.navigableElements = [
        this.hideCardPickerButton, this.input
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

      this.input.addEventListener('focus', () => {
        setTimeout(() => {
          this.input.setSelectionRange(
            this.input.value.length, this.input.value.length);
        }, 0);
      });
    },

    openKeyboard: function () {
      this.panel.classList.add('hidden');
      // Set readOnly to false and blur then focus input
      // to trigger keyboard opening
      this.input.readOnly = false;
      this.input.blur();
      this.input.focus();
      // In case the kyeboard dismissed by other reasons, we have to
      // call this.closeKeyboard to update the keyboard state is closed.
      var handleBlur = () => {
        this.input.removeEventListener('blur', handleBlur);
        this.closeKeyboard();
      };
      this.input.addEventListener('blur', handleBlur);
    },

    closeKeyboard: function () {
      this.panel.classList.remove('hidden');
      // Set readOnly to true and blur then focus input
      // to trigger keyboard closing
      this.input.readOnly = true;
      this.input.blur();
      this.input.focus();
      if (this.input.value) {
        this.input.dataset.folderName = this.input.value;
      } else {
        // Recover from empty name input
        this.input.value = this.input.dataset.folderName;
      }
    },

    onFocus: function(elem) {
      elem.focus();
      if (elem.classList.contains('app-button')) {
        this._scrollTo(elem);
        this._lastFocusedAppButton = elem;
      }
    },

    onMove: function(direction) {
      if (this.isKeyboardOpened) {
        return;
      }

      var focus = this._spatialNavigator.getFocusedElement();
      if (focus === this.input || focus === this.hideCardPickerButton) {
        this._spatialNavigator.focus(this._lastFocusedAppButton);
        return;
      }

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
      } else if (elem === this.input) {
        if (this.isKeyboardOpened) {
          this.closeKeyboard();
        } else {
          this.openKeyboard();
        }
      }
    },

    onKeyUp: function(evt) {
      if (SharedUtils.isBackKey(evt) && this.mode == 'add' &&
          this.isShown && !this.isKeyboardOpened) {
        document.l10n.formatValue('cancel-add-folder').then(message => {
          if (confirm(message)) {
            this.mode = null;
            this.hide();
          }
        });
      }
    },

    show: function(folderElem) {
      var nameResolvingPromise = null;
      if (folderElem) {
        var card = this._cardManager.findCardFromCardList({
          cardId: folderElem.dataset.cardId
        });
        var name = this._cardManager
          .resolveCardName(card, document.documentElement.lang);
        nameResolvingPromise = name.raw ?
          Promise.resolve(name.raw) : document.l10n.formatValue(name.id);
      } else {
        nameResolvingPromise = document.l10n.formatValue('my-folder');
      }
      nameResolvingPromise.then(name => {
        this.input.value = name;
        // This dataset.folderName attribute is for saving current folder name
        // so we can use it to recover from empty or invalid folder name input.
        this.input.dataset.folderName = name;
        // If not set the caret in advance, the caret will not appear
        // for the 1st time of focusing
        this.input.setSelectionRange(
          this.input.value.length, this.input.value.length);
      });

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
      var candidates = [];

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

      cardList && cardList.forEach((card, index) => {
        var appButton = createButtonHelper(card);
        if (appButton) {
          appButton.dataset.parentType = 'empty';
          candidates.push({
            index: index,
            key: this._getSortKey(card),
            button: appButton
          });
        }
      });

      if (candidates.length) {
        candidates.sort((a, b) => {
          var compare = a.key.localeCompare(b.key);
          if (!compare) {
            return a.index - b.index;
          }
          return compare;
        });
        candidates.forEach(candidate => appendToGridView(candidate.button));
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

      // The slideEnd event happens when slide animation of
      // inserting new folder ends. Due to different slide distance, slide
      // animation duration is different.
      // So this event could happen before or after this._folder is returned
      // from this._cardManager.insertNewFolder call below.
      // Hence we wrap it with a Promise to make sure what we plan to do
      // is not executed before this._folder is returned.
      var slideEndPromise = new Promise(resolve => {
        this._cardScrollable.once('slideEnd', () => resolve());
      });

      this._folder = this._cardManager.insertNewFolder(
          {id: 'my-folder'}, position);

      // We should do works after the slideEnd event so as to make sure
      // the focus index is correct.
      slideEndPromise.then(() => this._saveToFolderHelper());
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
      } else {
        this._folder.name = { raw: this.input.value };
        this._cardManager.updateCard(this._folder);
      }
    },

    /**
     * Properties
     */
    get isKeyboardOpened() {
      return !this.input.readOnly;
    },

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
