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

    // Bind events
    attach.on(this.el, 'click', '.js-btn', this.onButtonClick);
    attach.on(this.el, 'click', '.js-switch', this.onButtonClick);
    debug('rendered');
  },

  onButtonClick: function(e, el) {
    var name = el.getAttribute('name');
    e.stopPropagation();
    this.emit('click:' + name, e);
  },

  template: function() {
    /*jshint maxlen:false*/
    return '' +
      '<div class="controls-left">' +
        '<div class="controls-button controls-gallery-button test-gallery icon-gallery js-thumbnail js-btn" name="gallery"></div>' +
        '<div class="controls-button controls-cancel-pick-button test-cancel-pick icon-cancel js-btn" name="cancel">×</div>' +
      '</div>' +
      '<div class="controls-middle">' +
        '<div class="capture-button test-capture js-btn rotates" name="capture">' +
          '<div class="circle outer-circle"></div>' +
          '<div class="circle inner-circle"></div>' +
          '<div class="center icon"></div>' +
        '</div>' +
      '</div>' +
      '<div class="controls-right">' +
        '<div class="mode-switch test-switch js-switch icon" name="switch">' +
          '<div class="mode-icon icon rotates"></div>' +
          '<div class="selected-mode">' +
            '<div class="selected-mode-icon rotates"></div>' +
          '</div>' +
        '</div>' +
      '</div>';
  },

  setThumbnail: function(blob) {
    if (!this.els.image) {
      this.els.image = new Image();
      this.els.thumbnail.appendChild(this.els.image);
      this.els.image.classList.add('rotates');
    } else {
      window.URL.revokeObjectURL(this.els.image.src);
    }
    this.els.image.src = window.URL.createObjectURL(blob);
  }

});

});
