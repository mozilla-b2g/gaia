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
    attach.on(this.el, 'click', '.js-btn', this.onButtonTap);
    debug('rendered');
  },

  onButtonTap: function(e, el) {
    e.stopPropagation();
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
      '<a class="cancel-pick test-cancel-pick js-btn" name="cancel"></a>' +
    '</div>';
  },

  setThumbnail: function(blob) {}

});

});
