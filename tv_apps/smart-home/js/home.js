'use strict';
/* global SpatialNavigator, KeyEvent, SelectionBorder, XScrollable */
/* global CardManager, URL, Application, Clock, CardFilter */

(function(exports) {

  function Home() {}

  Home.prototype = {
    navigableIds: ['search-button', 'search-input', 'settings-group', 'filter-tab-group'],
    navigableClasses: ['filter-tab', 'command-button'],
    navigableScrollable: [],
    cardScrollable: undefined,
    folderScrollable: undefined,
    _focus: undefined,
    _focusScrollable: undefined,

    cardFilter: undefined,

    cardListElem: document.getElementById('card-list'),
    cardManager: undefined,
    settingGroup: document.getElementById('settings-group'),
    editButton: document.getElementById('edit-button'),
    settingsButton: document.getElementById('settings-button'),

    init: function() {
      var that = this;

      this.initClock();

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

        that.cardFilter = new CardFilter();
        that.cardFilter.start(document.getElementById('filter-tab-group'));
        // all's icon name is filter
        that.cardFilter.filter = CardFilter.FILTERS.ALL;
        that.cardFilter.on('filterchanged', that.onFilterChanged.bind(that));
      });
    },

    initClock: function() {
      var that = this;
      navigator.mozL10n.ready(function() {
        that.clock = new Clock();
        that.clock.start(that.updateClock.bind(that));
        // Listen to 'moztimechange'
        window.addEventListener('moztimechange',
                                that.restartClock.bind(that));
        // Listen to 'timeformatchange'
        window.addEventListener('timeformatchange',
                                that.restartClock.bind(that));

      });
    },

    onCardInserted: function(card, idx) {
      this.cardScrollable.insertNodeBefore(this._createCardNode(card), idx + 1);
    },

    onCardRemoved: function(card) {
      this.cardScrollable.removeNode(card);
    },

    onFilterChanged: function(name) {
      console.log('filter changed to: ' + name);
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
        this.checkFocusedGroup();
      } else if (elem.nodeName) {
        if (this._focus) {
          this._focus.blur();
        }

        switch(elem.nodeName.toLowerCase()) {
          case 'menu-group':
            this.handleFocusMenuGroup(elem);
            break;
          default:
            this.selectionBorder.select(elem);
            elem.focus();
            this._focus = elem;
            this._focusScrollable = undefined;
            this.checkFocusedGroup(elem);
            break;
        }
      } else {
        this.selectionBorder.selectRect(elem);
        this._focusScrollable = undefined;
      }
    },

    checkFocusedGroup: function(elem) {
      if (!this._focusedGroup) {
        return;
      }
      // close the focused group when we move focus out of this group.
      if (!elem || !this._focusedGroup.contains(elem)) {
        this._focusedGroup.close();
        this._focusedGroup = null;
      }
    },

    handleFocusMenuGroup: function(menuGroup) {
      var self = this;
      menuGroup.once('opened', function() {
        self.spatialNavigator.remove(menuGroup);
        var childElement = menuGroup.firstElementChild;
        var firstFocusable = null;
        while(childElement) {
          switch(childElement.nodeName.toLowerCase()) {
            case 'style':
            case 'script':
              break;
            default:
              firstFocusable = firstFocusable || childElement;
              self.spatialNavigator.add(childElement);
          }
          childElement = childElement.nextElementSibling;
        }
        if (firstFocusable) {
          self.spatialNavigator.focus(firstFocusable);
        }
      });
      menuGroup.once('will-close', function() {
        self.spatialNavigator.add(menuGroup);
        var childElement = menuGroup.firstElementChild;
        while(childElement) {
          switch(childElement.nodeName.toLowerCase()) {
            case 'style':
            case 'script':
              break;
            default:
              self.spatialNavigator.remove(childElement);
          }
          childElement = childElement.nextElementSibling;
        }
      });
      this.checkFocusedGroup(menuGroup);
      this._focusedGroup = menuGroup;
      menuGroup.open();
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

    updateClock: function() {
      var now = new Date();
      var _ = navigator.mozL10n.get;
      var use12Hour = window.navigator.mozHour12;

      var f = new navigator.mozL10n.DateTimeFormat();

      var timeFormat = use12Hour ? _('shortTimeFormat12') :
                                   _('shortTimeFormat24');
      // remove AM/PM and we use our owned style to show it.
      var timeFormat = timeFormat.replace('%p', '').trim();
      var formatted = f.localeFormat(now, timeFormat);

      var timeElem = document.getElementById('time');
      timeElem.innerHTML = formatted;
      timeElem.dataset.ampm = use12Hour ? f.localeFormat(now, '%p') : '';
    },

    restartClock: function() {
      navigator.mozL10n.ready((function() {
        // restart clcok
        this.clock.stop();
        this.clock.start(this.updateClock.bind(this));
      }).bind(this));
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
