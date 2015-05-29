/*global GaiaColorPicker */
'use strict';

(function(exports) {
  function Color(color) {
    if (! (this instanceof Color)) {
      return new Color(color);
    }

    if (Array.isArray(color)) {
      color = {
        r: color[0],
        g: color[1],
        b: color[2]
      };
    }

    this.r = +color.r;
    this.g = +color.g;
    this.b = +color.b;
  }

  Color.prototype = {
    toCSS() {
      return 'rgb(' + this.r + ',' + this.g + ',' + this.b + ')';
    },

    toStorable() {
      return {
        r: this.r,
        g: this.g,
        b: this.b
      };
    },

    toJSONString() {
      return JSON.stringify(this);
    },

    toHexString() {
      // Ideally GaiaColorPicker should use the implementation here
      return GaiaColorPicker.rgb2hex(this.r, this.g, this.b);
    }
  };

  Color.fromJSONString = function(json) {
    return Color(JSON.parse(json));
  };

  Color.fromStorable = function(obj) {
    return Color(obj);
  };

  exports.Color = Color;
})(window);
