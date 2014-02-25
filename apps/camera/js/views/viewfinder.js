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

// Touch Focus Area
var EACH_SIDE_OF_FOCUS_AREA = constants.EACH_SIDE_OF_FOCUS_AREA;
var FOCUS_AREA_START = constants.FOCUS_AREA_START;
var FOCUS_AREA_END = constants.FOCUS_AREA_END;

var lastTouchA = null;
var lastTouchB = null;
var isScaling = false;
var scale = 1.0;

var focusPoint;
var touchFocusDone = false;

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
    } else if (touchCount === 1 && touchFocusDone === false) {
      // touchFocusDone === false is to
      // block mutliples immediate
      // touches to avoid crash
      focusPoint = evt.touches[0];
      this.emit('focusPointChange',
        { x: focusPoint.pageX, y: focusPoint.pageY });
      touchFocusDone = true;
    }
  },
  /**
  * Scale the point to fit
  * Focus area defined by
  * Gecko. This needs to
  * be refactored
  **/
  findFocusArea: function(focusPoint) {
    var focusArea = { left:0, right:0, top:0, bottom:0 };
    // view port size
    var deviceIndependentViewportSize = {
      width: document.body.clientHeight,
      height: document.body.clientWidth
    };

    // as per gecko left, top: -1000
    // right and bottom: 1000
    var focusAreaSize = FOCUS_AREA_END - FOCUS_AREA_START;

   // find scale ratio
    var sw = focusAreaSize / deviceIndependentViewportSize.width;
    var sh = focusAreaSize / deviceIndependentViewportSize.height;

    // Apply scaling on each
    // row and column
    var px = focusPoint.x * sh;
    var py = focusPoint.y * sw;

    // shifting center to
    // center as per gecko
    px = FOCUS_AREA_START + px;
    py = FOCUS_AREA_START + py;

    // set left, right, top, bottom
    // of focus Area
    focusArea.left = px - EACH_SIDE_OF_FOCUS_AREA;
    if (focusArea.left < FOCUS_AREA_START) {
      focusArea.left = FOCUS_AREA_START;
    } else if (focusArea.left > FOCUS_AREA_END) {
      focusArea.left = FOCUS_AREA_END;
    }

    focusArea.right = px + EACH_SIDE_OF_FOCUS_AREA;
    if (focusArea.right < FOCUS_AREA_START) {
      focusArea.right = FOCUS_AREA_START;
    } else if (focusArea.right > FOCUS_AREA_END) {
      focusArea.right = FOCUS_AREA_END;
    }

    focusArea.top = py - EACH_SIDE_OF_FOCUS_AREA;
    if (focusArea.top < FOCUS_AREA_START) {
      focusArea.top = FOCUS_AREA_START;
    } else if (focusArea.top > FOCUS_AREA_END) {
      focusArea.top = FOCUS_AREA_END;
    }

    focusArea.bottom = py + EACH_SIDE_OF_FOCUS_AREA;
    if (focusArea.bottom < FOCUS_AREA_START) {
      focusArea.bottom = FOCUS_AREA_START;
    } else if (focusArea.bottom > FOCUS_AREA_END) {
      focusArea.bottom = FOCUS_AREA_END;
    }
    return focusArea;
  },

  setTouchFocusDone: function() {
    // to avoid multiple calls to
    // set auto focus
    touchFocusDone = false;
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
    var container = {
      width: this.el.clientHeight,
      height: this.el.clientWidth
    };

    var aspects = {
      container: container.width / container.height,
      preview: preview.width / preview.height,
      standard: 4 / 3
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

});
