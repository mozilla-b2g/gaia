define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var bind = require('lib/bind');
var CameraUtils = require('lib/camera-utils');
var debug = require('debug')('view:viewfinder');
var constants = require('config/camera');
var View = require('vendor/view');

/**
 * Locals
 */

var lastTouchA = null;
var lastTouchB = null;
var isScaling = false;
var isZoomEnabled = false;
var sensitivity = constants.ZOOM_GESTURE_SENSITIVITY;
var scaleSizeTo = {
  fill: CameraUtils.scaleSizeToFillViewport,
  fit: CameraUtils.scaleSizeToFitViewport
};

var getNewTouchA = function(touches) {
  if (!lastTouchA) return null;
  for (var i = 0, length = touches.length, touch; i < length; i++) {
    touch = touches[i];
    if (touch.identifier === lastTouchA.identifier) return touch;
  }
  return null;
};

var getNewTouchB = function(touches) {
  if (!lastTouchB) return null;
  for (var i = 0, length = touches.length, touch; i < length; i++) {
    touch = touches[i];
    if (touch.identifier === lastTouchB.identifier) return touch;
  }
  return null;
};

var getDeltaZoom = function(touchA, touchB) {
  if (!touchA || !lastTouchA || !touchB || !lastTouchB) return 0;

  var oldDistance = Math.sqrt(
                      Math.pow(lastTouchB.pageX - lastTouchA.pageX, 2) +
                      Math.pow(lastTouchB.pageY - lastTouchA.pageY, 2));
  var newDistance = Math.sqrt(
                      Math.pow(touchB.pageX - touchA.pageX, 2) +
                      Math.pow(touchB.pageY - touchA.pageY, 2));
  return newDistance - oldDistance;
};

var clamp = function(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
};

module.exports = View.extend({
  name: 'viewfinder',
  className: 'js-viewfinder',
  fadeTime: 200,

  initialize: function() {
    this.render();

    // Bind events
    bind(this.el, 'click', this.onClick);
    bind(this.el, 'touchstart', this.onTouchStart);
    bind(this.el, 'touchmove', this.onTouchMove);
    bind(this.el, 'touchend', this.onTouchEnd);

    this.on('inserted', raf(this.getSize));
  },

  render: function() {
    this.el.innerHTML = this.template();

    // Find elements
    this.els.frame = this.find('.js-frame');
    this.els.video = this.find('.js-video');
    this.els.videoContainer = this.find('.js-video-container');
  },

  template: function() {
    return '<div class="viewfinder-frame js-frame">' +
        '<div class="viewfinder-video-container js-video-container">' +
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
  },

  onClick: function(e) {
    e.stopPropagation();
    this.emit('click');
  },

  onTouchStart: function(evt) {
    var touchCount = evt.touches.length;
    if (touchCount === 2) {
      lastTouchA = evt.touches[0];
      lastTouchB = evt.touches[1];
      isScaling = true;
      this.emit('pinchStart');

      evt.preventDefault();
    }
  },

  onTouchMove: function(evt) {
    if (!isScaling) {
      return;
    }

    var touchA = getNewTouchA(evt.touches);
    var touchB = getNewTouchB(evt.touches);

    var deltaZoom = getDeltaZoom(touchA, touchB);
    var zoom = this._zoom * (1 + (deltaZoom / sensitivity));

    this.setZoom(zoom);

    this.emit('pinchChange', this._zoom);

    lastTouchA = touchA;
    lastTouchB = touchB;
  },

  onTouchEnd: function(evt) {
    if (!isScaling) {
      return;
    }

    if (evt.touches.length < 2) {
      isScaling = false;
      this.emit('pinchEnd');
    }
  },

  getSize: function() {
    this.container = {
      width: this.el.clientHeight,
      height: this.el.clientWidth
    };
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
   * when the `Camera` emits a `zoomChange` event.
   */
  setZoom: function(zoom) {
    if (!isZoomEnabled) {
      return;
    }

    this._zoom = clamp(zoom, this._minimumZoom, this._maximumZoom);
  },

  /**
   * Adjust the scale of the <video/> tag to compensate for the inability
   * of the Camera API to zoom the preview stream beyond a certain point.
   * This gets called when the `Camera` emits a `zoomChange` event and is
   * calculated by `Camera.prototype.getZoomPreviewAdjustment()`.
   */
  setZoomPreviewAdjustment: function(zoomPreviewAdjustment) {
    this.els.video.style.transform = 'scale(' + zoomPreviewAdjustment + ')';
  },

  setPreviewStream: function(previewStream) {
    this.els.video.mozSrcObject = previewStream;
  },

  setStream: function(stream, done) {
    this.setPreviewStream(stream);
    this.startPreview();
  },

  startPreview: function() {
    this.els.video.play();
  },

  stopPreview: function() {
    this.els.video.pause();
  },

  fadeOut: function(done) {
    this.el.classList.remove('visible');
    if (done) { setTimeout(done, this.fadeTime);}
  },

  fadeIn: function(done) {
    this.el.classList.add('visible');
    if (done) { setTimeout(done, this.fadeTime); }
  },

  updatePreview: function(preview, mirrored) {

    // Gotchas of this function:
    // 1. clientWidth and clientHeight are the dimensions
    // of the viewfinder from the top left corner of the screen
    // in portrait orientation
    // 2. The camera reports the preview sizes in landscape orientation:
    // - width is the longer side and height the shorter.
    // We swap height and width of one of them so we can compare
    var container = {
      width: this.el.clientHeight,
      height: this.el.clientWidth
    };

    // Calculate aspect ratios for the viewfinder container,
    // the preview, and the standard (4:3).
    var aspects = {
      container: container.width / container.height,
      preview: preview.width / preview.height,
      standard: 4 / 3
    };

    // If the aspect ratio of the preview is wider (longer) than
    // the viewfinder container, use "aspect fill" (no black bars).
    var aspectFill = aspects.preview > aspects.container;
    var scaleType = aspectFill ? 'fill' : 'fit';

    // Calculate the correct scale to apply to the preview to
    // either "fill" or "fit" the viewfinder container (always
    // preserving the aspect ratio).
    var scaled = scaleSizeTo[scaleType](container, preview);

    // If the aspect ratio of the preview is smaller than the
    // standard (4:3), the preview needs to be centered within
    // the viewfinder container.
    var centered = aspects.preview < aspects.standard;

    // Also, if we are using "aspect fill" (where preview overflows
    // the viewfinder container), we need to center within the
    // viewfinder container so that an equal amount of the preview
    // is cut off from both sides of the viewport. Otherwise, do
    // not adjust the Y-offset of the preview.
    var yOffset = aspectFill || centered ?
      (container.width - scaled.width) / 2 : 0;
    var previewHeight = scaled.height;
    var previewWidth = scaled.width;

    // Calculated sizes are in landscape format (width is the largest side)
    // CSS styles consider the top left corner of the device in portrait mode
    // Again sizes have to be swapped to size the viewfinder frame
    // Apply the corrected width/height as well as the Y-offset (if any).
    this.els.frame.style.width = previewHeight + 'px';
    this.els.frame.style.height = previewWidth + 'px';
    this.els.frame.style.top = yOffset + 'px';

    // The video stream coming from the camera renders the preview in landscape
    // mode. It expects width to be the larger size.
    // The video container is sized as the camera API expects and rotated
    // with css to be displayed on screen
    this.els.videoContainer.style.width = previewWidth + 'px';
    this.els.videoContainer.style.height = previewHeight + 'px';
    this.els.videoContainer.classList.toggle('reversed', mirrored);

    debug('update preview, mirrored: %s, scale: %s, yOffset: %s',
      mirrored, scaleType, yOffset);
  }

});

function raf(fn) {
  return function() { requestAnimationFrame(fn); };
}

});
