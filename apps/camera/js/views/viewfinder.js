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
var find = require('lib/find');
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

module.exports = View.extend({
  name: 'viewfinder',
  className: 'js-viewfinder',
  fadeTime: 200,

  initialize: function() {
    this.render();
    bind(this.el, 'click', this.onClick);
    this.els.video.autoplay = true;
    this.on('inserted', raf(this.getSize));
  },

  render: function() {
    this.el.innerHTML = this.template();
    this.els.frame = this.find('.js-frame');
    this.els.video = this.find('.js-video');
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

  getSize: function() {
    this.container = {
      width: this.el.clientHeight,
      height: this.el.clientWidth
    };
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
    this.el.classList.remove('visible');
    if (done) { setTimeout(done, this.fadeTime);}
  },

  fadeIn: function(done) {
    this.el.classList.add('visible');
    if (done) { setTimeout(done, this.fadeTime); }
  },

  updatePreview: function(preview, mirrored) {
    var container = this.container;
    var aspects = {
      container: container.width / container.height,
      preview: preview.width / preview.height,
      standard: 1.2
    };

    var aspectFill = aspects.preview > aspects.container;
    var scaleType = aspectFill ? 'fill' : 'fit';
    var scaled = scaleSizeTo[scaleType](container, preview);
    var centered = aspectFill || (aspects.preview < aspects.standard);
    var yOffset = centered ? (container.width - scaled.width) / 2 : 0;

    this.els.frame.style.width = scaled.width + 'px';
    this.els.frame.style.height = scaled.height + 'px';
    this.els.frame.style.top = yOffset + 'px';
    this.els.frame.classList.toggle('reversed', mirrored);

    debug('update preview, mirrored: %s, scale: %s, yOffset: %s',
      mirrored, scaleType, yOffset);

    return this;
  },

  template: function() {
    return '<div class="viewfinder_frame js-frame">' +
      '<video class="viewfinder_video js-video"></video>' +
      '<div class="viewfinder_grid">' +
        '<div class="row-1"></div>' +
        '<div class="row-2"></div>' +
        '<div class="col-1"></div>' +
        '<div class="col-2"></div>' +
      '</div>' +
    '</div>';
  }
});

function raf(fn) {
  return function() { requestAnimationFrame(fn); };
}

});
