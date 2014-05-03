define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var bind = require('lib/bind');
var CameraUtils = require('lib/camera-utils');
var debug = require('debug')('view:viewfinder');
var View = require('vendor/view');
var FocusView = require('views/focus');

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
  fadeTime: 200,

  initialize: function() {
    this.render();

    bind(this.el, 'click', this.onClick);
    bind(this.el, 'animationend', this.onShutterEnd);
    bind(this.els.frame, 'touchstart', this.onFrameClick);
    this.getSize();
  },

  render: function() {
    this.el.innerHTML = this.template();
    //append focus ring
    this.focusRing = new FocusView();
    this.focusRing.appendTo(this.el);
    // Find elements
    this.els.frame = this.find('.js-frame');
    this.els.video = this.find('.js-video');
    this.els.videoContainer = this.find('.js-video-container');
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
  },

  onClick: function(e) {
    this.emit('click');
  },

  onFrameClick: function(evt) {
    if (evt.targetTouches.length < 2) {
      var focusPoint = evt.touches[0];
      this.findFocusArea(focusPoint.pageX, focusPoint.pageY);
    }
  },

  onTouchStart: function(evt) {
    var touchCount = evt.targetTouches.length;
    if (touchCount === 2) {
      lastTouchA = evt.targetTouches[0];
      lastTouchB = evt.targetTouches[1];
      isScaling = true;
      this.emit('pinchStart');

      evt.preventDefault();
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
    var focusPosition = this.checkBoundries(pointX, pointY);
    // Emit event with new focus point and rect.
    // Set left, right, top, bottom of rect
    // and check boundary conditions
    this.emit('focus-point', focusPosition, {
      left: clamps(cx - horizontalMargin),
      right: clamps(cx + horizontalMargin),
      top: clamps(cy - VerticalMargin),
      bottom: clamps(cy + VerticalMargin)
    });
    function clamps(position) {
      if (position < MIN) {
        position = MIN;
      } else if (position > MAX) {
        position = MAX;
      }
      return position;
    }
  },

  checkBoundries: function(pointX, pointY) {
    // Using Square Focus area
    var FOCUS_AREA_HALF_SIDE = 50;
    var leftX = this.els.frame.offsetLeft;
    var rightX = leftX + this.els.frame.clientWidth;
    var topY = this.els.frame.offsetTop;
    var bottomY = topY + this.els.frame.clientHeight;
    if ((pointX - FOCUS_AREA_HALF_SIDE) < leftX) {
      pointX = leftX + FOCUS_AREA_HALF_SIDE;
    } else if((pointX + FOCUS_AREA_HALF_SIDE) > rightX) {
      pointX = rightX - FOCUS_AREA_HALF_SIDE;
    }

    if ((pointY - FOCUS_AREA_HALF_SIDE) < topY) {
      pointY = topY + FOCUS_AREA_HALF_SIDE;
    } else if((pointY + FOCUS_AREA_HALF_SIDE) > bottomY) {
      pointY = bottomY - FOCUS_AREA_HALF_SIDE;
    }

    return {
      x: pointX,
      y: pointY
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
   * when the `Camera` emits a `zoomchanged` event.
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
   * This gets called when the `Camera` emits a `zoomchanged` event and is
   * calculated by `Camera.prototype.getZoomPreviewAdjustment()`.
   */
  setZoomPreviewAdjustment: function(zoomPreviewAdjustment) {
    this.els.video.style.transform = 'scale(' + zoomPreviewAdjustment + ')';
  },

  stopStream: function() {
    this.els.video.mozSrcObject = null;
  },

  fadeOut: function(done) {
    debug('fade-out');
    this.el.classList.remove('visible');
    if (done) { setTimeout(done, this.fadeTime);}
  },

  fadeIn: function(done) {
    debug('fade-in');
    this.el.classList.add('visible');
    if (done) { setTimeout(done, this.fadeTime); }
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
  setFocusRingDafaultPotion: function() {
    var offsetLeft = this.els.frame.offsetLeft;
    var offsetTop = this.els.frame.offsetTop;
    var x = this.els.frame.clientWidth / 2 + offsetLeft;
    var y = this.els.frame.clientHeight / 2 + offsetTop;
    this.setFocusRingPosition(x, y);
  },

  setFocusRingPosition: function(x, y) {
    this.focusRing.changePosition(x, y);
  },

  clearFaceRings: function() {
    this.focusRing.clearFaceRings();
  },
  
  setFocusMode: function(value) {
    this.focusRing.setMode(value);
  },

  setFocusState: function(value) {
    this.focusRing.setState(value);
  },
});

});
