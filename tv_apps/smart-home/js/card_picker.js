/* global evt, KeyNavigationAdapter, SpatialNavigator, Folder, Deck,
          SharedUtils, CardUtil, FOLDER_CAPACITY, Utils, Sanitizer */

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
    inputCleanButton: document.getElementById('card-picker-input-clean-btn'),

    init: function(options) {
      this.appCardElems = [];
      this._cardScrollable = options.cardScrollable;

      this._cardManager = options.cardManager;
      this._folder = null;

      this.navigableElements = [
        this.hideCardPickerButton, this.input, this.inputCleanButton
      ];

      this.container.addEventListener('click', this.focus.bind(this));

      this._spatialNavigator = new SpatialNavigator(
        this.navigableElements, { ignoreHiddenElement: true });
      this._spatialNavigator.on('focus', this.onFocus.bind(this));
      this._spatialNavigator.focus();

      this.hideCardPickerButton.addEventListener('click', this.hide.bind(this));

      this._keyNavigationAdapter = new KeyNavigationAdapter();
      this._keyNavigationAdapter.init(this.container);
      this._keyNavigationAdapter.on('move', this.onMove.bind(this));
      this._keyNavigationAdapter.on('enter-keyup', this.onEnter.bind(this));
      this.container.addEventListener('keyup', this.onKeyUp.bind(this), true);

      this._initialSelectedIds = null;
      this._selectedButtons = this.gridView.getElementsByClassName('selected');
      this._appButtons = this.gridView.getElementsByTagName('smart-button');

      this.input.addEventListener('focus', () => {
        // XXX: it seems we need a setTimeout for input element to make
        // setSelectionRange works after focusing.
        setTimeout(() => {
          this.input.setSelectionRange(
            this.input.value.length, this.input.value.length);
        });
      });
    },

    openKeyboard: function () {
      this._hidePanel();
      // Set readOnly to false and blur then focus input
      // to trigger keyboard opening
      this.input.readOnly = false;
      this.input.blur();
      this.input.focus();
      // In case the keyboard dismissed by other reasons, we have to
      // call this.closeKeyboard to update the keyboard state is closed.
      var handleBlur = () => {
        this.input.removeEventListener('blur', handleBlur);
        this.closeKeyboard();
      };
      this.input.addEventListener('blur', handleBlur);
    },

    closeKeyboard: function () {
      this._showPanel();
      // Set readOnly to true and blur then focus input
      // to trigger keyboard closing
      this.input.readOnly = true;
      this.input.blur();
      this.input.focus();
      if (this.input.value &&
          this.input.value != this.input.dataset.folderName) {
        this.input.dataset.dirty = '1';
        this.input.dataset.folderName = this.input.value;
      } else {
        // Recover from empty name input
        this.input.value = this.input.dataset.folderName;
      }
    },

    onFocus: function(elem) {
      elem.focus();
      if (elem.classList.contains('app-button')) {
        this._scrollTo(elem.parentNode);
        this.input.dataset.navDown =
          this.inputCleanButton.dataset.navDown =
          this.hideCardPickerButton.dataset.navUp =
          '#card-picker-grid-view [data-card-id="' + elem.dataset.cardId + '"]';
      }
    },

    onMove: function(direction) {
      var elem = this._spatialNavigator.getFocusedElement();

      if (this.isKeyboardOpened) {
        // Check if the input caret is at the end of the input value,
        // If yes, proceed to the below code to
        // navigate to the inputCleanButton in the right side.
        // Else, let's return to let user keeps moving the caret on the input.
        if (direction === 'right' &&
           (this.input.selectionEnd === this.input.value.length &&
            this.input.selectionStart === this.input.value.length)) {
        } else {
          return;
        }
      }

      this._spatialNavigator.move(direction);

      if (direction === 'left' && elem === this.inputCleanButton) {
        // Moving left would focus back to the input so let's open the keyboard
        this.openKeyboard();
      } else if (direction === 'down' && elem === this.inputCleanButton) {
        // Moving down would focus card so let's hide the inputCleanButton
        this.inputCleanButton.classList.add('hidden');
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
        } else if (this.mode == 'add') {
          if (this.selected.length) {
            this._showPanel();
          } else {
            this._hidePanel();
          }
        }
      } else if (elem === this.input) {
        if (this.isKeyboardOpened) {
          this.closeKeyboard();
          this.inputCleanButton.classList.add('hidden');
        } else {
          this.openKeyboard();
          this.inputCleanButton.classList.remove('hidden');
        }
      } else if (elem === this.inputCleanButton) {
        this.input.value = '';
        this._spatialNavigator.focus(this.input);
        this.openKeyboard();
      }
    },

    onKeyUp: function(evt) {
      if (SharedUtils.isBackKey(evt) &&
          this.isShown && !this.isKeyboardOpened) {
        var Ids = JSON.stringify(
          Array.from(this.selected).map(elem => elem.dataset.cardId));
        if (Ids != this._initialSelectedIds ||
            this.input.dataset.dirty === '1') {
          document.l10n.formatValue('cancel-add-folder').then(message => {
            if (confirm(message)) {
              this.mode = null;
              this.hide();
            }
          });
        } else {
          this.mode = null;
          this.hide();
        }
      }
    },

    show: function(folderElem) {
      // We will set dataset.dirty to '1' if input has been changed
      this.input.dataset.dirty = '0';

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
      if (this.mode == 'add') {
        // Hide the panel first since no card is selected
        this._hidePanel();
      } else {
        this._showPanel();
      }
      this.refresh(folderElem);
      this.inputCleanButton.classList.add('hidden');
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
          this._refreshCardElements(folderList, cardList);
          this.updateCapacityCount();
          this._spatialNavigator.setCollection(
                      Array.from(this.allItems).concat(this.navigableElements));
          this._spatialNavigator.focus();
          this._initialSelectedIds = JSON.stringify(
            Array.from(this.selected).map(elem => elem.dataset.cardId));
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

    _refreshCardElements: function(folderList, cardList) {
      var candidates = [];

      this.appCardElems = [];
      this.gridView.innerHTML = '';

      var that = this;
      function appendToGridView(appCardElem) {
        that.gridView.appendChild(appCardElem);
        that.appCardElems.push(appCardElem);
      }
      function createCardElemHelper(card, parentType) {
        if(card instanceof Folder || card instanceof Deck) {
          return;
        }
        var nodeElem = document.createElement('div');
        nodeElem.appendChild(CardUtil.createCardFragment(card, true));
        return nodeElem;
      }

      folderList && folderList.forEach(card => {
        var appCardElem = createCardElemHelper(card);
        if (appCardElem) {
          var cardButton = appCardElem.firstElementChild;
          cardButton.dataset.parentType = 'folder';
          cardButton.classList.add('selected');
          appendToGridView(appCardElem);
        }
      });

      cardList && cardList.forEach((card, index) => {
        var appCardElem = createCardElemHelper(card);
        if (appCardElem) {
          var cardButton = appCardElem.firstElementChild;
          cardButton.dataset.parentType = 'empty';
          candidates.push({
            index: index,
            key: CardUtil.getSortKey(card),
            element: appCardElem
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
        candidates.forEach(candidate => appendToGridView(candidate.element));
      }

      var cardsPerRow = 0;
      var firstRowTop;

      this.appCardElems.some(elem => {
        var rect = elem.getBoundingClientRect();
        if (firstRowTop && rect.top != firstRowTop) {
          return true;
        }
        firstRowTop = rect.top;
        cardsPerRow++;
      });

      var length = this.appCardElems.length;
      for(var i = 0; i < length; i += cardsPerRow) {
        var left = this.appCardElems[i].firstChild;
        var right =
          this.appCardElems[Math.min(i + cardsPerRow, length) - 1].firstChild;
        left.dataset.navLeft =
         '#card-picker-grid-view [data-card-id="' + right.dataset.cardId + '"]';
        right.dataset.navRight =
          '#card-picker-grid-view [data-card-id="' + left.dataset.cardId + '"]';
      }

      // If the residual > 0, that means the number of cards at the last row
      // isn't enough to fill up one row. So some cards at the last 2nd row
      // wouldn't have card below them. Let's make these cards at the 2nd row
      // navigate to the last card when moving down.
      var residual = length % cardsPerRow;
      if (residual) {
        var startIdx = length - cardsPerRow;
        var endIdx = length - residual - 1;
        var lastCardSelector = '#card-picker-grid-view [data-card-id="' +
          this.appCardElems[length - 1].firstChild.dataset.cardId + '"]';
        while (startIdx <= endIdx) {
          this.appCardElems[startIdx].firstChild.dataset
                                                .navDown = lastCardSelector;
          ++startIdx;
        }
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

    _showPanel: function () {
      if (this.mode == 'add' && this.selected.length <= 0) {
        return;
      }
      this.panel.classList.remove('hidden');
    },

    _hidePanel: function () {
      this.panel.classList.add('hidden');
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
      return this._selectedButtons;
    },

    get allItems() {
      return this._appButtons;
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
