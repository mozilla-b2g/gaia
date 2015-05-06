define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('view:viewfinder');
var bind = require('lib/bind');
var CameraUtils = require('lib/camera-utils');
var View = require('view');

/**
 * Locals
 */

var isZoomEnabled = false;
var scaleSizeTo = {
  fill: CameraUtils.scaleSizeToFillViewport,
  fit: CameraUtils.scaleSizeToFitViewport
};

var clamp = function(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
};

module.exports = View.extend({
  name: 'viewfinder',
  className: 'js-viewfinder',
  fadeTime: 360,

  initialize: function() {
    this.render();
    this.getSize();
  },

  render: function() {
    this.el.innerHTML = this.template();
    this.els.frame = this.find('.js-frame');
    this.els.video = this.find('.js-video');
    this.els.videoContainer = this.find('.js-video-container');

    // Clean up
    delete this.template;

    debug('rendered');
    return this.bindEvents();
  },

  bindEvents: function() {
    bind(this.el, 'click', this.onClick);
    bind(this.el, 'animationend', this.onShutterEnd);
    return this;
  },

  /**
   * Stores the container size.
   *
   * We're using window dimensions
   * here to avoid causing costly
   * reflows.
   *
   * @public
   */
  getSize: function() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    return {
      width: this.width,
      height: this.height
    };
  },

  onClick: function(e) {
    this.emit('click', e);
  },

  enableZoom: function(minimumZoom, maximumZoom) {
    if (minimumZoom) {
      this._minimumZoom = minimumZoom;
    }

    if (maximumZoom) {
      this._maximumZoom = maximumZoom;
    }

    isZoomEnabled = true;
  },

  disableZoom: function() {
    this._minimumZoom = 1.0;
    this._maximumZoom = 1.0;

    this.setZoom(1.0);

    isZoomEnabled = false;
  },

  _minimumZoom: 1.0,

  setMinimumZoom: function(minimumZoom) {
    this._minimumZoom = minimumZoom;
  },

  _maximumZoom: 1.0,

  setMaximumZoom: function(maximumZoom) {
    this._maximumZoom = maximumZoom;
  },

  _zoom: 1.0,

  /**
   * Update the internal state of the view so that any future
   * pinch-to-zoom gestures can correctly adjust the current zoom
   * level in the event that the zoom level is changed outside of
   * the pinch-to-zoom gesture (e.g.: ZoomBar). This gets called
   * when the `Camera` emits a `zoomchanged` event.
   */
  setZoom: function(zoom) {
    if (!isZoomEnabled) {
      return;
    }

    this._zoom = clamp(zoom, this._minimumZoom, this._maximumZoom);
  },

  _useZoomPreviewAdjustment: false,

  enableZoomPreviewAdjustment: function() {
    this._useZoomPreviewAdjustment = true;
  },

  disableZoomPreviewAdjustment: function() {
    this._useZoomPreviewAdjustment = false;
  },

  /**
   * Adjust the scale of the <video/> tag to compensate for the inability
   * of the Camera API to zoom the preview stream beyond a certain point.
   * This gets called when the `Camera` emits a `zoomchanged` event and is
   * calculated by `Camera.prototype.getZoomPreviewAdjustment()`.
   */
  setZoomPreviewAdjustment: function(zoomPreviewAdjustment) {
    if (this._useZoomPreviewAdjustment) {
      this.els.video.style.transform = 'scale(' + zoomPreviewAdjustment + ')';
    }
  },

  stopStream: function() {
    this.els.video.mozSrcObject = null;
  },

  fadeOut: function(done) {
    debug('fade-out');
    var self = this;
    this.hide();
    document.body.classList.remove('no-background');
    clearTimeout(this.fadeTimeout);
    this.fadeTimeout = setTimeout(function() {
      self.emit('fadedout');
      if (done) { done(); }
    }, this.fadeTime);
  },

  fadeIn: function(ms, done) {
    debug('fade-in');
    var self = this;
    if (typeof ms === 'function') { done = ms, ms = null; }
    ms = ms || this.fadeTime;
    this.el.style.transitionDuration = ms + 'ms';
    this.show();
    clearTimeout(this.fadeTimeout);
    this.fadeTimeout = setTimeout(function() {
      document.body.classList.add('no-background');
      self.el.style.transitionDuration = '';
      self.emit('fadedin');
      if (done) { done(); }
    }, ms);
  },

  /**
   * Triggers a quick shutter style animation.
   *
   * @private
   */
  shutter: function() {
    this.el.classList.add('shutter');
  },

  /**
   * Force a reflow before removing
   * the shutter class so that it
   * doesn't impact the animation.
   *
   * @private
   */
  onShutterEnd: function() {
    this.reflow = this.el.offsetTop;
    this.el.classList.remove('shutter');
  },

  /**
   * Sizes and positions the preview stream.
   *
   * @param  {Object} preview
   * @param  {Number} sensorAngle
   * @param  {Boolean} mirrored
   */
  updatePreview: function(preview, sensorAngle, mirrored) {
    if (!preview) { return; }
    var aspect;

    // Invert dimensions if the camera's `sensorAngle` is
    // 0 or 180 degrees.
    if (sensorAngle % 180 === 0) {
      this.container = {
        width: this.width,
        height: this.height,
        aspect: this.width / this.height
      };

      aspect = preview.height / preview.width;
    } else {
      this.container = {
        width: this.height,
        height: this.width,
        aspect: this.height / this.width
      };

      aspect = preview.width / preview.height;
    }

    var shouldFill = aspect > this.container.aspect;
    var scaleType = this.scaleType || (shouldFill ? 'fill' : 'fit');

    this.updatePreviewMetrics(preview, sensorAngle, mirrored, scaleType);
  },

  /**
   * Calculates the correct sizing
   * depending on the chosen 'scaleType'.
   *
   * 'scale-type' attribute set as a styling hook.
   *
   * @param  {Object} preview
   * @param  {Number} sensorAngle
   * @param  {Boolean} mirrored
   * @param  {String} scaleType 'fill'|'fit'
   */
  updatePreviewMetrics: function(preview, sensorAngle, mirrored, scaleType) {
    debug('update preview scaleType: %s', scaleType, preview);

    // Calculate the correct scale to apply to the
    // preview to either 'fill' or 'fit' the viewfinder
    // container (always preserving the aspect ratio).
    var landscape = scaleSizeTo[scaleType](this.container, preview);
    var portrait = { width: landscape.height, height: landscape.width };

    // Set the size of the frame to match 'portrait' dimensions
    this.els.frame.style.width = portrait.width + 'px';
    this.els.frame.style.height = portrait.height + 'px';

    var transform = '';
    if (mirrored) {
      transform += 'scale(-1, 1) ';
    }

    transform += 'rotate(' + sensorAngle + 'deg)';

    // Set the size of the video container to match the
    // 'landscape' dimensions (CSS is used to rotate
    // the 'landscape' video stream to 'portrait')
    this.els.videoContainer.style.width = landscape.width + 'px';
    this.els.videoContainer.style.height = landscape.height + 'px';
    this.els.videoContainer.style.transform = transform;

    // CSS aligns the contents slightly
    // differently depending on the scaleType
    this.set('scaleType', scaleType);

    debug('updated preview size/position', landscape);
  },

  template: function() {
    return '<div class="viewfinder-frame js-frame">' +
        '<div class="viewfinder-video-container js-video-container" ' +
        'aria-hidden="true">' +
          '<video class="viewfinder-video js-video"></video>' +
        '</div>' +
        '<div class="viewfinder-grid">' +
          '<div class="row"></div>' +
          '<div class="row middle"></div>' +
          '<div class="row"></div>' +
          '<div class="column left">' +
            '<div class="cell top"></div>' +
            '<div class="cell middle"></div>' +
            '<div class="cell bottom"></div>' +
          '</div>' +
          '<div class="column middle">' +
            '<div class="cell top"></div>' +
            '<div class="cell middle"></div>' +
            '<div class="cell bottom"></div>' +
          '</div>' +
          '<div class="column right">' +
           '<div class="cell top"></div>' +
           '<div class="cell middle"></div>' +
           '<div class="cell bottom"></div>' +
          '</div>' +
          '</div>' +
        '</div>' +
    '</div>';
  }
});

});
