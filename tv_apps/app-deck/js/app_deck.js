/* global SpatialNavigator, SharedUtils, Applications, URL, evt, XScrollable,
  KeyNavigationAdapter, ContextMenu, CardManager, PromotionList,
  BookmarkManager */

(function(exports) {
  'use strict';

  const ICON_SIZE = 180 * (window.devicePixelRatio || 1);
  const DEFAULT_ICON_PATH = 'style/icons/appic_developer.png';

  /**
   * @class AppDeck
   *
   * @requires SpatialNavigator
   * @requires SharedUtils
   * @requires Applications
   * @requires {@link http://bit.ly/1DWJJmF|evt}
   * @requires XScrollable
   * @requires KeyNavigationAdapter
   * @requires {@link ContextMenu}
   * @requires CardManager
   * @requires {@link PromotionList}
   *
   * @fires AppDeck#focus
   */
  var AppDeck = function() {
  };

  AppDeck.prototype = evt({
    _navigableElements: [],

    _spatialNavigator: undefined,

    _keyNavigationAdapter: undefined,

    _contextMenu: undefined,

    _focusElem: undefined,

    _appDeckGridViewElem: document.getElementById('app-deck-grid-view'),

    _appDeckListScrollable: undefined,

    _cardManager: undefined,

    _bookmarkManager: undefined,

    _outOfControlArea: true,

    _disableNavigation: false,
    /**
     * Initialize AppDeck. This is the main entry of the whole app.
     *
     * @public
     * @method  AppDeck#init
     */
    init: function ad_init() {
      var that = this;
      this._keyNavigationAdapter = new KeyNavigationAdapter();
      this._keyNavigationAdapter.init();
      this._cardManager = new CardManager();
      // initialize CardManager in 'readonly' mode. Notice that only smart-home
      // could use 'readwrite' mode.
      this._cardManager.init('readonly').then(function() {
        that._cardManager.on('cardlist-changed',
                             that.onCardListChanged.bind(that));
      });

      this._bookmarkManager = BookmarkManager;
      this._bookmarkManager.init(null, 'readwrite');
      this._bookmarkManager.on('change', that.onBookmarkChanged.bind(that));

      // Because module Applications use manifest helper to get localized app
      // name. We cannot initialize Applications until l10n is ready.
      // See bug 1170083.
      var afterApplicationsInit = function() {
        var apps = Applications.getAllAppEntries();
        var appGridElements = apps.map(that._createAppGridElement.bind(that));
        appGridElements.forEach(function(appGridElem) {
          that._appDeckGridViewElem.appendChild(appGridElem);
        });

        // Add Bookmarks
        var bookmarkArr = [];
        that._bookmarkManager.iterate(function(bookmark) {
          bookmarkArr.push(bookmark);
        }).then(function() {
          bookmarkArr.sort((a, b) => a.date - b.date);
          bookmarkArr.forEach(bookmark => {
            var elem = that._createBookmarkGridElement(bookmark);
            that._appDeckGridViewElem.appendChild(elem);
            that._spatialNavigator.add(elem);
          });
        });

        // promotion list must be created before XScrollable because it creates
        // elements for XScrollable.
        that._promotionList = new PromotionList();
        that._promotionList.init();

        that._appDeckListScrollable = new XScrollable({
          frameElem: 'app-deck-list-frame',
          listElem: 'app-deck-list',
          itemClassName: 'app-deck-list-item',
          margin: 1.4
        });
        that._navigableElements =
          SharedUtils.nodeListToArray(
            document.querySelectorAll('.navigable:not(.app-banner)'))
            .concat(appGridElements);
        that._spatialNavigator = new SpatialNavigator(that._navigableElements);

        that._keyNavigationAdapter.on('move', that.onMove.bind(that));
        // All behaviors which no need to have multple events while holding the
        // key should use keyup.
        that._keyNavigationAdapter.on('enter-keyup', that.onEnter.bind(that));
        that._spatialNavigator.on('focus', that.onFocus.bind(that));
        that._spatialNavigator.on('unfocus', that.onUnfocus.bind(that));
        that._appDeckListScrollable.on('focus',
          that.onFocusOnAppDeckListScrollable.bind(that));
        // start focusing on promotion list
        that._appDeckListScrollable.focus();
        that._contextMenu = new ContextMenu();
        that._contextMenu.init(that);
        Applications.on('install', that.onAppInstalled.bind(that));
        Applications.on('update', that.onAppUpdated.bind(that));
        Applications.on('uninstall', that.onAppUninstalled.bind(that));
      };

      Applications.init(afterApplicationsInit);
    },

    /**
     * Fills element with icon which is fetched from
     * [app](http://mzl.la/1DJP6oZ)
     *
     * @private
     * @method  AppDeck#_fillAppButtonIcon
     * @param  {DOMApplication} app - app instance where we fetch icon from,
     *                              see [here](http://mzl.la/1DJP6oZ)
     * @param  {SmartButton} elem - [SmartButton](http://bit.ly/1Ld0WYX)
     *                            instance to be filled
     */
    _fillAppButtonIcon: function ad_fillAppButtonIcon(app, elem) {
      Applications.getIconBlob(app.manifestURL, app.entryPoint, ICON_SIZE,
        function(blob) {
          var iconURL = blob ? URL.createObjectURL(blob) : DEFAULT_ICON_PATH;
          if (elem.dataset.revokableURL) {
            // make sure to revoke iconURL once it is no longer needed.
            // For example, icon is changed or app is uninstalled
            URL.revokeObjectURL(elem.dataset.revokableURL);
          }
          elem.dataset.revokableURL = blob ? iconURL : undefined;
          elem.style.backgroundImage = 'url("' + iconURL + '")';
        });
    },

    /**
     * Create SmartButton element based on input [app](http://mzl.la/1DJP6oZ)
     * instance
     *
     * @private
     * @method  AppDeck#_createAppGridElement
     * @param  {DOMApplication} app - [app](http://mzl.la/1DJP6oZ|)
     *                                    instance
     * @return {SmartButton} - see [here](http://bit.ly/1Ld0WYX)
     */
    _createAppGridElement: function ad_createAppGridElement(app) {
      var appButton = document.createElement('smart-button');
      appButton.dataset.manifestURL = app.manifestURL;
      appButton.dataset.entryPoint = app.entryPoint;
      appButton.dataset.name = app.name;
      appButton.dataset.removable = app.removable;
      appButton.setAttribute('type', 'app-button');
      appButton.setAttribute('app-type', 'app');
      appButton.classList.add('app-button');
      appButton.classList.add('navigable');
      appButton.setAttribute('label', app.name);
      this._fillAppButtonIcon(app, appButton);
      return appButton;
    },

    _createBookmarkGridElement: function ad_createBookmarkElement(bookmark) {
      var bookmarkButton = document.createElement('smart-button');
      bookmarkButton.dataset.url = bookmark.url;
      bookmarkButton.dataset.name = bookmark.name;
      bookmarkButton.dataset.removable = true;
      bookmarkButton.setAttribute('type', 'app-button');
      bookmarkButton.setAttribute('app-type', 'bookmark');
      bookmarkButton.classList.add('app-button');
      bookmarkButton.classList.add('navigable');
      bookmarkButton.setAttribute('label', bookmark.name);

      if(bookmark.icon) {
        var iconURL = URL.createObjectURL(bookmark.icon);
        bookmarkButton.dataset.revokableURL = iconURL;
        bookmarkButton.style.backgroundImage = 'url("' + iconURL + '")';
      }
      return bookmarkButton;
    },

    onCardListChanged: function ad_onCardListChanged() {
      if (this._focusElem) {
        this.fireFocusEvent(this._focusElem);
      }
    },

    onBookmarkChanged: function ad_onBookmarkChanged(evt) {
      var targetElem;
      switch (evt.operation) {
        case 'added':
          this._bookmarkManager.get(evt.id).then(bookmark => {
            targetElem = this._createBookmarkGridElement(bookmark);
            this._appDeckGridViewElem.appendChild(targetElem);
            this._spatialNavigator.add(targetElem);
          });
          break;
        case 'removed':
          targetElem = this._appDeckGridViewElem.querySelector(
                                    'smart-button[data-url="' + evt.id +'"]');

          // Move focus to next or previous element of `elem`, because
          // we are going to remove `elem` from DOM tree
          var nextFocus = targetElem.nextElementSibling ||
                          targetElem.previousElementSibling;
          this._spatialNavigator.focus(nextFocus);

          this._appDeckGridViewElem.removeChild(targetElem);
          this._spatialNavigator.remove(targetElem);
          URL.revokeObjectURL(targetElem.dataset.revokableURL);
          // Unpinning bookmarks are sended in smart-system/bookmark_handler.js
          // when datastore.onremove is fired. So we don't need to send unpin
          // for that.
          break;
      }
    },

    /**
     * Notify other modules about details of currently focused element.
     *
     * @public
     * @method  AppDeck#fireFocusEvent
     * @param  {HTMLElement} elem - currently focused element
     */
    /**
     * This event is fired whenever the focus in AppDeck moves to a pinnable
     * element (For now it's an app or a bookmark).
     * @event AppDeck#focus
     * @type {Object}
     * @property {HTMLElement} elem - currently focused element
     * @property {Boolean} pinned - Has it been pinned to Home
     */
    fireFocusEvent: function ad_fireFocusEvent(elem) {
      var that = this;
      var type = elem && elem.getAttribute('app-type');

      var query;
      if (type === 'app') {
        query = {
          manifestURL: elem.dataset.manifestURL,
          entryPoint: elem.dataset.entryPoint
        };
      } else if (type === 'bookmark') {
        query = {
          url: elem.dataset.url
        };
      } else {
        // We have no other types for now.
        return;
      }

      this._cardManager.isPinned(query).then(pinned => {
        that.fire('focus', {
          elem: elem,
          pinned: pinned
        });
      });
    },

    onFocus: function ad_onFocus(elem) {
      // The _focusElement may be XScrollable. It doesn't have blur method. If
      // it has blur method, it should be DOM element.
      if (this._focusElem && this._focusElem.blur) {
        this._focusElem.blur();
      }

      if (elem instanceof XScrollable) {
        // When we move focus from smart-button to scrollable,
        // we have to remember the last focused smart-button in app list. So
        // that, we can move focus back to app-deck-grid-view area afterwards.
        if (this._focusElem) {
          if (this._focusElem.nodeName === 'SMART-BUTTON') {
            this._lastFocusedSmartButton = this._focusElem;
          }
        }
        this._focusElem = elem;
        elem.focus();
      } else if (elem.nodeName) {

        // When we move focus back to app-deck-grid-view area
        // (e.g. area contains smart-button), we should always focus on
        // last focused smart-button if there is any
        if (elem.nodeName === 'SMART-BUTTON' && this._lastFocusedSmartButton) {
          elem = this._lastFocusedSmartButton;
          this._spatialNavigator.focus(elem);
        }
        elem.focus();
        // Locate focused button to vertical middle of grid view. This way
        // buttons one row above would always slightly be on bottom of the
        // topmost scroll list (accroding to our layout). Thus we can prevent
        // jumping from second row to the scroll list when pressing up key.
        this._scrollTo(elem);
        this._focusElem = elem;
      }

      this.fireFocusEvent(elem);
    },

    _scrollTo: function ad_scrollTo(elem) {
      var scrollY = (elem.offsetTop - this._appDeckGridViewElem.offsetTop) -
              (this._appDeckGridViewElem.offsetHeight - elem.offsetHeight) / 2;
      this._appDeckGridViewElem.scrollTo(0, scrollY);
    },

    onUnfocus: function ad_onUnfocus(elem) {
      // When we move focus from smart-button to another smart-button,
      // we don't have to remember last focused smart-button
      if (elem.nodeName === 'SMART-BUTTON') {
        this._lastFocusedSmartButton = undefined;
      }
    },

    onFocusOnAppDeckListScrollable:
      function ad_onFocusOnAppDeckListScrollable(scrollable, itemElem) {
        itemElem.focus();
      },

    onEnter: function ad_onEnter() {
      if (this._disableNavigation) {
        return;
      }

      var focused = this._spatialNavigator.getFocusedElement();
      if (focused && focused.dataset && focused.dataset.manifestURL) {
        Applications.launch(
          focused.dataset.manifestURL, focused.dataset.entryPoint);
      } else if (focused && focused.dataset && focused.dataset.url) {
        window.open(focused.dataset.url, '_blank', 'remote=true,applike=true');
      }
    },

    onMove: function ad_onMove(key) {
      if (this._disableNavigation) {
        return;
      }

      // When we are not in the SpatialNavigator's control area,
      // use XScrollable object's spatial navigator to move.
      // If it fails to move, and it's a 'down' operation, then we
      // move into the last focused element within SpatialNavigator's
      // control area.
      if (this._outOfControlArea) {
        if (!this._appDeckListScrollable.spatialNavigator.move(key) &&
            key == 'down') {
          this._spatialNavigator.focus(this._lastFocusedSmartButton);
          this._outOfControlArea = false;
        }
      } else {
        // Vice versa.
        if (!this._spatialNavigator.move(key) && key == 'up') {
          this._appDeckListScrollable.focus();
          this._outOfControlArea = true;
        }
      }
    },

    onAppInstalled: function ad_onAppInstalled(apps) {
      var that = this;
      var appGridElements = apps.map(this._createAppGridElement.bind(this));
      var firstBookmarkElem = this._appDeckGridViewElem.querySelector(
        'smart-button[app-type="bookmark"]');

      appGridElements.forEach(function(elem) {
        that._appDeckGridViewElem.insertBefore(elem, firstBookmarkElem);
        that._spatialNavigator.add(elem);
      });
    },

    onAppUpdated: function ad_onAppUpdated(apps) {
      var that = this;
      var appGridElements = apps.map(this._findAppGridElement.bind(this));
      appGridElements.forEach(function(elem, index) {
        var app = apps[index];
        elem.dataset.name = app.name;
        that._fillAppButtonIcon(app, elem);
      });
    },

    onAppUninstalled: function ad_onAppUninstalled(apps) {
      var that = this;
      var appGridElements = apps.map(this._findAppGridElement.bind(this));
      appGridElements.forEach(function(elem) {
        if (elem.dataset.revokableURL) {
          URL.revokeObjectURL(elem.dataset.revokableURL);
        }
        // Move focus to next or previous element of `elem`, because
        // we are going to remove `elem` from DOM tree
        var nextFocus = elem.nextElementSibling || elem.previousElementSibling;
        that._spatialNavigator.focus(nextFocus);

        that._spatialNavigator.remove(elem);
        that._appDeckGridViewElem.removeChild(elem);
      });
    },

    /**
     * Shorthand function to get all SmartButtons of apps
     *
     * @private
     * @method  AppDeck#_findAllAppGridElements
     * @return {Array} array of SmartButton
     */
    _findAllAppGridElements: function ad_findallAppGridElements() {
      return SharedUtils.nodeListToArray(
        document.getElementsByClassName('app-button'));
    },

    /**
     * Shorthand function to find specific SmartButton representing the app
     *
     * @private
     * @method  AppDeck#_findAppGridElement
     * @param  {DOMApplication} app  the [app](http://mzl.la/1DJP6oZ) instance
     *                               which we want to find SmartButton is
     *                               represented for
     * @return {SmartButton}
     */
    _findAppGridElement: function ad_findAppGridElement(app) {
      var elements = this._findAllAppGridElements();
      var found;
      elements.some(function(element) {
        if (element.dataset.manifestURL === app.manifestURL) {
          found = element;
          return true;
        }
        return false;
      });
      return found;
    },

    disableNavigation: function ad_stopNavigation() {
      this._disableNavigation = true;
    },

    enableNavigation: function ad_stopNavigation() {
      this._disableNavigation = false;
      this._spatialNavigator.focus();
    }
  });

  exports.appDeck = new AppDeck();
  exports.appDeck.init();

}(window));
