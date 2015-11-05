/**
 * Manage the column layout of the home screen.
 */
define(function(require) {
  'use strict';

  var Module = require('modules/base/module');
  var HomescreenSettings = require('shared/homescreens/homescreen_settings');
  var Observable = require('modules/mvvm/observable');

  var HomescreenCols = Module.create(function HomescreenCols() {
    this.super(Observable).call(this);

    this._isUpdating = false;
    this._cachedColsValue = null;

    // We may update this value somewhere in other apps.
    HomescreenSettings.addEventListener('updated', e => {
      var prop = e.target;
      if (prop.name === 'grid.cols') {
        this._cols = prop.value;
      }
    });

    // Set the default value.
    HomescreenSettings.get('grid.cols').then(number => {
      this._cols = number;
    });
  }).extend(Observable);

  /**
   * @memberOf HomescreenCols
   * @type {Number}
   * @public
   */
  Observable.defineObservableProperty(HomescreenCols.prototype, 'cols', {
    readonly: true,
    value: null
  });

  /**
   * Change the value of `grid.cols` preference of the homescreen.
   *
   * @param {Number} value
   */
  HomescreenCols.prototype.setCols = function hc_setCols(value) {
    if (!this._isUpdating) {
      this._isUpdating = true;
      HomescreenSettings.put('grid.cols', value).then(() => {
        this._cols = value;
        this._isUpdating = false;
        if (this._cachedColsValue) {
          var cachedValue = this._cachedColsValue;
          this._cachedColsValue = null;
          this.setCols(cachedValue);
        }
      });
    } else {
      this._cachedColsValue = value;
    }
  };

  Object.defineProperty(HomescreenCols.prototype, 'verticalhomeActive', {
    set: function(active) {
      HomescreenSettings.setStoreName(active ?
        'vertical_preferences_store' : 'homescreen_settings');
      HomescreenSettings.get('grid.cols').then(number => {
        this._cols = number;
      });
    },

    enumerable: true
  });

  return HomescreenCols;
});
