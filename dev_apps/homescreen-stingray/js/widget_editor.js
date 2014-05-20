/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* globals Applications, SelectionBorder, URL, evt */

(function(exports) {
  'use strict';

  const DEFAULT_ICON = Applications.DEFAULT_ICON_URL;

  /**
   * WidgetEditor controls UI and handles user interactions for changing the
   * places of widget.
   *
   * @class WidgetEditor
   */
  function WidgetEditor() {
  }

  WidgetEditor.prototype = evt({
    /**
     * start the WidgetEditor object.
     *
     * @property {DOMElement} container - the container of widget editor.
     * @property {DOMElement} cellContainer - the container of the cells created
     *                        by layout editor.
     *
     * @property {AppList} appList - the AppList object for showing the app
     *                               icons
     * @property {LayoutEditor} layoutEditor the LayoutEditor which creates the
     *                                       cells.
     *
     * @memberof WidgetEditor.prototype
     */
    start: function we_start(container, cellContainer, appList, layoutEditor) {
      if (!appList || !container || !cellContainer || !layoutEditor) {
        throw new Error('WidgetEditor needs a valid options to work.');
      }
      // init variables
      this.container = container;
      this.cellContainer = cellContainer;
      this.appList = appList;
      this.editor = layoutEditor;

      // create selection border with single selection.
      this.selectionBorder = new SelectionBorder(false);

      //keep reference for removal
      this._boundHandleAppRemoved = this._handleAppRemoved.bind(this);
      this._boundHandleAppUpdate = this._handleAppUpdated.bind(this);
      this._boundPlaceClicked = this._handlePlaceClicked.bind(this);
      // put event listener
      Applications.on('uninstall', this._boundHandleAppRemoved);
      Applications.on('update', this._boundHandleAppUpdate);
      this.cellContainer.addEventListener('click', this._boundPlaceClicked);

      // focus the first item
      this._switchFocus(this.editor.placeHolders[0]);
    },
    /**
     * stop and free all reference and listeners of this WidgetEditor
     * @memberof WidgetEditor.prototype
     */
    stop: function we_stop() {
      Applications.off('uninstall', this._boundHandleAppRemoved);
      Applications.off('update', this._boundHandleAppUpdate);
      this.cellContainer.removeEventListener('click', this._boundPlaceClicked);
      this.selectionBorder.deselectAll();
      this.selectionBorder = null;
      this.currentFocus = null;
      this.container = null;
      this.cellContainer = null;
      this.appList = null;
      this.editor = null;
      this._boundHandleAppRemoved = null;
      this._boundHandleAppUpdate = null;
      this._boundPlaceClicked = null;
    },

    /**
     * show the WidgetEditor.
     * @memberof WidgetEditor.prototype
     */
    show: function we_show() {
      if (!this.container.hidden) {
        return;
      }

      this.container.hidden = false;

      this.fire('shown');
    },

    /**
     * hide the WidgetEditor.
     * @memberof WidgetEditor.prototype
     */
    hide: function we_hide() {
      if (this.container.hidden) {
        return;
      }

      this.container.hidden = true;
      this.fire('closed');
    },

    /**
     * check if this WidgetEditor is shown.
     * @return {Boolean} returns true if the WidgetEditor is shown.
     * @memberof WidgetEditor.prototype
     */
    isShown: function we_isShown() {
      return !this.container.hidden;
    },

    /**
     * load the widget config to UI. loadWidget queries app icon before putting
     * config into LayoutEditor.
     *
     * @param {Array} configs - the configuration set which contains multiple
     *                        {@link LayoutWidgetConfig}.
     * @see {@link LayoutWidgetConfig}
     * @memberof WidgetEditor.prototype
     */
    loadWidgets: function we_loadWidget(configs) {
      if (!configs) {
        return;
      }

      this.editor.reset(this._revokeUrl.bind(this));
      configs.forEach((config) => {
        this._fillAppIcon(config, (filled) => {
          this.editor.loadWidget(filled);
        });
      });
    },
    /**
     * This is a convenient function to revoke the URL.
     * @param {LayoutAppInfo} app - the app info object.
     * @private
     * @memberof WidgetEditor.prototype
     */
    _revokeUrl: function we__revokeUrl(app) {
      if (app.iconUrl !== DEFAULT_ICON) {
        URL.revokeObjectURL(app.iconUrl);
      }
    },

    /**
     * This is a convenient function to convert {@link AppEntryPoint} to
     * {@link LayoutAppInfo}. It queries the app icon.
     *
     * @param {WidgetConfig} cfg - the widget config.
     * @param {Function} callback - called when icon queried.
     * @private
     * @memberof WidgetEditor.prototype
     */
    _fillAppIcon: function we__fillAppIcon(cfg, callback) {
      cfg.app.name = Applications.getName(cfg.app.manifestURL,
                                          cfg.app.entryPoint);
      Applications.getIconBlob(cfg.app.manifestURL, cfg.app.entryPoint, 0,
        (blob) => {
          cfg.app.iconUrl = blob ? URL.createObjectURL(blob) : DEFAULT_ICON;
          if (callback && (typeof callback) === 'function') {
            callback(cfg);
          }
        });
    },
    /**
     * handle user press OK/Enter or click on the selected place. When the place
     * is not bound with widget, it shows AppList for selecting. Otherwise, it
     * clears the binding between them.
     *
     * @param {LayoutPlaceInfo} place - the place object.
     * @private
     * @memberof WidgetEditor.prototype
     */
    _togglePlace: function we__togglePlace(place) {
      if (place.app) {
        // revoke the app icon url
        this._revokeUrl(place.app);
        // remove binding
        this.editor.removeWidget(place);
      } else {
        // show app list for selecting app.
        if (this.appList.show()) {
          // put event listeners when app is shown
          var handleAppChosen = this._handleAppChosen.bind(this);
          this.appList.on('iconclick', handleAppChosen);
          this.appList.once('closed', () => {
            // We need to remove iconClick event listener because users may
            // press "close" without click any app icon.
            this.appList.off('iconclick', handleAppChosen);
          });
        }
      }
    },
    /**
     * focus the selected place.
     * @param {LayoutPlaceInfo} place - the place object.
     * @private
     * @memberof WidgetEditor.prototype
     */
    _switchFocus: function we__switchFocus(place) {
      if (!place) {
        return;
      }
      this.currentFocus = place;
      this.selectionBorder.select(place.elm);
    },
    /**
     * handles app selected event.
     * @param {AppEntryPoint} data - the app info.
     * @private
     * @memberof WidgetEditor.prototype
     */
    _handleAppChosen: function we__handleAppChosen(data) {
      Applications.getIconBlob(data.manifestURL, data.entryPoint, 0,
        (blob) => {
          var iconUrl = blob ? URL.createObjectURL(blob) : DEFAULT_ICON;

          this.editor.addWidget({ name: data.name,
                                  iconUrl: iconUrl,
                                  manifestURL: data.manifestURL,
                                  entryPoint: data.entryPoint},
                                this.currentFocus);
        });
      // once user click an app, we should close the app list.
      this.appList.hide();
      data.preventDefault();
    },
    /**
     * handles apps removed by user. We need to remove the bound app with widget
     * layout cell.
     * @param {Array} apps - the array of {@link AppEntryPoint}.
     * @private
     * @memberof WidgetEditor.prototype
     */
    _handleAppRemoved: function we__handleAppRemoved(apps) {
      apps.forEach((app) => {
        this.editor.removeWidgets((place, resultCallback) => {
          if (place.app.manifestURL === app.manifestURL &&
            place.app.entryPoint === app.entryPoint) {
            this._revokeUrl(place.app.iconUrl);
            resultCallback(true, place);
          } else {
            resultCallback(false, place);
          }
        });
      });
    },
    /**
     * handles apps updated. We need to updated the icon of bound app with
     * widget layout cell.
     * @param {Array} apps - the array of {@link AppEntryPoint}.
     * @private
     * @memberof WidgetEditor.prototype
     */
    _handleAppUpdated: function we__handleAppUpdated(apps) {
      apps.forEach((app) => {
        this.editor.updateWidgets((place, resultCallback) => {
          if (place.app.manifestURL === app.manifestURL &&
              place.app.entryPoint === app.entryPoint) {

            place.app.name = app.name;
            this._revokeUrl(place.app.iconUrl);
            Applications.getIconBlob(app.manifestURL, app.entryPoint, 0,
              (b) => {
                var iconUrl = b ? URL.createObjectURL(b) : DEFAULT_ICON;
                place.app.iconUrl = iconUrl;
                resultCallback(true, place);
              });
          } else {
            resultCallback(false, place);
          }
        });
      });
    },
    /**
     * handles the click of each layout cell. It calls focus the click place and
     * calls _togglePlace to update its state.
     * @param {DOMEvent} e - click event.
     * @private
     * @memberof WidgetEditor.prototype
     */
    _handlePlaceClicked: function we__handlePlaceClick(e) {
      var target = e.target;
      var places = this.editor.placeHolders;
      var found = false;
      for (var i = 0; !found && i < places.length; i++) {
        if (target === places[i].elm && !places[i].static) {
          this._switchFocus(places[i]);
          this._togglePlace(places[i]);
          found = true;
        }
      }
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  });

  exports.WidgetEditor = WidgetEditor;
})(window);
