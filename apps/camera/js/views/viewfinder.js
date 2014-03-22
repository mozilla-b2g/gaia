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
  },

  render: function() {
    this.el.innerHTML = this.template();

    // Find elements
    this.els.frame = this.find('.js-frame');
    this.els.video = this.find('.js-video');
    this.els.videoContainer = this.find('.js-video-container');
  },

  onClick: function(e) {
    this.emit('click');
  },

  onTouchStart: function(evt) {
    var touchCount = evt.targetTouches.length;
    if (touchCount === 2) {
      lastTouchA = evt.targetTouches[0];
      lastTouchB = evt.targetTouches[1];
      isScaling = true;
      this.emit('pinchStart');

      evt.preventDefault();
    } else {
      focusPoint = evt.touches[0];
      this.findFocusArea(focusPoint.pageX, focusPoint.pageY);
    }
  },

  onTouchMove: function(evt) {
    if (!isScaling) {
      return;
    }

    var touchA = getNewTouchA(evt.targetTouches);
    var touchB = getNewTouchB(evt.targetTouches);

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

    if (evt.targetTouches.length < 2) {
      isScaling = false;
      this.emit('pinchEnd');
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
    var MAX = 1000;

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

    function clamp(position) {
      if (position < MIN) {
        position = MIN;
      } else if (position > MAX) {
        position = MAX;
      }
      return position;
    }

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

  /**
   * Sizes and positions the preview stream.
   *
   * @param  {Object} preview
   * @param  {Number} sensorAngle
   * @param  {Boolean} mirrored
   */
  updatePreview: function(preview, sensorAngle, mirrored) {
    var elementWidth = this.el.clientWidth;
    var elementHeight = this.el.clientHeight;

    var aspect;

    // Invert dimensions if the camera's `sensorAngle` is
    // 0 or 180 degrees.
    if (sensorAngle % 180 === 0) {
      this.container = {
        width: elementWidth,
        height: elementHeight,
        aspect: elementWidth / elementHeight
      };

      aspect = preview.height / preview.width;
    } else {
      this.container = {
        width: elementHeight,
        height: elementWidth,
        aspect: elementHeight / elementWidth
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
