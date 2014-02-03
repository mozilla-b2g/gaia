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
    this.collection = options.collection;
    this.items = this.collection.filter(this.isPersistent);
    attach(this.el, 'click', 'li', this.onItemClick);
    this.on('destroy', this.onDestroy);
  },

  onItemClick: function(e, el) {
    e.stopPropagation();
    var key = el.getAttribute('data-key');
    var model = this.collection.get(key);
    debug('item clicked', key);
    model.next();
  },

  onStateChange: function(keys) {
    var hash = this.hash;
    keys.map(this.getFromHash).forEach(this.renderItem);
    debug('state change', keys);
  },

  onDestroy: function() {},

  render: function() {
    this.els = {};
    this.el.innerHTML = '';

    this.items
      .map(this.renderItem)
      .forEach(this.append);
  },

  renderItem: function(model) {
    var data = model.get();
    var key = data.key;
    var el = this.els[key] || document.createElement('li');
    el.setAttribute('data-key', key);
    el.setAttribute('data-value', data.value);
    el.innerHTML = this.templateItem(data);
    this.els[key] = el;
    debug('rendered item %s', key);
    return el;
  },

  templateItem: function(item) {
    return item.title + ' - ' + item.value;
  },

  append: function(el) {
    this.el.appendChild(el);
  },

  getFromHash: function(key) {
    return this.hash[key];
  },

  isPersistent: function(item) {
    return item.get('persistent');
  }
});

});
