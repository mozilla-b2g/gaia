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
  name:'notification',
  tag: 'ul',
  duration: 3000,

  initialize: function(options) {
    this.persistentMessage = null;
  },

  display: function(options) {
    var item = options;
    var self = this;

    item.el = document.createElement('li');
    item.el.className = options.className || '';
    item.el.innerHTML = options.text;
    this.el.appendChild(item.el);

    // Remove last notfication in the way
    this.clear(this.temporary);

    // Remove non-persistent
    // messages after 3s
    if (!item.persistent) {
      this.temporary = item;
      this.hide(this.persistent, this.duration + 100);
      item.clearTimeout = setTimeout(function() {
        self.clear(item);
      }, this.duration);
    }

    // Remove previous persistent
    if (item.persistent) {
      this.clear(this.persistent);
      this.persistent = item;
    }

    return item;
  },

  clear: function(item) {
    if (!item || item.cleared) { return; }

    this.el.removeChild(item.el);
    clearTimeout(item.clearTimeout);
    item.cleared = true;

    if (item === this.temporary) { this.temporary = null; }
    if (item === this.persistent) { this.persistent = null; }
  },

  hide: function(item, ms) {
    if (!item) { return; }
    var self = this;
    item.el.classList.add('hidden');
    if (ms) {
      clearTimeout(item.showTimeout);
      item.showTimeout = setTimeout(function() { self.show(item); }, ms);
    }
  },

  show: function(item) {
    if (!item) { return; }
    item.el.classList.remove('hidden');
    clearTimeout(item.showTimeout);
  }
});

});