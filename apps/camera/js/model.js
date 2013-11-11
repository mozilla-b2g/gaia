define(function(require) {
  'use strict';

  var evt = require('evt');

  var Model = function(properties) {
    this._properties = properties || {};
  };

  Model.prototype = evt.mix({
    _properties: null,

    get: function(key) {

      // Get bulk properties
      if (!key) {
        return this._properties;
      }

      // Get single property
      return this._properties[key];
    },

    set: function(keyOrProperties, value) {

      // Set bulk properties
      if (typeof keyOrProperties === 'object') {
        var didChange = false;

        for (var key in keyOrProperties) {

          // Skip setting property if it hasn't changed
          if (this._properties[key] === keyOrProperties[key]) {
            continue;
          }

          this._properties[key] = keyOrProperties[key];
          this.emit('change:' + key, { value: keyOrProperties[key] });

          didChange = true;
        }

        if (didChange) {
          this.emit('change');
        }

        return;
      }

      // Skip setting property if it hasn't changed
      if (this._properties[keyOrProperties] === value) {
        return;
      }

      // Set single property
      this._properties[keyOrProperties] = value;

      this.emit('change');
      this.emit('change:' + keyOrProperties, { value: value });
    }
  });

  return Model;
});
