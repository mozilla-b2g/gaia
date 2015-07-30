define(function(require) {
  'use strict';

  var VerticalPreferences = require('shared/homescreens/vertical_preferences');
  var Module = require('modules/base/module');
  var Observable = require('modules/mvvm/observable');

  var Homescreen = Module.create(function Homescreen() {
    this.super(Observable).call(this);

    this._isUpdating = false;
    this._cachedColsValue = null;
    // we may update this value somewhere in other apps.
    VerticalPreferences.addEventListener('updated', (e) => {
      var prop = e.target;
      if (prop.name === 'grid.cols') {
        this._cols = prop.value;
      }
    });
    // set the default value
    VerticalPreferences.get('grid.cols').then((number) => {
      this._cols = number;
    });
  }).extend(Observable);

  Observable.defineObservableProperty(Homescreen.prototype, 'cols', {
    readonly: true,
    value: null
  });

  Homescreen.prototype.setCols = function(value) {
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

  return Homescreen();
});
