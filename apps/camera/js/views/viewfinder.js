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
    this.els.video = document.createElement('video');
    bind(this.el, 'click', this.onClick);
    this.els.video.autoplay = true;
    this.el.appendChild(this.els.video);
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
    this.els.video.style.transform = 'scale(' + scale + ', ' + scale + ')';
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

    // Get dimensions of the entire viewfinder container.
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

    // Apply the corrected width/height of the <video/> element
    // as well as the Y-offset (if any).
    this.els.video.style.width = scaled.width + 'px';
    this.els.video.style.height = scaled.height + 'px';
    this.els.video.style.top = yOffset + 'px';

    // Apply the `reversed` CSS class if the viewfinder should
    // be mirrored.
    this.els.video.classList.toggle('reversed', mirrored);

    debug('update preview, mirrored: %s, scale: %s, yOffset: %s',
      mirrored, scaleType, yOffset);
  }
});

});
