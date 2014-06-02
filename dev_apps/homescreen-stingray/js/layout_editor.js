/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global evt */

(function(exports) {
  'use strict';

  /**
   * LayoutEditorOptions is an option object for LayoutEditor.
   *
   * @property {Object} [layout] the maximum grid size in vertical
   *                             and horizontal, default:
   *                             {vertical: 3, horizontal: 3}
   * @property {Object} [gap] the gap in pixel for each grid in vertical and
   *                          horizontal, default:
                              {vertical: 10, horizontal: 10}.
   * @property {Object} [padding] the padding size in pixel of the editor
   *                              container, default:
   *                              { top: 10, right: 10, bottom: 10, left: 10 }.
   * @property {Object} {holders} the config of each place holder, default:
   *
   *<pre>
   *  [{ static: true, left: 0, top: 0, width: 2, height: 2 },
   *   { static: true, left: 0, top: 2, width: 1, height: 1 },
   *   { left: 2, top: 0, width: 1, height: 1 },
   *   { left: 2, top: 1, width: 1, height: 1 },
   *   { left: 2, top: 2, width: 1, height: 1 },
   *   { left: 1, top: 2, width: 1, height: 1 }]
   *</pre>
   *
   * @typedef {Object} LayoutEditorOptions
   */

  /**
   * LayoutAppInfo is a app info object for showing widget information at
   * layout editor.
   *
   * @property {String} manifestURL the manifestURL of widget.
   * @property {String} [entryPoint=''] the entrypoint of this widget.
   * @property {String} name the name of this widget.
   * @property {String} iconUrl the icon url of this widget.
   * @typedef {Object} LayoutAppInfo
   */

  /**
   * LayoutWidgetConfig is a data object for loading widget information to
   * layout editor.
   * @property {Integer} positionId the id returned by exportConfig.
   * @property {LayoutAppInfo} app the app information which is the same as the
   *                               app argument of addWidget.
   * @property {Rectangle} rect the rectangle information which is calculated by
   *                            layout editor.
   * @typedef {Object} LayoutWidgetConfig
   */

  /**
   * LayoutPlaceInfo is the data strucutred used inside of LayoutEditor
   *
   * @property {DOMElement} elm the dom element which represents this place.
   * @property {Boolean} static if this property is true, it is a static place.
   * @property {LayoutAppInfo} app the app information which is the same as the
   *                               app argument of addWidget.
   * @property {Integer} left the left position of this place.
   * @property {Integer} top the top position of this place.
   * @property {Integer} width the width position of this place.
   * @property {Integer} height the height position of this place.
   * @typedef {Object} LayoutPlaceInfo
   */

  /**
   * LayoutEditor is an object for handling grid-based layout. It calculates
   * rectangle bound for each place holder.
   *
   * There are two size in LayoutEditor: editor size and target size. The editor
   * size is the size and coordinate of design-time widget container which is
   * the dom argument of init function. The target size is the size and
   * coordinate of the run-time widget container which is the targetSize
   * argument of init function. All calculations are based on editor size. When
   * we call exportConfig func, it returns size in target size.
   *
   * For each place holder, we have two different type: static or non-static.
   * The static place is a place held by homescreen app and cannot be
   * customized by user. It is always returned with exportConfig. The non-static
   * place is a place where can be customized by user.
   *
   * @class LayoutEditor
   * @param {LayoutEditorOptions} options the configuration for this object.
   */
  function LayoutEditor(options) {
    this.options = options || {};
    this.options.layout = this.options.layout || { vertical: 3, horizontal: 3 };
    this.options.gap = this.options.gap || { vertical: 10, horizontal: 10 };
    this.options.padding = this.options.padding ||
                           { top: 10, right: 10, bottom: 10, left: 10 };
    this.options.holders = this.options.holders || [
                         { static: true, left: 0, top: 0, width: 2, height: 2 },
                         { static: true, left: 0, top: 2, width: 1, height: 1 },
                         { left: 2, top: 0, width: 1, height: 1 },
                         { left: 2, top: 1, width: 1, height: 1 },
                         { left: 2, top: 2, width: 1, height: 1 },
                         { left: 1, top: 2, width: 1, height: 1 }];
  }

  LayoutEditor.prototype = evt({
    /**
     * init the LayoutEditor. It calculates the size of each cell and creates
     * all place holder based on the config of holders.
     * @param {Element} dom the editor container where all place holders append
     *                      to.
     * @param {Object} targetSize the top, left, width, and height of the target
     *                            area for layouting widget. This is an optional
     *                            argument.
     * @memberof LayoutEditor.prototype
     */
    init: function hsle_init(dom, targetSize) {
      if (!targetSize) {
        // don't scale
        this.scaleRatio = 1;
        this.containerSize = {
          width: dom.clientWidth,
          height: dom.clientHeight
        };
        this.offsetPosition = { left: 0, top: 0 };
      } else {
        // calculate scale ratio
        this.scaleRatio = Math.max(targetSize.width / dom.clientWidth,
                                   targetSize.height / dom.clientHeight);
        // recalculate editor size and respect targetSize's ratio.
        this.containerSize = {
          width: targetSize.width / this.scaleRatio,
          height: targetSize.height / this.scaleRatio
        };
        this.offsetPosition = { left: targetSize.left, top: targetSize.top };
      }

      this.container = dom;
      this._initSingleRect();
      this._createPlaceHolders();
    },

    /**
     * Exports all widget layout config based on target size.
     * @return {Array} this method returns an array of LayoutWidgetConfig. It
     *                 only exports config with app associated or static places.
     * @memberof LayoutEditor.prototype
     */
    exportConfig: function hsle_export() {
      var ret = [];
      for (var i = 0; i < this.placeHolders.length; i++) {
        var place = this.placeHolders[i];
        if (place.app || place.static) {
          ret.push({
            positionId: i,
            static: place.static,
            rect: {
              left: this.offsetPosition.left +
                    Math.round(place.left * this.scaleRatio),
              top: this.offsetPosition.top +
                   Math.round(place.top * this.scaleRatio),
              width: Math.round(place.width * this.scaleRatio),
              height: Math.round(place.height * this.scaleRatio)
            },
            app: {
              manifestURL: place.app ? place.app.manifestURL : '',
              entryPoint: place.app ? place.app.entryPoint : ''
            }
          });
        }
      }
      return ret;
    },

    /**
     * Loads a widget to the specified place.
     * @param {LayoutWidgetConfig} config the widget config.
     * @memberof LayoutEditor.prototype
     *
     */
    loadWidget: function hsle_import(config) {
      if (config && this.placeHolders[config.positionId]) {
        this.addWidget(config.app, this.placeHolders[config.positionId]);
      }
    },

    /**
     * Get the first non static place holder.
     * @return returns the first non-static holder or null if not found.
     * @memberof LayoutEditor.prototype
     */
    getFirstNonStatic: function hsle_getFirstNonStatic() {
      for (var i = 0; i < this.placeHolders.length; i++) {
        if (this.placeHolders[i].static) {
          continue;
        }
        return this.placeHolders[i];
      }
      return null;
    },

    getNonStaticPlaces: function hsle_getNonStaticPlaces() {
      var ret = [];
      for (var i = 0; i < this.placeHolders.length; i++) {
        this.placeHolders[i].static || ret.push(this.placeHolders[i]);
      }
      return ret;
    },

    getStaticPlaces: function hsle_getStaticPlaces() {
      var ret = [];
      for (var i = 0; i < this.placeHolders.length; i++) {
        !this.placeHolders[i].static || ret.push(this.placeHolders[i]);
      }
      return ret;
    },

    _createPlaceHolders: function hsle__createPlaceHolders() {
      this.placeHolders = [];
      var top, left, width, height, place, placeHolder;
      for (var i = 0; i < this.options.holders.length; i++) {
        place = this.options.holders[i];
        // convert grid to pixel coordinate system.
        left = place.left *
               (this.options.gap.horizontal + this.singleRect.width) +
               this.options.padding.left;
        top = place.top *
              (this.options.gap.vertical + this.singleRect.height) +
              this.options.padding.top;
        width = place.width * this.singleRect.width +
                (place.width - 1) * this.options.gap.horizontal;
        height = place.height * this.singleRect.height +
                (place.height - 1) * this.options.gap.vertical;

        placeHolder = { static: place.static,
                        left: left, top: top, width: width, height: height };
        this._createPlaceHolderUI(placeHolder);
        this.placeHolders.push(placeHolder);
      }
    },

    _createPlaceHolderUI: function hsle__createPlaceHolderUI(place) {
      var div = document.createElement('div');
      div.classList.add('place-holder');
      if (place.static) {
        div.classList.add('static-place-holder');
      }

      // calculate the difference between real container and editor size.
      var leftDiff = this.container.clientWidth - this.containerSize.width;
      var topDiff = this.container.clientHeight - this.containerSize.height;

      div.style.width = place.width + 'px';
      div.style.height = place.height + 'px';
      // to center it by deviding diff to 2
      div.style.left = leftDiff / 2 + place.left + 'px';
      div.style.top = topDiff / 2 + place.top + 'px';

      this.container.appendChild(div);
      place.elm = div;
    },

    _updatePlaceHolderUI: function hsle__updatePlaceHolderUI(place) {
      if (place.app) {
        place.elm.dataset.appName = place.app.name;
        place.elm.style.backgroundImage = 'url(' + place.app.iconUrl + ')';
      } else {
        place.elm.dataset.appName = '';
        place.elm.style.backgroundImage = '';
      }
    },

    /*
     * add app as a widget at place.
     * @param {LayoutAppInfo} app the app information.
     * @param {LayoutPlaceInfo} place the place object which can be found at
     *                                holders.
     * @memberof LayoutEditor.prototype
     */
    addWidget: function hsle_add(app, place) {
      if (place.app) {
        this.removeWidget(place);
      }
      place.app = app;
      this._updatePlaceHolderUI(place);
    },

    /**
     * remove the associated widget at place
     * @param {LayoutPlaceInfo} place the place object which can be found at
     *                                holders.
     * @memberof LayoutEditor.prototype
     */
    removeWidget: function hsle_remove(place) {
      if (place.app) {
        // we need to fire this event for callers to revoke the iconUrl.
        this.fire('widget-removed', place.app);
        delete place.app;
        this._updatePlaceHolderUI(place);
      }
    },

    /**
     * This is a convenient function to remove widgets based on callback's
     * return.
     * @param {Function} callback the callback function which handles two
     *                            arguments: place and resultCallback, like:
     * <pre>
     *           function cb(place, resultCallback) {
     *             if (place is affected place) {
     *               ... async function call {
     *                 resultCallback(true, place);
     *               }
     *             } else {
     *               resultCallback(false, place);
     *             }
     *           }
     * </pre>
     * @memberof LayoutEditor.prototype
     */
    removeWidgets: function hsle_removeItems(callback) {
      this._batchOps(callback, this.removeWidget.bind(this));
    },

    /**
     * This is a convenient function to update widgets' icon based on callback's
     * return.
     * @param {Function} callback the callback function which handles two
     *                            arguments: place and resultCallback, like:
     * <pre>
     *           function cb(place, resultCallback) {
     *             if (place is affected place) {
     *               ... async function call {
     *                 resultCallback(true, place);
     *               }
     *             } else {
     *               resultCallback(false, place);
     *             }
     *           }
     * </pre>
     * @memberof LayoutEditor.prototype
     */
    updateWidgets: function hsle_updateItems(callback) {
      this._batchOps(callback, this._updatePlaceHolderUI.bind(this));
    },

    _batchOps: function hsle__batchOps(checkingFunc,
                                       affectedFunc) {
      if (!checkingFunc || (typeof checkingFunc) !== 'function' ||
          !affectedFunc || (typeof affectedFunc) !== 'function') {
        return;
      }
      function handleResult(affected, place) {
        if (affected) {
          affectedFunc(place);
        }
      }
      for (var i = 0; i < this.placeHolders.length; i++) {
        if (!this.placeHolders[i].app) {
          continue;
        }
        try {
          checkingFunc(this.placeHolders[i], handleResult);
        } catch (ex) {
          console.error('Error while trying to execute callback of ' +
                        'batch tasks with place #' + i, ex);
        }
      }
    },

    /**
     * remove all widgets from place holders.
     * @param {Function} callback this callback is called before we remove the
     *                            widget.
     * @memberof LayoutEditor.prototype
     */
    reset: function hsle_reset() {
      for (var i = 0; i < this.placeHolders.length; i++) {
        this.removeWidget(this.placeHolders[i]);
      }
    },

    _initSingleRect: function hsle__initSingleRect() {
      var options = this.options;
      var width = (this.containerSize.width -
                   (options.layout.horizontal - 1) * options.gap.horizontal -
                   options.padding.left -
                   options.padding.right) / options.layout.horizontal;
      var height = (this.containerSize.height -
                    (options.layout.vertical - 1) * options.gap.vertical -
                    options.padding.top -
                    options.padding.bottom) / options.layout.vertical;
      this.singleRect = { width: Math.round(width),
                          height: Math.round(height) };
    }
  });

  exports.LayoutEditor = LayoutEditor;

})(window);
