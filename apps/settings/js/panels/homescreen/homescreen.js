define(function(require) {
  'use strict';

  var VerticalPreferences = require('shared/homescreens/vertical_preferences');
  var Observable = require('modules/mvvm/observable');

  var Homescreen = Observable({
    _isUpdating: false,
    _cachedColsValue: null,
    cols: null,
    setCols: function(value) {
      if (!this._isUpdating) {
        this._isUpdating = true;
        VerticalPreferences.put('grid.cols', value).then(() => {
          this.cols = value;
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
    }
  });

  // we may update this value somewhere in other apps.
  VerticalPreferences.addEventListener('updated', function(e) {
    var prop = e.target;
    if (prop.name === 'grid.cols') {
      Homescreen.cols = prop.value;
    }
  });

  // set the default value
  VerticalPreferences.get('grid.cols').then(function(number) {
    Homescreen.cols = number;
  });

  return Homescreen;
});
