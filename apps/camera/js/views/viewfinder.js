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
  tag: 'video',
  className: 'js-viewfinder',
  fadeTime: 200,
  initialize: function() {
    //render the frame grid
    this.render();
    //get frame grid element
    this.els.frameGrid = find('.js-frame-grid',document);
    this.els.frameGrid.setAttribute('data-visible',false);
    //bind event with viewFinder
    bind(this.el, 'click', this.onClick);
    this.el.autoplay = true;
  },
  render: function() {
    var gridDiv = document.createElement('div');
    gridDiv.classList.add('js-frame-grid');
    gridDiv.classList.add('frameGrid');
    gridDiv.innerHTML = this.template();
    document.body.appendChild(gridDiv);
  },
  template: function() {
    return '<div class=" divTable ">'+
            '<div class=" row  Row1">'+
            '<div class=" cell Cell1"></div>'+
            '<div  class=" cell Cell2"></div>'+
            '<div  class=" cell Cell3"></div>'+
            '</div><div class="row Row2">'+
            '<div class=" cell Cell1"></div>'+
            '<div  class=" cell Cell2"></div>'+
            '<div  class=" cell Cell3"></div>'+
            '</div><div class="row Row3">'+
            '<div class=" cell Cell1"></div>'+
            '<div  class=" cell Cell2"></div>'+
            '<div  class=" cell Cell3"></div>'+
            '</div></div>';
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

  updatePreview: function(previewSize, mirrored) {
    debug('update preview, mirrored: %s', mirrored);
    // Use the device-independent viewport size for transforming the
    // preview using CSS
    var deviceIndependentViewportSize = {
      width: document.body.clientHeight,
      height: document.body.clientWidth
    };

    // Scale the optimal preview size to fill the viewport (will
    // overflow if necessary)
    var scaledPreviewSize = CameraUtils.scaleSizeToFillViewport(
                              deviceIndependentViewportSize,
                              previewSize);

    this.el.style.width = this.els.frameGrid.style.width = scaledPreviewSize.width + 'px';
    this.el.style.height = this.els.frameGrid.style.height = scaledPreviewSize.height + 'px';

    // Rotate the preview image 90 degrees
    var transform = 'rotate(90deg)';

    if (mirrored) {
      // backwards-facing camera
      transform += ' scale(-1, 1)';
    }

    this.el.style.transform = transform;
    this.els.frameGrid.style.transform = transform;

    var offsetX = (deviceIndependentViewportSize.height -
                   scaledPreviewSize.width) / 2;
    var offsetY = (deviceIndependentViewportSize.width -
                   scaledPreviewSize.height) / 2;
    this.el.style.left = this.els.frameGrid.style.left = offsetX + 'px';
    this.el.style.top = this.els.frameGrid.style.top = offsetY + 'px';
    
  },
  toggleFrameGrid: function(value){
    this.els.frameGrid.setAttribute('data-visible',value);
  },
  
});

});
