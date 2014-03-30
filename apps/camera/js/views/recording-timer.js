define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('view:recording-timer');
var formatTimer = require('lib/format-timer');
var View = require('vendor/view');

/**
 * Exports
 */

module.exports = View.extend({
  name: 'recording-timer',

  initialize: function() {
    this.value(0);
  },

  value: function(value) {
    this.el.textContent = formatTimer(value);
    debug('set value: %s', value);
  }
});

});
