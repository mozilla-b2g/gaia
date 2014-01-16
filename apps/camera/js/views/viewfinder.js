define(function(require) {
'use strict';

/**
 * Dependencies
 */

var bind = require('utils/bind');
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
    function getRotatedDimension(rotateAngle, width, height) {
      if (rotateAngle % 180 == 0) {
        return [width, height];
      } else {
        return [height, width];
      }
    }

    var pictureSize = Camera._pictureSize;
    var pictureAspectRatio = pictureSize.width / pictureSize.height;

    var screenWidth = document.body.clientWidth;
    var screenHeight = document.body.clientHeight;

    // The visible portion of preview must cover the screen. Camera direction
    // can differ from the device so the preview is rotated before showing on
    // the screen. To compare the least preview size really need, instead of
    // rotating every preview candidates, we start by rotating the screen size
    // into direction of preview.
    //
    // Example: On a 320x480 portrait device with camera mounted in 90deg,
    // rotating screen size by 90deg retrieves the visible portion of preview
    // should not be smaller than 480x320.
    var [leastPreviewWidth, leastPreviewHeight] = getRotatedDimension(
                          -camera.sensorAngle, screenWidth, screenHeight);
    var leastPreviewRatio = leastPreviewWidth / leastPreviewHeight;
    // Previews should match the aspect ratio and not be smaller than the screen
    var validPreviews = camera.capabilities.previewSizes.filter(function(res) {
      var isLarger = res.height >= leastPreviewHeight &&
                     res.width >= leastPreviewWidth;
      var aspectRatio = res.width / res.height;
      var matchesRatio = Math.abs(aspectRatio - pictureAspectRatio) < 0.05;
      return matchesRatio && isLarger;
    });

    // We should always have a valid preview size, but just in case
    // we dont, pick the first provided.
    if (validPreviews.length > 0) {

      // Pick the smallest valid preview
      Camera._previewConfig = validPreviews.sort(function(a, b) {
        return a.width * a.height - b.width * b.height;
      }).shift();
    } else {
      Camera._previewConfig = camera.capabilities.previewSizes[0];
    }

    // Now we have actual picture aspect ratio to determine actual preview size.
    // The preview should be larger than the screen, shrink it so that as much
    // as possible is on screen.
    //
    // Example: we selected a 480x360 preview (ratio 1.33). The least preview
    // size is 480x320 (1.5). So it goes through the following else clause,
    // obtaining 480x320 which covers the whole screen.
    var previewWidth, previewHeight;
    if (leastPreviewRatio < pictureAspectRatio) {
      previewWidth = leastPreviewHeight * pictureAspectRatio;
      previewHeight = leastPreviewHeight;
    } else {
      previewWidth = leastPreviewWidth;
      previewHeight = previewWidth / pictureAspectRatio;
    }

    // The last step here is to apply CSS transform, rotating camera preview
    // into direction of screen. And we set left and top here to let center of
    // viewfinder coincide with center of the screen, thus preventing unwanted
    // displacement introduced by rotation.
    var transform = '';
    var cameraNumber = Camera.state.get('cameraNumber');
    if (cameraNumber == 1) {
      /* backwards-facing camera */
      transform += 'scale(-1, 1) ';
      translateX = width;
    }
    transform += 'rotate(' + camera.sensorAngle + 'deg)';

    this.el.style.transform = transform;
    this.el.style.left = ((screenWidth - previewWidth) / 2) + 'px';
    this.el.style.top = ((screenHeight - previewHeight) / 2) + 'px';
    this.el.style.width = previewWidth + 'px';
    this.el.style.height = previewHeight + 'px';
  }
});

});
