'use strict';

/* exported MockMozL10n */

window.realL10n = window.navigator.mozL10n;

var MockMozL10n = window.navigator.mozL10n = {
  realL10nCB: null,
  language: {
    code: 'en',
    direction: 'ltr'
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
  translate: function() {},
  once: function(cb) {
    this.realL10nCB = cb;
    this.onceCb = cb;
    cb();
  },
  ready: function(cb) {
    this.readyCb = cb;
  },
  fireReady: function() {
    if (!this.readyCb) {
      return;
    }
    this.readyCb();
  },
  fireOnce: function() {
    if (!this.onceCb) {
      return;
    }
    this.onceCb();
  },
  setAttributes: function(element, id, args) {
    element.setAttribute('data-l10n-id', id);
    if (args) {
      element.setAttribute('data-l10n-args', JSON.stringify(args));
    }
  },
  getAttributes: function(element) {
    return {
      id: element.getAttribute('data-l10n-id'),
      args: JSON.parse(element.getAttribute('data-l10n-args'))
    };
  },
};
