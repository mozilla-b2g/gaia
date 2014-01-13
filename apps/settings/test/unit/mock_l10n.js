/* exported MockL10n*/

'use strict';

var MockL10n = {
  get: function get(key, params) {
    return key;
  },
  localize: function localize(elem, l10nKey, params) {
    elem.textContent = JSON.stringify(params);
  },
  ready: function(callback) {
    callback();
  },
  DateTimeFormat: function(date) {
    return {
      fromNow: function(date) {
        return Date.now();
      }
    };
  }
};
