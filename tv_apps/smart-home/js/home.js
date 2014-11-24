'use strict';
/* global SpatialNavigator, KeyEvent, SelectionBorder, XScrollable */
/* global CardManager, URL, Application */

(function(exports) {

  function Home() {}

  Home.prototype = {
    navigableIds: ['search-input'],
    navigableClasses: ['filter-tab', 'command-button'],
    navigableScrollable: [],
    cardScrollable: undefined,
    folderScrollable: undefined,
    _focus: undefined,
    _focusScrollable: undefined,

    cardListElem: document.getElementById('card-list'),
    cardManager: undefined,
    settingsButton: document.getElementById('settings-button'),

    init: function() {
      var that = this;

      this.cardManager = new CardManager();
      this.cardManager.init();
      this.cardManager.getCardList().then(function(cardList) {
        that._createCardList(cardList);
        that.cardScrollable = new XScrollable({
                frameElem: 'card-list-frame',
                listElem: 'card-list',
                itemClassName: 'card-thumbnail'}),
        that.folderScrollable = new XScrollable({
                frameElem: 'folder-list-frame',
                listElem: 'folder-list',
                itemClassName: 'folder-card-thumbnail'}),

        that.navigableScrollable = [that.cardScrollable, that.folderScrollable];
        var collection = that.getNavigateElements();

        that.spatialNavigator = new SpatialNavigator(collection);
        that.keyNavigatorAdapter = new KeyNavigationAdapter();
        that.keyNavigatorAdapter.init();
        that.keyNavigatorAdapter.on('move', that.onMove.bind(that));
        that.keyNavigatorAdapter.on('enter', that.onEnter.bind(that));

        that.selectionBorder = new SelectionBorder({
            multiple: false,
            container: document.getElementById('main-section'),
            forground: true });

        that.cardManager.on('card-inserted', that.onCardInserted.bind(that));
        that.cardManager.on('card-removed', that.onCardRemoved.bind(that));

        that.spatialNavigator.on('focus', that.handleFocus.bind(that));
        var handleScrollableItemFocusBound =
                                    that.handleScrollableItemFocus.bind(that);
        that.navigableScrollable.forEach(function(scrollable) {
          scrollable.on('focus', handleScrollableItemFocusBound);
        });
        that.spatialNavigator.focus();

        that.settingsButton.addEventListener('click', function clickSettings() {
          that.spatialNavigator.focus(that.settingsButton);
          that.handleEnter('enter');
        });
      });
    },

    onCardInserted: function(card, idx) {
      this.cardScrollable.insertNodeBefore(this._createCardNode(card), idx + 1);
    },

    onCardRemoved: function(card) {
      this.cardScrollable.removeNode(card);
    },

    _createCardNode: function(card) {
      // we will create card element like this:
      // <div class="card">
      //   <div class="card-thumbnail"></div>
      //   <div class="card-description">This is a card</div>
      // </div>
      // and return DOM element
      var cardContainer = document.createElement('div');
      var cardThumbnailElem = document.createElement('div');
      var cardDescriptionElem = document.createElement('div');
      cardContainer.classList.add('card');
      cardThumbnailElem.classList.add('card-thumbnail');
      cardDescriptionElem.classList.add('card-description');

      // XXX: will support Folder and other type of Card in the future
      // for now, we only create card element for Application and Deck
      if (card instanceof Application || card instanceof Deck) {
        var manifestURL = card.nativeApp && card.nativeApp.manifestURL;
        if (card.thumbnail) {
          try {
            cardThumbnailElem.style.backgroundImage =
            'url("' + URL.createObjectURL(card.thumbnail) + '")';
          } catch (e) {
            cardThumbnailElem.style.background = 'white';
          }
        } else if (!card.cachedIconBlob && !card.cachedIconURL) {
          this.cardManager.getIconBlob({
            manifestURL: manifestURL,
            entryPoint: card.entryPoint,
            // XXX: preferredSize should be determined by
            // real offsetWidth of cardThumbnailElem instead of hard-coded value
            preferredSize: 200
          }).then(function(blob) {
            cardThumbnailElem.style.backgroundImage =
              'url("' + URL.createObjectURL(blob) + '")';
            card.cachedIconBlob = blob;
          });
        } else if (card.cachedIconBlob) {
          cardThumbnailElem.style.backgroundImage =
            'url("' + URL.createObjectURL(card.cachedIconBlob) + '")';
        } else if (card.cachedIconURL) {
          cardThumbnailElem.style.backgroundImage =
            'url("' + card.cachedIconURL + '")';
        }
      }

      cardThumbnailElem.dataset.cardId = card.cardId;
      cardDescriptionElem.textContent = card.name;
      cardContainer.appendChild(cardThumbnailElem);
      cardContainer.appendChild(cardDescriptionElem);
      return cardContainer;
    },

    _createCardList: function(cardList) {
      cardList.forEach(function(card) {
        this.cardListElem.appendChild(this._createCardNode(card));
      }.bind(this));
    },

    onMove: function(key) {
      var focus = this.spatialNavigator.getFocusedElement();
      if (focus.CLASS_NAME == 'XScrollable') {
        if (focus.spatialNavigator.move(key)) {
          return;
        }
      }
      this.spatialNavigator.move(key);
    },

    onEnter: function() {
      if (this.focusElem === this.settingsButton) {
        this.openSettings();
      } else {
        var cardId = this.focusElem.dataset.cardId;
        var card = this.cardManager.findCardFromCardList({cardId: cardId});
        if (card) {
          card.launch();
        }
      }
    },

    getNavigateElements: function() {
      var elements = [];
      this.navigableIds.forEach(function(id) {
        var elem = document.getElementById(id);
        if (elem) {
          elements.push(elem);
        }
      });
      this.navigableClasses.forEach(function(className) {
        var elems = document.getElementsByClassName(className);
        if (elems.length) {
          // Change HTMLCollection to array before concatenating
          elements = elements.concat(Array.prototype.slice.call(elems));
        }
      });
      elements = elements.concat(this.navigableScrollable);
      return elements;
    },

    handleFocus: function(elem) {
      if (elem.CLASS_NAME == 'XScrollable') {
        this._focusScrollable = elem;
        elem.spatialNavigator.focus(elem.spatialNavigator.getFocusedElement());
      } else if (elem.nodeName) {
        this.selectionBorder.select(elem);
        this._focus = elem;
        this._focusScrollable = undefined;
      } else {
        this.selectionBorder.selectRect(elem);
        this._focusScrollable = undefined;
      }
    },

    handleScrollableItemFocus: function(scrollable, elem) {
      this.selectionBorder.select(elem, scrollable.getItemRect(elem));
      this._focus = elem;
    },

    openSettings: function() {
      new MozActivity({
        name: 'configure',
        data: {}
      });
    },

    get focusElem() {
      return this._focus;
    },

    get focusScrollable() {
      return this._focusScrollable;
    }
  };

  exports.Home = Home;
}(window));

window.home = new Home();
window.home.init();
