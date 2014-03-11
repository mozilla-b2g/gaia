define(function(require, exports, module) {
  'use strict';

  /**
   * Dependencies
   */

  var bindAll = require('lib/bind-all');
  var events = require('vendor/evt');
  var mixin = require('lib/mixin');

  /**
   * Locals
   */

  var counter = 1;
  var noop = function() {};

  /**
   * Exports
   */

  module.exports = View;

  /**
   * Base view class. Accepts
   * or creates a root element
   * which we template into.
   *
   * @constructor
   */
  function View(options) {
    options = options || {};
    this.el = options.el || this.el || document.createElement(this.tag);
    this.el.id = this.el.id || ('view' + counter++);
    this.name = options.name || this.name;
    this.els = {};

    if (!this.el.className) {
      if (this.name) this.el.className += ' ' + this.name;
      if (this.className) this.el.className += ' ' + this.className;
    }

    bindAll(this);
    this.initialize.apply(this, arguments);
  }

  /**
   * Base view prototype,
   * mixed in event emitter.
   *
   * @type {Object}
   */
  events(View.prototype);

  // Allow for 'emit' or
  // 'fire' to trigger events
  View.prototype.fire = View.prototype.fire || View.prototype.emit;

  /**
   * Default tagName
   *
   * @type {String}
   */
  View.prototype.tag = 'div';
  View.prototype.name = 'noname';

  /**
   * Appends the root element
   * to the given parent.
   *
   * @param  {Element} parent
   * @return {View}
   */
  View.prototype.appendTo = function(parent) {
    if (!parent) return this;
    parent.appendChild(this.el);
    this.fire('inserted');
    return this;
  };

  /**
   * Prepends the root element
   * to the given parent.
   *
   * @param  {Element} parent
   * @return {View}
   */
  View.prototype.prependTo = function(parent) {
    if (!parent) return this;
    var first = parent.firstChild;

    if (first) parent.insertBefore(this.el, first);
    else this.appendTo(parent);

    this.fire('inserted');
    return this;
  };

  /**
   * Convenient shorthand
   * querySelector.
   *
   * @param  {String} query
   * @return { Element | null}
   */
  View.prototype.find = function(query) {
    return this.el.querySelector(query);
  };

  /**
   * Removes the element from
   * its current DOM location.
   *
   * @param  {Object} options
   * @return {View}
   */
  View.prototype.remove = function(options) {
    var silent = options && options.silent;
    var parent = this.el.parentNode;
    if (!parent) return this;
    parent.removeChild(this.el);
    if (!silent) this.fire('remove');
    return this;
  };

  View.prototype.set = function(key, value) {
    value = arguments.length === 2 ? value : true;
    this.el.setAttribute(toDashed(key), value);
  };

  View.prototype.setter = function(key) {
    return (function(value) { this.set(key, value); }).bind(this);
  };

  View.prototype.enable = function(key, value) {
    value = arguments.length === 2 ? value : true;
    this.set(key + '-enabled', !!value);
  };

  View.prototype.disable = function(key) {
    this.enable(key, false);
  };

  View.prototype.enabler = function(key) {
    return (function(value) { this.enable(key, value); }).bind(this);
  };

  View.prototype.hide = function(key) {
    key = key ? key + '-' : '';
    this.el.classList.add(key + 'hidden');
    this.el.classList.remove(key + 'visible');
  };

  View.prototype.show =  function(key) {
    key = key ? key + '-' : '';
    this.el.classList.remove(key + 'hidden');
    this.el.classList.add(key + 'visible');
  };

  View.prototype.toggle = function(key, value) {
    key = key ? key + '-' : '';
    key = arguments.length === 1 && typeof key === 'boolean' ? '' : key;
    this.el.classList.toggle(key + 'hidden', !value);
    this.el.classList.toggle(key + 'visible', value);
  };

  /**
   * Removes the element from
   * it's current context, firing
   * a 'destroy' event to allow
   * views to perform cleanup.
   *
   * Then clears any internal
   * references to aid GC.
   *
   * @return {[type]} [description]
   */
  View.prototype.destroy = function(options) {
    var noRemove = options && options.noRemove;
    if (!noRemove) this.remove();
    this.fire('destroy');
    this.el = null;
  };

  View.prototype.toString = function() {
    return '[object View]';
  };

  // Overwrite as required
  View.prototype.initialize = noop;
  View.prototype.template = function() { return ''; };

  /**
   * Extends the base view
   * class with the given
   * properties.
   *
   * TODO: Pull this out to
   * standalone module.
   *
   * @param  {Object} properties
   * @return {Function}
   */
  View.extend = function(props) {
    var Parent = this;

    // The extended constructor
    // calls the parent constructor
    var Child = function() {
      Parent.apply(this, arguments);
    };

    Child.prototype = Object.create(Parent.prototype);
    Child.extend = View.extend;
    mixin(Child.prototype, props);

    return Child;
  };

  function toDashed(s) {
    return s.replace(/\W+/g, '-')
      .replace(/([a-z\d])([A-Z])/g, '$1-$2')
      .toLowerCase();
  }
});
