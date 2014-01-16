define(function(require) {
'use strict';

/**
 * Dependencies
 */

var bind = require('utils/bind');
var constants = require('config/camera');
var View = require('vendor/view');
var CameraUtil = require('utils/camera-util');

/**
 * Locals
 */

var MIN_VIEWFINDER_SCALE = constants.MIN_VIEWFINDER_SCALE;
var MAX_VIEWFINDER_SCALE = constants.MAX_VIEWFINDER_SCALE;
var lastTouchA = null;
var lastTouchB = null;
var isScaling = false;
var scale = 1.0;

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
  tag: 'video',
  className: 'viewfinder js-viewfinder',
  fadeTime: 200,
  initialize: function() {
    bind(this.el, 'click', this.onClick);
    bind(this.el, 'touchstart', this.onTouchStart);
    bind(this.el, 'touchmove', this.onTouchMove);
    bind(this.el, 'touchend', this.onTouchEnd);
    this.el.autoplay = true;
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
    this.el.style.transform = 'scale(' + scale + ', ' + scale + ')';
  },

  setPreviewStream: function(previewStream) {
    this.el.mozSrcObject = previewStream;
  },

  setStream: function(stream, done) {
    this.setPreviewStream(stream);
    this.startPreview();
  },

  startPreview: function() {
    this.el.play();
  },

  stopPreview: function() {
    this.el.pause();
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

  setPreviewSize: function(camera, Camera) {
    var previewSizes = camera.capabilities.previewSizes;
    var viewportSize = {
      width:  document.body.clientHeight * window.devicePixelRatio,
      height: document.body.clientWidth  * window.devicePixelRatio
    };

    var previewSize = CameraUtil.selectOptimalPreviewSize(viewportSize, previewSizes);

    // We should always have a valid preview size, but just in case
    // we don't, pick the first provided
    Camera._previewConfig = previewSize = previewSize || previewSizes[0];

    console.log(camera);
    console.log(previewSizes, viewportSize, previewSize);

    // Use the device-independent viewport size for transforming the
    // preview using CSS
    var deviceIndependentViewportSize = {
      width:  document.body.clientHeight,
      height: document.body.clientWidth
    };

    // Scale the optimal preview size to fill the viewport (will
    // overflow if necessary)
    var scaledPreviewSize = CameraUtil.scaleSizeToFillViewport(deviceIndependentViewportSize, previewSize);

    this.el.style.width  = scaledPreviewSize.width  + 'px';
    this.el.style.height = scaledPreviewSize.height + 'px';

    // Rotate the preview image 90 degrees
    var transform = 'rotate(90deg)';

    // Check if this is the front-facing camera and mirror the image
    if (Camera.state.get('cameraNumber') == 1) {
      transform += ' scale(-1, 1)';
    }

    this.el.style.transform = transform;

    // Apply offset to center the rotated preview image
    var offsetX = (scaledPreviewSize.height - deviceIndependentViewportSize.width ) / 2;
    var offsetY = (scaledPreviewSize.width  - deviceIndependentViewportSize.height) / 2;

    this.el.style.left = offsetX + 'px';
    this.el.style.top  = offsetY + 'px';
  }
});

});
