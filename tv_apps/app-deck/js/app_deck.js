/* global SpatialNavigator, SharedUtils, Applications, URL, evt, XScrollable,
  KeyNavigationAdapter, ContextMenu, CardManager, PromotionList */

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
   * @fires AppDeck#focus-on-pinable
   * @fires AppDeck#focus-on-nonpinable
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

      // Because module Applications use manifest helper to get localized app
      // name. We cannot initialize Applications until l10n is ready.
      // See bug 1170083.
      var afterApplicationsInit = function() {
        var apps = Applications.getAllAppEntries();
        var appGridElements = apps.map(that._createAppGridElement.bind(that));
        appGridElements.forEach(function(appGridElem) {
          that._appDeckGridViewElem.appendChild(appGridElem);
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
        that._navigableElements.unshift(that._appDeckListScrollable);
        that._spatialNavigator = new SpatialNavigator(that._navigableElements);

        that._keyNavigationAdapter.on('move', that.onMove.bind(that));
        // All behaviors which no need to have multple events while holding the
        // key should use keyup.
        that._keyNavigationAdapter.on('enter-keyup', that.onEnter.bind(that));
        that._spatialNavigator.on('focus', that.onFocus.bind(that));
        that._spatialNavigator.on('unfocus', that.onUnfocus.bind(that));
        that._appDeckListScrollable.on('focus',
          that.onFocusOnAppDeckListScrollable.bind(that));
        that._spatialNavigator.focus();
        that._contextMenu = new ContextMenu();
        that._contextMenu.init(that);
        Applications.on('install', that.onAppInstalled.bind(that));
        Applications.on('update', that.onAppUpdated.bind(that));
        Applications.on('uninstall', that.onAppUninstalled.bind(that));
      };

      navigator.mozL10n.once(function() {
        Applications.init(afterApplicationsInit);
      });
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

    onCardListChanged: function ad_onCardListChanged() {
      if (this._focusElem) {
        this.fireFocusEvent(this._focusElem);
      }
    },

    /**
     * Notify other module that currently focused element is pinable (could be
     * pinned on Home) or nonpinable (could not be pinned on Home)
     *
     * @public
     * @method  AppDeck#fireFocusEvent
     * @param  {HTMLElement} elem - currently focused element
     */
    fireFocusEvent: function ad_fireFocusEvent(elem) {
      var that = this;
      if (elem && elem.dataset && elem.dataset.manifestURL) {
        this._cardManager.isPinned({
          manifestURL: elem.dataset.manifestURL,
          entryPoint: elem.dataset.entryPoint
        }).then(function(pinned) {
          /**
           * This event fires whenever focus in AppDeck move to a pinable
           * element (representing na app).
           * @event AppDeck#focus-on-pinable
           * @type {Object}
           * @property {Boolean} pinned - Is current focused pinable element
           *                            pinned or not
           * @property {String} manifestURL - manifestURL of current focused
           *                                element
           * @property {String} name - name of current focused pinable element
           * @property {Boolean} removable - Is current focused pinable element
           *                               removable or not
           */
          that.fire('focus-on-pinable', {
            pinned: pinned,
            manifestURL: elem.dataset.manifestURL,
            // entryPoint is deprecated
            entryPoint: elem.dataset.entryPoint,
            name: elem.dataset.name,
            removable: elem.dataset.removable === 'true'
          });
        });
      } else {
        /**
         * @event AppDeck#focus-on-nonpinable
         */
        this.fire('focus-on-nonpinable');
      }
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
      var focused = this._spatialNavigator.getFocusedElement();
      if (focused.dataset && focused.dataset.manifestURL) {
        Applications.launch(
          focused.dataset.manifestURL, focused.dataset.entryPoint);
      }
    },

    onMove: function ad_onMove(key) {
      var focused = this._spatialNavigator.getFocusedElement();
      if (focused instanceof XScrollable) {
        if (focused.spatialNavigator.move(key)) {
          return;
        }
      }
      this._spatialNavigator.move(key);
    },

    onAppInstalled: function ad_onAppInstalled(apps) {
      var that = this;
      var appGridElements = apps.map(this._createAppGridElement.bind(this));
      appGridElements.forEach(function(elem) {
        that._appDeckGridViewElem.appendChild(elem);
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
    }
  });

  exports.appDeck = new AppDeck();
  exports.appDeck.init();

}(window));
