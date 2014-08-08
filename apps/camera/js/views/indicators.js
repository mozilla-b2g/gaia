define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('view:indicators');
var View = require('view');

/**
 * Exports
 */

module.exports = View.extend({
  name: 'indicators',
  tag: 'ul',

  initialize: function() {
    this.render();
  },

  render: function() {
    this.el.innerHTML = this.template();

    // Clean up
    delete this.template;

    debug('rendered');
    return this;
  },

  template: function() {
    return '<li class="indicator_timer rotates" data-icon="self-timer"></li>' +
    '<li class="indicator_hdr rotates" data-icon="hdr"></li>' +
    '<li class="indicator_geolocation rotates" data-icon="location"></li>' +
    '<li class="indicator_battery rotates" data-icon="battery-low"></li>';
  }
});

});