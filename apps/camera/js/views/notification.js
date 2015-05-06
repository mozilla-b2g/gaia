define(function(require, exports, module) {
'use strict';

/**
* Dependencies
*/

var mix = require('lib/mixin');
var View = require('view');

/**
 * Exports
 */

module.exports = View.extend({
  name:'notification',
  tag: 'ul',
  time: 3000,

  initialize: function() {
    this.counter = 0;
    this.hash = {};
    // For accessibility purposes list/listitem semantics is not necessary.
    // Instead notifications are presented as status ARIA live regions.
    this.el.setAttribute('role', 'presentation');
  },

  /**
   * Display a new notification.
   *
   * Options:
   *
   *   - `text {L10nId}`
   *         L10nId may be:
   *         a string -> l10nId
   *         an object -> {id: l10nId, args: l10nArgs}
   *         an object -> {html: string}
   *       read more at: http://mzl.la/1A76Fby
   *   - `className {String}`
   *   - `persistent {Boolean}`
   *
   * @param  {Object} options
   * @return {Number} id for clearing
   * @public
   */
  display: function(options) {
    var item = mix({}, options);
    var id = ++this.counter;
    var self = this;

    item.el = document.createElement('li');
    item.el.className = options.className || '';

    var span = document.createElement('span');
    if (typeof(options.text) === 'string') {
      span.setAttribute('data-l10n-id', options.text);
    } else {
      if (options.text.html) {
        span.innerHTML = options.text.html;
      }
    }
    item.el.appendChild(span);
    if (options.attrs) { this.setAttributes(item.el, options.attrs); }
    // Notification should have the semantics of the status ARIA live region.
    item.el.setAttribute('role', 'status');
    // Making notfication assertive, so it is spoken right away and not queued.
    item.el.setAttribute('aria-live', 'assertive');
    this.el.appendChild(item.el);

    // Remove last temporary
    // notification in the way
    this.clear(this.temporary);

    // Remove non-persistent
    // messages after 3s
    if (!item.persistent) {
      this.temporary = id;
      this.hide(this.persistent);
      item.clearTimeout = setTimeout(function() {
        self.clear(id);
      }, this.time);
    }

    // Remove previous persistent
    if (item.persistent) {
      this.clear(this.persistent);
      this.persistent = id;
    }

    // Store and return
    this.hash[id] = item;
    return id;
  },

  setAttributes: function(el, attrs) {
    for (var key in attrs) { el.setAttribute(key, attrs[key]); }
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
  clear: function(id) {
    var item = this.hash[id];
    if (!item || item.cleared) { return; }

    this.el.removeChild(item.el);
    clearTimeout(item.clearTimeout);
    item.cleared = true;

    // Clear references
    if (item === this.temporary) { this.temporary = null; }
    if (item === this.persistent) { this.persistent = null; }
    delete this.hash[id];

    // Show persistent notification
    // (if there still is one)
    this.show(this.persistent);
  },

  /**
   * Hide a notification.
   *
   * @param  {Number} id
   * @private
   */
  hide: function(id) {
    var item = this.hash[id];
    if (!item) { return; }
    item.el.classList.add('hidden');
  },

  /**
   * Show a hidden notification.
   *
   * @param  {Number} id
   * @private
   */
  show: function(id) {
    var item = this.hash[id];
    if (!item) { return; }
    item.el.classList.remove('hidden');
  }
});

});
