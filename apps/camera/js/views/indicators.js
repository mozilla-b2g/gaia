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
    return '<li class="indicator_timer rotates" data-icon="self-timer" ' +
               'data-l10n-id="self-timer-indicator"></li>' +
    '<li class="indicator_hdr rotates" data-icon="hdr" ' +
        'data-l10n-id="hdr-indicator"></li>' +
    '<li class="indicator_geolocation rotates" data-icon="location" ' +
        'data-l10n-id="location-indicator"></li>' +
    '<li class="indicator_battery rotates" data-icon="battery-3" ' +
        'data-l10n-id="battery-low-indicator"></li>';
  }
});

});