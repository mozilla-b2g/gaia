define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var View = require('vendor/view');
var attach = require('vendor/attach');
var SettingView = require('views/setting');
var debug = require('debug')('view:settings');

/**
 * Exports
 */

module.exports = View.extend({
  name: 'settings',
  tag: 'ul',

  initialize: function(options) {
    this.items = options.items;
    this.children = [];
    attach(this.el, 'click', 'li', this.onItemClick);
    this.on('destroy', this.onDestroy);
  },

  onItemClick: function(event, el) {
    event.stopPropagation();
    var key = el.getAttribute('data-key');
    debug('item click', key);
    this.emit('click:item', key);
  },

  onDestroy: function() {
    this.children.forEach(this.destroyChild);
    debug('destroyed');
  },

  render: function() {
    this.el.innerHTML = '';
    this.items.forEach(this.initializeChild);
    debug('rendered');
    return this;
  },

  destroyChild: function(view) {
    view.destroy();
    debug('destroyed child');
  },

  initializeChild: function(model) {
    var view = new SettingView({ model: model });
    view.render().appendTo(this.el);
    this.children.push(view);
    debug('initialized child');
  }
});

});
