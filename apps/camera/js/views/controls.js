define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var formatTimer = require('lib/format-timer');
var debug = require('debug')('view:controls');
var View = require('vendor/view');
var bind = require('lib/bind');

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
    this.els.timer = this.find('.js-video-timer');
    this.els.cancel = this.find('.js-cancel-pick');
    this.els.capture = this.find('.js-capture');
    this.els.switch = this.find('.js-switch');
    bind(this.els.timer, 'click', this.onButtonTap);
    bind(this.els.switch, 'click', this.onButtonTap);
    bind(this.els.capture, 'click', this.onButtonTap);
    bind(this.els.cancel, 'click', this.onButtonTap);
    debug('rendered');
  },

  setVideoTimer: function(ms) {
    var formatted = formatTimer(ms);
    this.els.timer.textContent = formatted;
  },

  onButtonTap: function(e, el) {
    var name = el.getAttribute('name');
    this.emit('tap:' + name, e);
  },

  template: function() {
    return '' +
    '<a class="switch-button test-switch" name="switch">' +
      '<span class="icon rotates"></span>' +
    '</a>' +
    '<a class="capture-button test-capture js-capture" name="capture">' +
      '<span class="icon rotates"></span>' +
    '</a>' +
    '<div class="misc-button">' +
      '<a class="gallery-button test-gallery js-gallery" name="gallery">' +
        '<span class="icon-gallery rotates"></span>' +
      '</a>' +
      '<a class="cancel-pick test-cancel-pick js-cancel-pick" name="cancel">' +
        '<span></span>' +
      '</a>' +
      '<span class="video-timer test-video-timer js-video-timer">00:00</span>' +
    '</div>';
  },

  setThumbnail: function(blob) {}

});

});
