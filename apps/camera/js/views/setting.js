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
    var key = data.key;
    data.value = this.model.value();
    this.el.setAttribute('data-key', key);
    this.el.setAttribute('data-value', data.value);
    this.el.innerHTML = this.template(data);
    debug('rendered item %s', key);
    return this;
  },

  template: function(item) {
    return item.title + ' - ' + item.value;
  },
});

});
