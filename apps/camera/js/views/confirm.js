define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var addPanAndZoomHandlers = require('lib/panzoom');
var orientation = require('lib/orientation');
var MediaFrame = require('MediaFrame');
var bind = require('lib/bind');
var View = require('view');

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

    // Disable buttons on this view by default
    // until an image/video is displayed
    this.disableButtons();

    this.setupMediaFrame();
    return this;
  },

  setupMediaFrame: function() {
    this.mediaFrame = new MediaFrame(this.els.mediaFrame, true,
                                     this.maxPreviewSize);
    addPanAndZoomHandlers(this.mediaFrame);
    window.addEventListener('resize', this.onResize);
    return this;
  },

  clearMediaFrame: function() {
    this.mediaFrame.clear();
    this.disableButtons();
  },

  hide: function() {
    this.el.classList.add('hidden');
    orientation.lock();
  },

  show: function() {
    this.el.classList.remove('hidden');
    orientation.unlock();
  },

  disableButtons: function() {
    this.els.retake.setAttribute('disabled', true);
    this.els.select.setAttribute('disabled', true);
  },

  enableButtons: function() {
    this.els.retake.removeAttribute('disabled');
    this.els.select.removeAttribute('disabled');
  },

  showImage: function(image) {
    this.enableButtons();
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
    this.enableButtons();
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

  onResize: function() {
    this.mediaFrame.resize();
    if (this.mediaFrame.displayingVideo) {
      this.mediaFrame.video.setPlayerSize();
    }
  },

  onDestroy: function() {
    window.removeEventListener('resize', this.onResize);
    this.mediaFrame.clear();
  }
});

});
