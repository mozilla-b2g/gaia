define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('view:setting');
var View = require('vendor/view');
var bind = require('lib/bind');

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
    this.el.classList.add(this.model.get('icon'));
    bind(this.el, 'click', this.onClick);
  },

  onClick: function() {
    this.emit('click', this);
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
    return '<div class="setting_text">' +
      '<h4 class="setting_title">' + data.title + '</h4>' +
      '<h5 class="setting_value">' + data.selected.title + '</h5>' +
    '</div>';
  },
});

});
