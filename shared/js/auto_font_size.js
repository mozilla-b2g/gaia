
'use strict';

(function() {

  var AutoFontSize = window.AutoFontSize = {
    _max: 25,
    _min: 15,
    _cache: {},
    _ctx: function f_ctx(size, family) {
      if (this._cache[size] && this._cache[family]) {
        return this._cache[size][family];
      }
      var canvas = document.createElement('canvas');
      this._cache[size] = this._cache[size] || {};
      this._cache[size][family] = canvas.getContext('2d',
          { willReadFrequently: true });
      this._cache[size][family].font = parseInt(size) + 'px ' + family;
      return this._cache[size][family];
    },
    auto: function f_auto(element, text, options) {
      var style = window.getComputedStyle(element);
      options = options || {};
      var min = options.min || this._min;
      var max = options.max || this._max;
      this.fit({
        element: element,
        width: parseInt(style.width),
        text: text,
        size: max,
        family: style.fontFamily,
        min: options.min || this._min,
        max: options.max || this._max
      });
    },
    fit: function f_fit(opts) {
      var ctx = this._ctx(opts.size, opts.family);
      if (opts.max >= opts.size && opts.min <= opts.size &&
          ctx.measureText(opts.text).width > opts.width) {
        opts.size -= 1;
        this.fit(opts);
      } else {
        opts.element.style.textOverflow = 'ellipsis';
        opts.element.style.fontSize = opts.size + 'px';
        return;
      }
    },
    init: function(ctx) {
      ctx = ctx || document;
      var els = ctx.querySelectorAll('[data-autofontsize]');
      for(var i = 0; i < els.length; i++) {
        var el = els[i];
        this.auto(el, el.textContent);
      }
    }
  };

})();

