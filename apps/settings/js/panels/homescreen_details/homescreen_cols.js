define(require => {
  'use strict';

  var Module = require('modules/base/module');
  var VerticalPreferences = require('shared/homescreens/vertical_preferences');
  var Observable = require('modules/mvvm/observable');

  var HomescreenCols = Module.create(function HomescreenCols() {
    this.super(Observable).call(this);

    this._isUpdating = false;
    this._cachedColsValue = null;

    // We may update this value somewhere in other apps.
    VerticalPreferences.addEventListener('updated', e => {
      var prop = e.target;
      if (prop.name === 'grid.cols') {
        this._cols = prop.value;
      }
    });

    // Set the default value.
    VerticalPreferences.get('grid.cols').then(number => {
      this._cols = number;
    });
  }).extend(Observable);

  Observable.defineObservableProperty(HomescreenCols.prototype, 'cols', {
    readonly: true,
    value: null
  });

  /**
   * Change the value of `grid.cols` preference of the vertical homescreen.
   *
   * @param {Number} value
   * @public
   */
  HomescreenCols.prototype.setCols = function hc_setCols(value) {
    if (!this._isUpdating) {
      this._isUpdating = true;
      VerticalPreferences.put('grid.cols', value).then(() => {
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

  return HomescreenCols;
});
