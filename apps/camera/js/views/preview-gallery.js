define(function(require) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('view:preview-gallery');
var bind = require('lib/bind');
var attach = require('vendor/attach');
var View = require('vendor/view');
var orientation = require('lib/orientation');
var addPanAndZoomHandlers = require('lib/panzoom');
var MediaFrame = require('MediaFrame');

/**
 * Locals
 */

return View.extend({
  name: 'preview-gallery',
  className: 'offscreen',

  initialize: function() {
    debug('rendered');
  },

  render: function() {
    this.el.innerHTML = this.template();
    this.els.previewControl = this.find('.js-preview');
    this.els.frameContainer = this.find('.js-frame-container');
    this.els.mediaFrame = this.find('.js-media-frame');
    this.els.countText = this.find('.js-count-text');
    this.els.previewMenu = this.find('.js-preview-menu');

    bind(this.el, 'click', this.onClick);
    bind(this.els.mediaFrame, 'orientationSwipe', this.orientationSwipe);
    attach.on(this.els.previewMenu, 'click', '.js-btn', this.onButtonClick);

    orientation.on('orientation', this.setOrientation);
    this.configure();
    return this;
  },

  configure: function() {
    this.frame = new MediaFrame(this.els.mediaFrame);
    
    this.els.player = this.find('.videoPlayer');
    this.els.playerPlayBtn = this.find('.videoPlayerPlayButton');

    // To hanlde player events in the preview not video_player.js.
    // Use 'click' event instead of 'play'
    // because 'click' event fires ealer than 'play'
    bind(this.els.playerPlayBtn, 'click', this.handleVideoPlay);
    bind(this.els.player, 'pause', this.handleVideoStop);
    bind(this.els.player, 'ended', this.handleVideoStop);

    this.items = [];
    addPanAndZoomHandlers(this.frame);
  },

  template: function() {
    /*jshint maxlen:false*/
    return '<div class="frame-container js-frame-container">' +
      '<div class="media-frame js-media-frame"></div>' +
      '</div>' +
      '<div class="preview-menu js-preview-menu">' +
        '<div class="camera-back icon-camera-back rotates js-btn" name="back"></div>' +
        '<div class="count-text js-count-text"></div>' +
        '<footer class="preview-controls js-preview">' +
          '<div class="preview-gallery-button js-btn" name="gallery">' +
            '<div class="preview-gallery-icon icon-gallery"></div>' +
          '</div>' +
          '<div class="preview-share-button js-btn" name="share">' +
            '<div class="preview-share-icon icon-preview-share"></div>' +
          '</div>' +
          '<div class="preview-delete-button js-btn" name="delete">' +
            '<div class="preview-delete-icon icon-preview-delete"></div>' +
          '</div>' +
        '</footer>' +
      '</div>';
  },

  onClick: function() {
    if (this.videoPlaying) { return; }
    
    var isShown = this.els.previewMenu.classList.contains('visible');
    if (isShown) {
      this.previewMenuFadeOut();
    } else {
      this.previewMenuFadeIn();
    }
  },

  previewMenuFadeIn: function() {
    this.els.previewMenu.classList.add('visible');
    if (this.previewTimer) {
      clearTimeout(this.previewTimer);
    }

    // The preview menu is always faded out after 3secs
    this.previewTimer = setTimeout(this.previewMenuFadeOut, 3000);
  },

  previewMenuFadeOut: function() {
    this.els.previewMenu.classList.remove('visible');
  },

  orientationSwipe: function(e) {
    if (this.videoPlaying) {
      this.handleVideoStop();
    }
    this.emit('itemChange', e);
  },

  onButtonClick: function(e, el) {
    var name = el.getAttribute('name');
    this.emit('click:' + name, e);
    e.stopPropagation();
  },

  open: function() {
    this.setOrientation(orientation.get());
    this.previewMenuFadeIn();
    this.el.classList.remove('offscreen');
  },

  close: function() {
    this.previewMenuFadeOut();
    this.el.classList.add('offscreen');
    this.frame.clear();
  },

  isPreviewOpened: function() {
    return !this.el.classList.contains('offscreen');
  },

  updateCountText: function(current, total) {
    this.els.countText.textContent = current + '/' + total;
  },

  setOrientation: function(orientation) {
    // And we have to resize the frame (and its video player)
    this.frame.resize();
    this.frame.video.setPlayerSize();

    // And inform the video player of new orientation
    this.frame.video.setPlayerOrientation(orientation);
  },

  showImage: function(image) {
    this.frame.displayImage(
      image.blob,
      image.width,
      image.height,
      image.preview,
      image.rotation,
      image.mirrored);
  },

  showVideo: function(video) {
    this.frame.displayVideo(
      video.blob,
      video.poster.blob,
      video.width,
      video.height,
      video.rotation);
  },

  handleVideoPlay: function(e) {
    this.videoPlaying = true;
    this.previewMenuFadeOut();
    e.stopPropagation();
  },

  handleVideoStop: function() {
    this.videoPlaying = false;
    setTimeout(this.previewMenuFadeIn, 200);
  }

});

});
