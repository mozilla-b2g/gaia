/* global evt, KeyNavigationAdapter, SpatialNavigator, Folder, Deck,
          CardUtil */

(function(exports) {
  'use strict';

  function CardPicker() {}

  CardPicker.prototype = evt({
    container: document.getElementById('card-picker'),
    gridView: document.getElementById('card-picker-grid-view'),

    hideCardPickerButton: document.getElementById('hide-cardpicker-button'),

    init: function(options) {
      this.appButtons = [];

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
      this._keyNavigationAdapter.on('move', direction => {
        this._spatialNavigator.move(direction);
      });
      this._keyNavigationAdapter.on('enter-keyup', this.onEnter.bind(this));

      this.refresh();
    },

    onFocus: function(elem) {
      elem.focus();
      if (elem.classList.contains('app-button')) {
        this._scrollTo(elem);
      }
    },

    onEnter: function() {
    },

    show: function(folderElem) {
      this.refresh(folderElem);
      this.container.classList.remove('hidden');
      this.focus();
    },

    hide: function() {
      this.container.classList.add('hidden');
      this.fire('hide');
    },

    refresh: function(folderElem) {
      this._cardManager.getCardList()
        .then(this._refreshCardButtons.bind(this))
        .then(() => {
          this._spatialNavigator.setCollection(
                            this.appButtons.concat(this.navigableElements));
          this._spatialNavigator.focus(this.appButtons[0]);
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

    _refreshCardButtons: function(cardList, options) {
      this.appButtons = [];
      this.gridView.innerHTML = '';

      var that = this;
      function createButtonHelper(card) {
        if(card instanceof Folder || card instanceof Deck) {
          return;
        }

        var appButton = CardUtil.createCardButton(card);
        that.gridView.appendChild(appButton);
        that.appButtons.push(appButton);
        return appButton;
      }

      cardList && cardList.forEach(card => {
        var appButton = createButtonHelper(card);
        if (appButton) {
          appButton.dataset.parentType = 'empty';
        }
      });
    },

    /**
     * Properties
     */
    get isShown() {
      return !this.container.classList.contains('hidden');
    },
  });
  exports.CardPicker = CardPicker;
}(window));
