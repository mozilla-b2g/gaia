define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var View = require('vendor/view');
var attach = require('vendor/attach');
var debug = require('debug')('view:settings');

/**
 * Exports
 */

module.exports = View.extend({
  name: 'settings',
  tag: 'ul',

  initialize: function(options) {
    this.state = options.state;
    this.items = options.items;
    this.reset(this.items.get());
    attach(this.el, 'click', 'li', this.onItemClick);
    this.state.on('change', this.onStateChange);
    this.items.on('reset', this.onItemsReset);
    this.on('destroy', this.onDestroy);
  },

  onItemClick: function(e, el) {
    e.stopPropagation();
    var key = el.getAttribute('data-key');
    debug('item clicked', key);
    this.state.toggle(key);
  },

  onStateChange: function(keys) {
    var hash = this.hash;
    keys.map(this.getFromHash).forEach(this.renderItem);
    debug('state change', keys);
  },

  onItemsReset: function() {
    this.reset();
    this.render();
  },

  onDestroy: function() {
    this.state.off('change', this.onStateChange);
    this.items.off('reset', this.onItemsReset);
  },

  reset: function(items) {
    this.hash = {};
    items.forEach(this.addToHash);
  },

  render: function() {
    var items = this.items.get();
    var self = this;
    this.els = {};
    this.el.innerHTML = '';
    items.map(this.renderItem).forEach(this.append);
    return this;
  },

  renderItem: function(item) {
    var key = item.key;
    var el = this.els[key] || document.createElement('li');
    item.value = this.state.get(key);
    el.setAttribute('data-key', key);
    el.setAttribute('data-value', item.value);
    el.innerHTML = this.templateItem(item);
    this.els[key] = el;
    debug('rendered item %s', key);
    return el;
  },

  templateItem: function(item) {
    var title = item.title || item.key;
    return title + ' - ' + item.value;
  },

  append: function(el) {
    this.el.appendChild(el);
  },

  addToHash: function(item) {
    this.hash[item.key] = item;
  },

  getFromHash: function(key) {
    return this.hash[key];
  }
});

});
