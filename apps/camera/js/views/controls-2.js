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
  name: 'controls-2',
  className: 'test-controls',

  initialize: function() {
    this.render();
  },

  render: function() {
    this.el.innerHTML = this.template();
    this.els.thumbnail = this.find('.js-thumbnail');
    this.els.inner = this.find('.js-inner');

    // Bind events
    attach.on(this.els.inner, 'click', '.js-btn', this.onButtonTap);
    debug('rendered');
  },

  onButtonTap: function(e, el) {
    var name = el.getAttribute('name');
    this.emit('tap:' + name, e);
  },

  template: function() {
    /*jshint maxlen:false*/
    return '<div class="inner js-inner">' +
      '<div class="controls-2_left">' +
        '<div>' +
          '<div class="controls-2_gallery-button icon-gallery js-btn" name="gallery"></div>' +
          '<div class="controls-2_thumbnail js-thumbnail js-btn" name="gallery"></div>' +
        '</div>' +
      '</div>' +
      '<div class="controls-2_middle">' +
        '<div class="capture-button-2 js-btn" name="capture">' +
          '<div class="circle outer-circle"></div>' +
          '<div class="circle inner-circle"></div>' +
          '<div class="center icon"></div>' +
        '</div>' +
      '</div>' +
      '<div class="controls-2_right">' +
        '<div class="mode-toggle js-btn icon" name="switch">' +
          '<div><span class="selected-mode-icon icon"></span></div>' +
        '</div>' +
      '</div>' +
    '</div>';
  },

  setThumbnail: function(blob) {
    if (!this.els.image) {
      this.els.image = new Image();
      this.els.thumbnail.appendChild(this.els.image);
    }
    this.els.image.src = window.URL.createObjectURL(blob);
  }
});

});
