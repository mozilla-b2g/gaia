define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var bind = require('utils/bind');
var View = require('vendor/view');
var addPanAndZoomHandlers = require('panzoom');
var MediaFrame = require('MediaFrame');

/**
 * Exports
 */

module.exports = View.extend({
  name: 'confirm',

  initialize: function() {
    this.on('destroy', this.onDestroy);
  },

  render: function() {
    var l10n = navigator.mozL10n;

    this.el.innerHTML = this.template({
      retake: l10n.get('retake-button'),
      select: l10n.get('select-button')
    });

    // Get elements
    this.els.mediaFrame = this.find('.js-media-frame');
    this.els.retake = this.find('.js-retake');
    this.els.select = this.find('.js-select');

    // Events
    bind(this.els.retake, 'click', this.onButtonClick);
    bind(this.els.select, 'click', this.onButtonClick);
    return this;
  },

  setupMediaFrame: function() {
    this.mediaFrame = new MediaFrame(this.els.mediaFrame);
    addPanAndZoomHandlers(this.mediaFrame);
    return this;
  },

  showImage: function(data) {
    this.mediaFrame.displayImage(
      data.blob,
      data.width,
      data.height,
      data.preview,
      data.rotation,
      data.mirrored);
    return this;
  },

  showVideo: function(data) {
    this.mediaFrame.displayVideo(
      data.video,
      data.poster.blob,
      data.width,
      data.height,
      data.rotation);
    return this;
  },

  template: function(data) {
    /*jshint maxlen:false*/
    return '<div class="confirm-media-frame js-media-frame"></div>' +
    '<footer id="confirm-controls" class="confirm-controls">' +
      '<button class="retake-button js-retake" name="retake">' +
      data.retake + '</button>' +
      '<button class="select-button recommend js-select" name="select">' +
      data.select + '</button>' +
    '</footer>';
  },

  onButtonClick: function(event) {
    var el = event.currentTarget;
    var name = el.getAttribute('name');
    this.emit('click:' + name);
  },

  onDestroy: function() {
    this.mediaFrame.clear();
  }
});

});
