'use strict';

/* exported MockMozL10n */

var MockMozL10n = {
  get: function get(key) {
    return key;
  },
  translate: function(node) {

  },
  DateTimeFormat: function() {
    this.localeFormat = function(date, format) {
      return date;
    };
  },
  language: {
    code: 'en',
    dir: 'ltr'
  },
  ready: function(callback) {
    callback();
  },
  once: function(callback) {
    callback();
  },
  localize: function(node, l10nId, l10nArgs) {

  },
  setAttributes: function(node, l10nId, l10nArgs) {

  },
  translateFragment: function(element) {
  },
};

var MockLazyL10n = {
  keys: {},
  get: function get(callback) {
    if (callback) {
      callback(function _(key, params) {
        MockLazyL10n.keys[key] = params;
        return key;
      });
    }
  },
  translate: function(node) {

  }
};
