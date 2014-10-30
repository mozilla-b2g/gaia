'use strict';
/* global SpatialNavigator, KeyEvent, SelectionBorder, XScrollable */
/* global CardManager, URL, Home */

(function(exports) {

  function Home() {}

  Home.prototype = {
    navigableIds: ['search-input'],
    navigableClasses: ['filter-tab', 'command-button'],
    navigableScrollable: [],
    cardScrollable: undefined,
    folderScrollable: undefined,
    _focus: undefined,

    cardListElem: document.getElementById('card-list'),
    cardManager: undefined,

    init: function() {
      var that = this;
      this.cardManager = new CardManager();
      this.cardManager.init();

      this.cardManager.getCardList().then(function(cardList) {
        that._createCardList(cardList);
        that.cardScrollable = new XScrollable({
                frameElem: 'card-list-frame',
                listElem: 'card-list',
                items: 'card-thumbnail'}),
        that.folderScrollable = new XScrollable({
                frameElem: 'folder-list-frame',
                listElem: 'folder-list',
                items: 'folder-card-thumbnail'}),
        that.navigableScrollable = [that.cardScrollable, that.folderScrollable];
        var collection = that.getNavigateElements();
        that.spatialNavigator = new SpatialNavigator(collection);
        that.selectionBorder = new SelectionBorder({
            multiple: false,
            container: document.getElementById('main-section'),
            forground: true });

        window.addEventListener('keydown', that.handleKeyEvent.bind(that));

        that.spatialNavigator.on('focus', that.handleFocus.bind(that));
        var handleScrollableItemFocusBound =
                                    that.handleScrollableItemFocus.bind(that);
        that.navigableScrollable.forEach(function(scrollable) {
          scrollable.on('focus', handleScrollableItemFocusBound);
        });
        that.spatialNavigator.focus();
      });
    },

    _createCardElement: function(card) {
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
        if (!card.cachedIconBlob && !card.cachedIconURL) {
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
      var that = this;
      cardList.forEach(function(card) {
        that.cardListElem.appendChild(that._createCardElement(card));
      });
    },

    handleKeyEvent: function(evt) {
      // XXX : It's better to use KeyEvent.Key and use "ArrowUp", "ArrowDown",
      // "ArrowLeft", "ArrowRight" for switching after Gecko synced with W3C
      // KeyboardEvent.Key standard. Here we still use KeyCode and customized
      // string of "up", "down", "left", "right" for the moment.
      var key = this.convertKeyToString(evt.keyCode);
      switch (key) {
        case 'up':
        case 'down':
        case 'left':
        case 'right':
          var focus = this.spatialNavigator.getFocusedElement();
          if (focus.CLASS_NAME == 'XScrollable') {
            if (focus.spatialNavigator.move(key)) {
              return;
            }
          }
          this.spatialNavigator.move(key);
          break;
        case 'enter':
          var cardId = this.focusElem.dataset.cardId;
          var card = this.cardManager.findCardFromCardList({cardId: cardId});
          if (card) {
            card.launch();
          }
          break;
      }
    },

    convertKeyToString: function(keyCode) {
      switch (keyCode) {
        case KeyEvent.DOM_VK_UP:
          return 'up';
        case KeyEvent.DOM_VK_RIGHT:
          return 'right';
        case KeyEvent.DOM_VK_DOWN:
          return 'down';
        case KeyEvent.DOM_VK_LEFT:
          return 'left';
        case KeyEvent.DOM_VK_RETURN:
          return 'enter';
        case KeyEvent.DOM_VK_ESCAPE:
          return 'esc';
        case KeyEvent.DOM_VK_BACK_SPACE:
          return 'esc';
        default:// we don't consume other keys.
          return null;
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
        elem.spatialNavigator.focus(elem.spatialNavigator.getFocusedElement());
      } else if (elem.nodeName) {
        this.selectionBorder.select(elem);
        this._focus = elem;
      } else {
        this.selectionBorder.selectRect(elem);
      }
    },

    handleScrollableItemFocus: function(scrollable, elem) {
      this.selectionBorder.select(elem, scrollable.getItemRect(elem));
      this._focus = elem;
    },

    get focusElem() {
      return this._focus;
    }
  };

  exports.Home = Home;
}(window));

window.home = new Home();
window.home.init();
