define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var addPanAndZoomHandlers = require('lib/panzoom');
var MediaFrame = require('MediaFrame');
var View = require('vendor/view');
var bind = require('lib/bind');

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

    this.show();

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

    this.setupMediaFrame();
    return this;
  },

  setupMediaFrame: function() {
    this.mediaFrame = new MediaFrame(this.els.mediaFrame);
    addPanAndZoomHandlers(this.mediaFrame);
    return this;
  },

  hide: function() {
    this.el.classList.add('hidden');
  },

  show: function() {
    this.el.classList.remove('hidden');
  },

  showImage: function(image) {
    this.mediaFrame.displayImage(
      image.blob,
      image.width,
      image.height,
      image.preview,
      image.rotation,
      image.mirrored);
    return this;
  },

  showVideo: function(video) {
    this.mediaFrame.displayVideo(
      video.blob,
      video.poster.blob,
      video.width,
      video.height,
      video.rotation);
    return this;
  },

  template: function(data) {
    /*jshint maxlen:false*/
    return '<div class="confirm-media-frame js-media-frame"></div>' +
    '<footer id="confirm-controls" class="confirm-controls">' +
      '<button class="retake-button js-retake" name="retake">' +
      data.retake + '</button>' +
      '<button class="select-button test-confirm-select js-select" name="select">' +
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
