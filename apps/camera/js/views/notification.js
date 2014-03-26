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

  display: function(options) {
    var item = options;
    var self = this;

    item.el = document.createElement('li');
    item.el.className = options.className || '';
    item.el.innerHTML = '<span>' + options.text + '</span>';
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

  /**
   * Clear notfication by id.
   *
   * Remove the notification from the DOM,
   * clear any existing `clearTimeout` that
   * may have been installed on creation.
   *
   * @param  {Number} item
   * @public
   */
  clear: function(item) {
    if (!item || item.cleared) { return; }

    this.el.removeChild(item.el);
    clearTimeout(item.clearTimeout);
    item.cleared = true;

    // Clear references
    if (item === this.temporary) { this.temporary = null; }
    if (item === this.persistent) { this.persistent = null; }

    // Show persistent notifcation
    // (if there is one)
    this.show(this.persistent);
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