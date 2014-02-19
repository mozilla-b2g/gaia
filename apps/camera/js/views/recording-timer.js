define(function(require) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('view:recording-timer');
var formatTimer = require('lib/format-timer');

var View = require('vendor/view');

/**
 * Locals
 */

return View.extend({
  name: 'recording-timer',
  className: 'recording-timer',

  initialize: function() {
    this.render();
    debug('rendered');
  },

  render: function() {
    this.el.textContent = formatTimer(this._value);
  },

  _value: 0,

  getValue: function() {
    return this._value;
  },

  setValue: function(value) {
    this._value = value;
    this.el.textContent = formatTimer(this._value);
  },

  show: function() {
    this.el.classList.add('active');
  },

  hide: function() {
    this.el.classList.remove('active');
  }
});

});
