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
    this.hash = {};
    this.items.forEach(this.addToHash);
    attach(this.el, 'click', 'li', this.onItemClick);
    attach(this.el, 'click', this.onClick);
    this.state.on('change', this.onStateChange);
    this.on('destroy', this.onDestroy);
  },

  // Stop propagation out of menu
  onClick: function() {
    debug('menu click');
    return false;
  },

  onItemClick: function(e, el) {
    debug('item click');
    e.stopPropagation();
    var key = el.getAttribute('data-key');
    this.toggleKey(key);
  },

  onStateChange: function(keys) {
    debug('state change', keys);
    keys.forEach(this.refreshItem);
  },

  onDestroy: function() {
    this.state.off('change', this.onStateChange);
  },

  render: function() {
    this.el.innerHTML = this.template(this.items);
    return this;
  },

  template: function(items) {
    return items.map(this.templateItem, this).join('');
  },

  templateItem: function(item) {
    var key = item.key;
    var state = this.state.get(key);
    var title = item.title || key;
    var html = '<li data-key="' + key + '" data-state="' + state + '">' + title + ' - ' + state + '</li>';
    debug('templated item: %s', title, item);
    return html;
  },

  refreshItem: function(key) {
    var el = this.find('[data-key=' + key + ']');
    if (!el) { return; }
    var item = this.hash[key];
    var newEl = toElement(this.templateItem(item));
    el.parentNode.replaceChild(newEl, el);
    debug('%s item refreshed', key);
  },

  addToHash: function(item) {
    this.hash[item.key] = item;
  },

  toggleKey: function(key) {
    var current = this.state.get(key);
    var item = this.hash[key];
    var options = item.options;
    var index = options.indexOf(current);
    var newIndex = (index + 1) % options.length;
    var newValue = options[newIndex];
    this.state.set(key, newValue);
    debug('%s key toggled to \'%s\'', key, newValue);
  }
});


function toElement(html) {
  var parent = document.createElement('div');
  parent.innerHTML = html;
  return parent.firstElementChild;
}

});
