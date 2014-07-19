define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('view:controls');
var attach = require('vendor/attach');
var View = require('vendor/view');

/**
 * Exports
 */

module.exports = View.extend({
  name: 'controls',
  className: 'test-controls',

  initialize: function() {
    this.render();
  },

  render: function() {
    this.el.innerHTML = this.template();
    this.els.thumbnail = this.find('.js-thumbnail');
    this.els.capture = this.find('.js-capture');
    this.els.cancel = this.find('.js-cancel');
    this.els.switch = this.find('.js-switch');

    // Clean up
    delete this.template;

    debug('rendered');
    return this.bindEvents();
  },

  bindEvents: function() {
    attach.on(this.el, 'click', '.js-btn', this.onButtonClick);
    attach.on(this.el, 'click', '.js-switch', this.onButtonClick);
    return this;
  },

  onButtonClick: function(e, el) {
    var name = el.getAttribute('name');
    var enabled = this.get('data-enabled');
    e.stopPropagation();
    if (enabled === 'true') {
      this.emit('click:' + name, e);
    }
  },

  template: function() {
    /*jshint maxlen:false*/
    return '<div class="controls-left">' +
      '<div class="controls-button controls-thumbnail-button js-thumbnail js-btn rotates" name="thumbnail"></div>' +
      '<div class="controls-button controls-cancel-pick-button test-cancel-pick icon-pick-cancel js-btn rotates" name="cancel"></div>' +
    '</div>' +
    '<div class="controls-middle">' +
      '<div class="capture-button test-capture js-btn rotates" name="capture">' +
        '<div class="circle outer-circle"></div>' +
        '<div class="circle inner-circle"></div>' +
        '<div class="center icon"></div>' +
      '</div>' +
    '</div>' +
    '<div class="controls-right">' +
      '<div class="mode-switch test-switch js-switch" name="switch">' +
        '<div class="mode-icon icon rotates"></div>' +
        '<div class="selected-mode">' +
          '<div class="selected-mode-icon icon rotates"></div>' +
        '</div>' +
      '</div>' +
    '</div>';
  },

  setThumbnail: function(blob) {
    if (!this.els.image) {
      this.els.image = new Image();
      this.els.image.classList.add('test-thumbnail');
      this.els.thumbnail.appendChild(this.els.image);
      this.set('thumbnail', true);
    } else {
      window.URL.revokeObjectURL(this.els.image.src);
    }

    this.els.image.src = window.URL.createObjectURL(blob);
    debug('thumbnail set');
  },

  removeThumbnail: function() {
    if (this.els.image) {
      this.els.thumbnail.removeChild(this.els.image);
      window.URL.revokeObjectURL(this.els.image.src);
      this.els.image = null;
    }

    this.set('thumbnail', false);
  },

  /**
   * NOTE: The below functions are a first
   * attempt at replacing the default View
   * `.set()`, `.enable()` and `.disable()` APIs
   * to avoid having to use attributes to style
   * state in our CSS.
   */

  set: function(key, value) {
    if (typeof key !== 'string') { return; }
    if (arguments.length === 1) { value = true; }
    if (!value) { return this.unset(key); }

    var attr = 'data-' + key;
    var oldValue = this.el.getAttribute(attr);
    var oldClass = oldValue && classFrom(key, oldValue);
    var newClass = classFrom(key, value);

    if (oldClass) { this.el.classList.remove(oldClass); }
    if (newClass) { this.el.classList.add(newClass); }

    this.el.setAttribute(attr, value);
    debug('remove: %s, add: %s', oldClass, newClass);
    debug('attr key: %s, value: %s', attr, value);
  },

  unset: function(key) {
    var attr = 'data-' + key;
    var value = this.el.getAttribute(attr);
    this.el.classList.remove(classFrom(key, value));
    this.el.removeAttribute(attr);
  },

  enable: function(key) {
    this.set(key ? key + '-enabled' : 'enabled');
    this.unset(key ? key + '-disabled' : 'disabled');
  },

  disable: function(key) {
    this.set(key ? key + '-disabled' : 'disabled');
    this.unset(key ? key + '-enabled' : 'enabled');
  }
});

/**
 * Examples:
 *
 *   this.classFrom('recording', true); //=> 'recording'
 *   this.classFrom('flash', 'on'); //=> 'flash-on'
 *   this.classFrom('recording', false); //=> ''
 *   this.classFrom('recording'); //=> 'recording'
 *   this.classFrom('recording', 'true'); //=> 'recording'
 *   this.classFrom('recording', 'false'); //=> ''
 *
 * @param  {String} key
 * @param  {*} value
 * @return {String}
 */
function classFrom(key, value) {
  value = detectBooleans(value);
  if (typeof value === 'boolean') {
    return value ? key : '';
  } else if (value) {
    return key + '-' + value ;
  } else {
    return key;
  }
}

function detectBooleans(value) {
  if (typeof value === 'boolean') { return value; }
  else if (value === 'true') { return true; }
  else if (value === 'false') { return false; }
  else { return value; }
}

});
