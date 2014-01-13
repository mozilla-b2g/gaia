/*global define*/

define(function(require) {
  'use strict';

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
    initialize: function(){},
  });

  /**
   * Extends the base view
   * class with the given
   * properties.
   *
   * @param  {Object} properties
   * @return {Function}
   */
  View.extend = function(properties) {
    // The child class constructor
    // just calls the parent constructor
    var Extended = function(){
      View.apply(this, arguments);
    };

    // Base the Child prototype
    // on the View's prototype.
    Extended.prototype = Object.create(View.prototype);

    // Mixin any given properties
    mixin(Extended.prototype, properties);

    return Extended;
  };

  // Exports
  return View;
});
