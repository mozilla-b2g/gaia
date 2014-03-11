define(function(require) {
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

var MIN_VIEWFINDER_SCALE = constants.MIN_VIEWFINDER_SCALE;
var MAX_VIEWFINDER_SCALE = constants.MAX_VIEWFINDER_SCALE;
var lastTouchA = null;
var lastTouchB = null;
var isScaling = false;
var scale = 1.0;

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

var getDeltaScale = function(touchA, touchB) {
  if (!touchA || !lastTouchA || !touchB || !lastTouchB) return 0;

  var oldDistance = Math.sqrt(Math.pow(lastTouchB.pageX -
                                       lastTouchA.pageX, 2) +
                    Math.pow(lastTouchB.pageY - lastTouchA.pageY, 2));
  var newDistance = Math.sqrt(Math.pow(touchB.pageX - touchA.pageX, 2) +
                    Math.pow(touchB.pageY - touchA.pageY, 2));
  return newDistance - oldDistance;
};

return View.extend({
  name: 'viewfinder',
  className: 'js-viewfinder',
  fadeTime: 200,

  initialize: function() {
    this.render();
    bind(this.el, 'click', this.onClick);
    bind(this.el, 'touchstart', this.onTouchStart);
    this.els.video.autoplay = true;
  },

  render: function() {
    this.el.innerHTML = this.template();
    this.els.frame = this.find('.js-frame');
    this.els.video = this.find('.js-video');
    this.els.videoContainer = this.find('.js-video-container');
  },

  onClick: function() {
    this.emit('click');
  },

  onTouchStart: function(evt) {
    var touchCount = evt.touches.length;
    if (touchCount === 2) {
      lastTouchA = evt.touches[0];
      lastTouchB = evt.touches[1];
      isScaling = true;
    } else if (touchCount === 1) {
      focusPoint = evt.touches[0];
      this.findFocusArea(focusPoint.pageX, focusPoint.pageY);
    }
  },

  /**
  * Scale the point to fit focus area
  * defined by camera coordinate system.
  *
  **/
  findFocusArea: function(pointX, pointY) {
    // In camera coordinate system,
    // (-1000, -1000) represents the
    // top-left of the camera field of
    // view, and (1000, 1000) represents
    // the bottom-right of the field of
    // view. So, the Focus area should
    // start at -1000 and end at -1000.
    var MIN = -1000;
    var MAX =  1000;

    // Using Square Focus area
    var FOCUS_AREA_HALF_SIDE = 50;

    // as per gecko left, top: -1000
    // right and bottom: 1000.
    var focusAreaSize = MAX - MIN;

    // For smaller and square image and video
    // resolutions add the offset.
    var sw = focusAreaSize / (this.els.frame.clientWidth +
      (this.el.clientWidth - this.els.frame.clientWidth));
    var sh = focusAreaSize / (this.els.frame.clientHeight +
      (this.el.clientHeight - this.els.frame.clientHeight));

    // As per camera coordinate system the
    // values of focus region is fixed.
    var horizontalMargin = FOCUS_AREA_HALF_SIDE * sw;
    var VerticalMargin = FOCUS_AREA_HALF_SIDE * sh;

    // Apply scaling on each
    // row and column
    var cx = MIN + pointX * sw;
    var cy = MIN + pointY * sh;

    // Emit event with new focus point and rect.
    // Set left, right, top, bottom of rect
    // and check boundary conditions
    this.emit('focuspointchange', { x: pointX, y: pointY }, {
      left: clamp(cx - horizontalMargin),
      right: clamp(cx + horizontalMargin),
      top: clamp(cy - VerticalMargin),
      bottom: clamp(cy + VerticalMargin)
    });

    function clamp (position) {
      if (position < MIN) {
        position = MIN;
      } else if (position > MAX) {
        position = MAX;
      }
      return position;
    }

  },

  onTouchMove: function(evt) {
    if (!isScaling) {
      return;
    }

    var touchA = getNewTouchA(evt.touches);
    var touchB = getNewTouchB(evt.touches);

    var deltaScale = getDeltaScale(touchA, touchB);

    scale *= 1 + (deltaScale / 100);

    this.setScale(scale);

    lastTouchA = touchA;
    lastTouchB = touchB;
  },

  onTouchEnd: function(evt) {
    var touchCount = evt.touches.length;
    if (touchCount < 2) {
      isScaling = false;
    }
  },

  setScale: function(scale) {
    scale = Math.min(Math.max(scale, MIN_VIEWFINDER_SCALE),
                     MAX_VIEWFINDER_SCALE);
    this.els.frame.style.transform = 'scale(' + scale + ', ' + scale + ')';
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
    this.el.classList.add('fade-out');

    if (done) {
      setTimeout(done, this.fadeTime);
    }
  },

  fadeIn: function(done) {
    this.el.classList.remove('fade-out');

    if (done) {
      setTimeout(done, this.fadeTime);
    }
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
  }
});

});
