/*global define*/

define(function(require) {
  'use strict';

  /**
   * Dependencies
   */

  var evt = require('libs/evt');
  var mixin = require('utils/mixin');

  /**
   * Base view class. Accepts
   * or creates a root element
   * which we template into.
   *
   * @constructor
   */
  var View = function(el){
    this.el = el || document.createElement(this.tag);
    this.els = {};

    // Initialize our 'faux' constructor
    this.initialize.apply(this, arguments);
  };

  /**
   * Base view prototype,
   * mixed in event emitter.
   *
   * @type {Object}
   */
  View.prototype = evt.mix({
    tag: 'div',

    // NO-OP
    initialize: function(){},

    /**
     * addEventListener shorthand.
     * @param  {Element}   el
     * @param  {String}   name
     * @param  {Function} fn
     */
    bind: function(el, name, fn) {
      el.addEventListener(name, fn);
    },

    /**
     * removeEventListener shorthand.
     * @param  {Element}   el
     * @param  {String}   name
     * @param  {Function} fn
     */
    unbind: function(el, name, fn) {
      el.removeEventListener(name, fn);
    },

    /**
     * Shorthand querySelector
     * from view module's root.
     *
     * @param  {String} query
     * @return {Element|null}
     */
    find: function(query) {
      return this.el.querySelector(query);
    }
  });

  /**
   * Extends the base view
   * class with the given
   * properties.
   *
   * @param  {Object} props
   * @return {Function}
   */
  View.extend = function(props) {

    // The child class constructor
    // just calls the parent constructor
    var Child = function(){
      View.apply(this, arguments);
    };

    // Base the Child prototype
    // on the View's prototype.
    Child.prototype = Object.create(View.prototype);

    // Mixin any given properties
    mixin(Child.prototype, props);

    return Child;
  };

  // Exports
  return View;
});
