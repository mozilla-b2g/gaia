'use strict';
/* global SpatialNavigator, KeyEvent, XScrollable */
/* global CardManager, URL, Application, Clock */

(function(exports) {

  const FULLSIZED_ICON = 336;
  const DEFAULT_ICON = 'url("/style/images/appic_developer.png")';
  const DEFAULT_BGCOLOR = 'rgba(0, 0, 0, 0.5)';
  const DEFAULT_BGCOLOR_ARRAY = [0, 0, 0, 0.5];

  function Home() {}

  Home.prototype = {
    navigableIds:
        ['search-button', 'search-input', 'settings-group', 'filter-tab-group'],

    topElementIds: ['search-button', 'search-input', 'settings-group',
        'edit-button', 'settings-button'],
    bottomElementIds: ['filter-tab-group', 'filter-all-button',
        'filter-tv-button', 'filter-dashboard-button', 'filter-device-button',
        'filter-app-button'],

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
                itemClassName: 'app-button'}),
        that.navigableScrollable = [that.cardScrollable];
        var collection = that.getNavigateElements();

        that.spatialNavigator = new SpatialNavigator(collection);
        that.keyNavigatorAdapter = new KeyNavigationAdapter();
        that.keyNavigatorAdapter.init();
        that.keyNavigatorAdapter.on('move', that.onMove.bind(that));
        that.keyNavigatorAdapter.on('enter', that.onEnter.bind(that));

        that.cardManager.on('card-inserted', that.onCardInserted.bind(that));
        that.cardManager.on('card-removed', that.onCardRemoved.bind(that));

        that.spatialNavigator.on('focus', that.handleFocus.bind(that));
        that.spatialNavigator.on('unfocus', that.handleUnfocus.bind(that));
        var handleScrollableItemFocusBound =
                                    that.handleScrollableItemFocus.bind(that);
        var handleScrollableItemUnfocusBound =
                                    that.handleScrollableItemUnfocus.bind(that);
        that.navigableScrollable.forEach(function(scrollable) {
          scrollable.on('focus', handleScrollableItemFocusBound);
        });
        that.navigableScrollable.forEach(function(scrollable) {
          scrollable.on('unfocus', handleScrollableItemUnfocusBound);
        });

        that.spatialNavigator.focus();

        that.cardFilter = new CardFilter();
        that.cardFilter.start(document.getElementById('filter-tab-group'));
        // all's icon name is filter
        that.cardFilter.filter = CardFilter.FILTERS.ALL;
        that.cardFilter.on('filterchanged', that.onFilterChanged.bind(that));

        that.edit = new Edit();
        that.edit.init(
                  that.spatialNavigator, that.cardManager, that.cardScrollable);
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

    onCardRemoved: function(indices) {
      var that = this;
      indices.forEach(function(idx) {
        var elm = that.cardScrollable.getNode(idx);
        if (elm.dataset.revokableURL) {
          URL.revokeObjectURL(elm.dataset.revokableURL);
        }
        that.cardScrollable.removeNode(idx);
      });
    },

    _setCardIcon: function (cardButton, card, blob, bgColor) {
       try {
        var bgUrl = URL.createObjectURL(blob);
        if (bgColor) {
          cardButton.style.backgroundColor = bgColor;
          cardButton.classList.add('fitted');
          card.backgroundType = 'fitted';
        } else {
          cardButton.classList.add('fullsized');
          card.backgroundType = 'fullsized';
        }
        cardButton.dataset.revokableURL = bgUrl
        cardButton.style.backgroundImage = 'url("' + bgUrl + '")';
      } catch (e) {
        // If the blob is broken, we may get an exception while creating object
        // URL.
        cardButton.style.backgroundImage = DEFAULT_ICON;
        cardButton.style.backgroundColor = DEFAULT_BGCOLOR;
      }
    },

    _fillCardIcon: function(cardButton, card) {
      var manifestURL = card.nativeApp && card.nativeApp.manifestURL;
      var that = this;
      // We have thumbnail which is created by pin
      if (card.thumbnail) {
        this._setCardIcon(cardButton, card, card.thumbnail,
                          card.backgroundColor);
        // TODO add backgroundColor??? How to do it???
      } else if (!card.cachedIconBlob && !card.cachedIconURL) {
        // We don't have cachedIconBlob, just get icon from app
        this.cardManager.getIconBlob({
          manifestURL: manifestURL,
          entryPoint: card.entryPoint,
          // XXX: preferredSize should be determined by
          // real offsetWidth of cardThumbnailElem instead of hard-coded value
          preferredSize: FULLSIZED_ICON
        }).then(function(iconData) {
          var blob = iconData[0];
          var size = iconData[1];
          if (size >= FULLSIZED_ICON) {
            that._setCardIcon(cardButton, blob, null);
          } else {
            that._getIconColor(blob, function(color, err) {
              if (err) {
                that._setCardIcon(cardButton, card, blob, DEFAULT_BGCOLOR);
              } else {
                that._setCardIcon(cardButton, card, blob, 'rgba(' + color[0] +
                  ', ' + color[1] + ', ' + color[2] + ', ' + color[3] + ')');
              }
            });
          }
          card.cachedIconBlob = blob;
        });
      } else if (card.cachedIconBlob) {
        // We already have cacedIconBlob which is created by previous step.
        this._setCardIcon(cardButton, card, card.cachedIconBlob,
                          card.backgroundColor);
      } else if (card.cachedIconURL) {
        // the pre-set icon.
        cardButton.classList.add('fullsized');
        cardButton.style.backgroundImage =
          'url("' + card.cachedIconURL + '")';
      }
    },

    _getIconColor: function(blob, callback) {
      var dy = 0;
      function checkColor(color, err) {
        if (err) {
          callback(null, err);
        } else if (color[3] < 255 && dy < 0.5) {
          dy += 0.25;
          SharedUtils.readColorCode(blob, 0.5, dy, checkColor);
        } else {
          callback(color[3] < 255 ? DEFAULT_BGCOLOR_ARRAY : color, err);
        }
      }

      SharedUtils.readColorCode(blob, 0.5, 0, checkColor);
    },

    onFilterChanged: function(name) {
      console.log('filter changed to: ' + name);
    },

    _createCardNode: function(card) {
      // card element would be created like this:
      // <div class="card">
      //   <smart-button>/* Card button */</smart-button>
      //   <section class="card-panel">
      //     <smart-button>/* Rename button */</smart-button>
      //     <smart-button>/* Delete button */</smart-button>
      //   </section>
      // </div>
      // and return DOM element
      var cardNode = document.createElement('div');
      cardNode.classList.add('card');

      var cardButton = document.createElement('smart-button');
      cardButton.setAttribute('type', 'app-button');
      cardButton.className = 'app-button';
      cardButton.setAttribute('label', card.name);
      cardButton.dataset.cardId = card.cardId;

      var cardPanel = document.createElement('section');
      cardPanel.className = 'card-panel';

      var renameButton = document.createElement('smart-button');
      renameButton.dataset.icon = 'rename';
      renameButton.classList.add('renameBtn');

      var deleteButton = document.createElement('smart-button');
      deleteButton.dataset.icon = 'delete';
      deleteButton.classList.add('deleteBtn');

      cardPanel.appendChild(renameButton);
      cardPanel.appendChild(deleteButton);

      cardNode.appendChild(cardButton);
      cardNode.appendChild(cardPanel);

      // XXX: will support Folder and other type of Card in the future
      // for now, we only create card element for Application and Deck
      if (card instanceof Application) {
        cardButton.setAttribute('app-type', 'app');
        this._fillCardIcon(cardButton, card);
      } else if (card instanceof Deck) {
        cardButton.setAttribute('app-type', 'deck');
        this._fillCardIcon(cardButton, card);
      }

      return cardNode;
    },

    _createCardList: function(cardList) {
      cardList.forEach(function(card) {
        this.cardListElem.appendChild(this._createCardNode(card));
      }.bind(this));
    },

    onMove: function(key) {
      if (this.edit.onMove(key)) {
        return;
      }

      var focus = this.spatialNavigator.getFocusedElement();
      // XXX: We customized some navigating target here for those targets that
      // don't move as we expected.
      // We are planning to replace spatialNavigator with other solution, since
      // most navigating case in smart-home is relatively simpler and
      // spatialNavigator seems a little bit overkilled.
      if((key === 'down' && this.topElementIds.indexOf(focus.id) !== -1) ||
         (key === 'up' && this.bottomElementIds.indexOf(focus.id) !== -1)) {
        this.spatialNavigator.focus(this.cardScrollable);
        return;
      }

      if (!(focus.CLASS_NAME == 'XScrollable' && focus.move(key))) {
        this.spatialNavigator.move(key);
      }
    },

    onEnter: function() {
      if (this.edit.onEnter()) {
        return;
      }

      var focusElem = this.focusElem;

      if (focusElem === this.settingsButton) {
        this.openSettings();
      } else if (focusElem === this.editButton) {
        this.edit.toggleEditMode();

      // Current focus is on a card
      } else {
        var cardId = focusElem.dataset.cardId;
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
        elem.catchFocus();
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
            elem.focus();
            this._focus = elem;
            this._focusScrollable = undefined;
            this.checkFocusedGroup(elem);
            break;
        }
      } else {
        this._focusScrollable = undefined;
      }
    },

    handleUnfocus: function(elem, nodeElem) {
      if(elem.CLASS_NAME == 'XScrollable') {
        this.handleScrollableItemUnfocus(
                elem, elem.currentItem, elem.getNodeFromItem(elem.currentItem));
      }
    },

    checkFocusedGroup: function(elem) {
      if (!this._focusedGroup) {
        return;
      }
      // Settings group should appear opened after switching from edit state
      // back to normal state. So we'd keep it opened while in edit and arrange
      // mode.
      if (this._focusedGroup === this.settingGroup && this.edit.mode) {
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
        // Clear all opened event listener because we won't have it if opened is
        // not fired and the group is trying to close it self.
        menuGroup.off('opened');
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

    handleScrollableItemFocus: function(scrollable, itemElem, nodeElem) {
      itemElem.focus();
      nodeElem.classList.add('focused');
      this._focus = itemElem;
    },

    handleScrollableItemUnfocus: function(scrollable, itemElem, nodeElem) {
      nodeElem.classList.remove('focused');
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
