define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var View = require('vendor/view');

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
  },

  template: function() {
    return '<li class="indicator_timer icon-timer rotates"></li>' +
    '<li class="indicator_geolocation icon-geolocation rotates"></li>' +
    '<li class="indicator_hdr icon-hdr rotates"></li>' +
    '<li class="indicator_battery icon rotates"></li>';
  }
});

});