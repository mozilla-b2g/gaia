/* global SpatialNavigator, SharedUtils, Applications, URL,
  KeyNavigationAdapter, ContextMenu */

(function(exports) {
  'use strict';

  var AppDeck = function() {
  };

  AppDeck.prototype = evt({
    _navigableElements: [],

    _spatialNavigator: undefined,

    _keyNavigationAdapter: undefined,

    _selectionBorder: undefined,

    _contextMenu: undefined,

    _focusElem: undefined,

    _appDeckGridViewElem: document.getElementById('app-deck-grid-view'),

    _appDeckListScrollable: undefined,

    init: function ad_init() {
      var that = this;
      this._keyNavigationAdapter = new KeyNavigationAdapter();
      this._keyNavigationAdapter.init();

      Applications.init(function() {
        var apps = Applications.getAllAppEntries();
        var appGridElements = apps.map(that._createAppGridElement.bind(that));
        appGridElements.forEach(function(appGridElem) {
          that._appDeckGridViewElem.appendChild(appGridElem);
        });
        that._appDeckListScrollable = new XScrollable({
          frameElem: 'app-deck-list-frame',
          listElem: 'app-deck-list',
          itemClassName: 'app-banner',
          margin: 1.4
        });
        that._navigableElements =
          SharedUtils.nodeListToArray(
            document.querySelectorAll('.navigable:not(.app-banner)'))
            .concat(appGridElements);
        that._navigableElements.unshift(that._appDeckListScrollable);
        that._spatialNavigator = new SpatialNavigator(that._navigableElements);
        that._selectionBorder = new SelectionBorder({
            multiple: false,
            container: document.getElementById('main-section'),
            forground: true });

        that._keyNavigationAdapter.on('move', that.onMove.bind(that));
        that._keyNavigationAdapter.on('enter', that.onEnter.bind(that));
        that._spatialNavigator.on('focus', that.onFocus.bind(that));
        that._appDeckListScrollable.on('focus', function(scrollable, elem) {
          that._selectionBorder.select(elem, scrollable.getItemRect(elem));
          that._focusElem = elem;
        });
        that._spatialNavigator.focus();
        that._contextMenu = new ContextMenu();
        that._contextMenu.init(that);
      });
    },

    _createAppGridElement: function ad_createAppGridElement(app) {
      // <div class="app navigable">
      //   <div class="app-name">
      //     <span class="app-name-text">App1</span>
      //   </div>
      // </div>
      var container = document.createElement('div');
      var appNameElem = document.createElement('div');
      var appNameTextElem = document.createElement('div');

      container.className = 'app navigable';
      container.dataset.manifestURL = app.manifestURL;
      container.dataset.entryPoint = app.entryPoint;
      container.dataset.name = app.name;
      appNameElem.className = 'app-name';
      appNameTextElem.className = 'app-name-text';
      appNameTextElem.textContent = app.name;

      appNameElem.appendChild(appNameTextElem);
      container.appendChild(appNameElem);

      var ICON_SIZE_VIEWPORT_WIDTH_RATIO = 10;
      // XXX: width of container is 10vw, so the best fit icon will be
      // viewport size * (10/100) if viewport is not scalable. However this
      // value is subject to change once UX spec has definition on it.
      var bestFitIconSize =
        Math.max(window.innerWidth, window.innerHeight) /
        ICON_SIZE_VIEWPORT_WIDTH_RATIO;
      Applications.getIconBlob(
        app.manifestURL, app.entryPoint, bestFitIconSize, function(blob) {
          var iconURL = URL.createObjectURL(blob);
          // XXX: make sure to revoke iconURL once it is no longer needed.
          // For example, icon is changed or app is uninstalled
          container.dataset.iconURL = iconURL;
          container.style.backgroundImage =
            'url("' + iconURL + '")';
        });

      return container;
    },

    onFocus: function ad_onFocus(elem) {
      if (elem instanceof XScrollable) {
        elem.spatialNavigator.focus(elem.spatialNavigator.getFocusedElement());
      } else if (elem.nodeName) {
        this._selectionBorder.select(elem);
        this._focusElem = elem;
      } else {
        this._selectionBorder.selectRect(elem);
      }

      if (elem.dataset && elem.dataset.manifestURL) {
        this.fire('focus-on-pinable', {
          manifestURL: elem.dataset.manifestURL,
          entryPoint: elem.dataset.entryPoint,
          name: elem.dataset.name
        });
      } else {
        this.fire('focus-on-nonpinable');
      }
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
    }
  });

  exports.appDeck = new AppDeck();
  exports.appDeck.init();

}(window));
