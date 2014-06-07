'use strict';
/* exported MockL10n */

var MockL10n = {

  language: {
    code: 'en-US'
  },

  get: function get(key, params) {
    if (params) {
      key += JSON.stringify(params);
    }
    return key;
  },

  localize: function localize(element, key, params) {
    if (key) {
      element.setAttribute('data-l10n-id', key);
    } else {
      element.removeAttribute('data-l10n-id');
    }

    if (params) {
      if (key) {
        key += JSON.stringify(params);
      }
      element.setAttribute('data-l10n-args', params);
    } else {
      element.removeAttribute('data-l10n-args');
    }

    element.textContent = key;
  },

  DateTimeFormat: function() {
    var localeFormat = function mockLocaleFormat(time, strFormat) {
      return '' + time;
    };
    // support navigator.mozL10n.DateTimeFormat() without new the object
    return {
      localeFormat: localeFormat
    };
  },

  ready: function(callback) {
    callback();
  },

  once: function(callback) {
    callback();
  },

  translate: function() {

  }
};
