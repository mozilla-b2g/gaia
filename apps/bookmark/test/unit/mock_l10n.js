'use strict';

window.realL10n = window.navigator.mozL10n;

window.navigator.mozL10n = {
  get: function get(key, data) {
    return key + JSON.stringify(data);
  },

  ready: function() {
  },

  language: {
    code: 'en-US',
    direction: 'LTR'
  },

  translate: function() {

  }
};
