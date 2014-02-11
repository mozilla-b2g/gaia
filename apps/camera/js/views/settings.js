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
    this.el.innerHTML = this.template();
    this.els.items = this.find('.js-items');
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
    view.render().appendTo(this.els.items);
    this.children.push(view);
    debug('initialized child');
  },

  template: function() {
    return '<div class="inner">' +
      '<h2 class="settings_title">Options</h2>' +
      '<ul class="settings_items js-items"></ul>' +
    '</div>';
  }
});

});
