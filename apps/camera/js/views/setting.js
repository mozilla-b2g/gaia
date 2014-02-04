define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var View = require('vendor/view');
var debug = require('debug')('view:setting');

/**
 * Exports
 */

module.exports = View.extend({
  tag: 'li',
  name: 'setting',

  initialize: function(options) {
    this.model = options.model;
    this.model.on('change', this.render);
    this.on('destroy', this.onDestroy);
  },

  onDestroy: function() {
    this.model.off('change', this.render);
  },

  render: function() {
    var data = this.model.get();
    data.selected = this.model.selected();
    this.el.setAttribute('data-key', data.key);
    this.el.innerHTML = this.template(data);
    debug('rendered item %s', data.key);
    return this;
  },

  template: function(data) {
    return data.title + ' - ' + data.selected.title;
  },
});

});
