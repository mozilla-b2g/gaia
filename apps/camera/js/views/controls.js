define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var formatTimer = require('lib/format-timer');
var debug = require('debug')('view:controls');
var attach = require('vendor/attach');
var View = require('vendor/view');
var find = require('lib/find');

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
    attach.on(this.el, 'click', '.js-btn', this.onButtonTap);
    this.els.timer = find('.js-video-timer', this.el);
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
    '<a class="switch-button test-switch js-btn" name="switch">' +
      '<span class="icon rotates"></span>' +
    '</a>' +
    '<a class="capture-button test-capture js-btn" name="capture">' +
      '<span class="icon rotates"></span>' +
    '</a>' +
    '<div class="misc-button">' +
      '<a class="gallery-button test-gallery js-btn" name="gallery">' +
        '<span class="icon-gallery rotates"></span>' +
      '</a>' +
      '<a class="cancel-pick test-cancel-pick js-btn" name="cancel"></a>' +
      '<span class="video-timer test-video-timer js-video-timer">00:00</span>' +
    '</div>';
  },

  setThumbnail: function(blob) {}

});

});
