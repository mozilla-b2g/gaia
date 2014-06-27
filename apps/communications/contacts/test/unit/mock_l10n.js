'use strict';
/* exported MockMozL10n */

window.realL10n = window.navigator.mozL10n;

var MockMozL10n = window.navigator.mozL10n = {
  realL10nCB: null,
  language: {
    code: 'en',
    dir: 'ltr'
  },
  get: function get(key, params) {
    var out = key;

    if (params) {
      if (key == 'itemWithLabel') {
        out = params.label + ', ' + params.item;
      } else {
        Object.keys(params).forEach(function(id) {
          out += params[id];
        });
      }
    }

    return out;
  },
  localize: function localize(element, key, params) {
    element.textContent = this.get(key, params);
  },
  translate: function() {},
  once: function(cb) {
    this.realL10nCB = cb;
  },
};
