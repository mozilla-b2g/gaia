/*global define*/

define(function(require) {
  'use strict';

  var View = require('view');
  var bind = require('utils/bind');
  var find = require('utils/find');

  var lastTouchA = null,
      lastTouchB = null,
      isScaling = false,
      scale = 1.0;

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
    
    var oldDistance = Math.sqrt(Math.pow(lastTouchB.pageX - lastTouchA.pageX, 2) + Math.pow(lastTouchB.pageY - lastTouchA.pageY, 2));
    var newDistance = Math.sqrt(Math.pow(touchB.pageX - touchA.pageX, 2) + Math.pow(touchB.pageY - touchA.pageY, 2));
    return newDistance - oldDistance;
  };

  return View.extend({
    initialize: function() {

      // Bind events
      bind(this.el, 'click', this.toggleFilmstrip);

      bind(this.el, 'touchstart', this.onTouchStart.bind(this));
      bind(this.el, 'touchmove', this.onTouchMove.bind(this));
      bind(this.el, 'touchend', this.onTouchEnd.bind(this));
    },

    toggleFilmstrip: function(evt) {
      // We will just ignore
      // because the filmstrip shouldn't be shown
      // while Camera is recording
      var recording = CameraState.get('recording');
      if (recording || Camera._pendingPick) // TODO: Move _pendingPick into CameraState
        return;

      if (Filmstrip.isShown())
        Filmstrip.hide();
      else
        Filmstrip.show();
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
      scale = Math.min(Math.max(scale, MIN_VIEWFINDER_SCALE), MAX_VIEWFINDER_SCALE);
      this.el.style.transform = 'scale(' + scale + ', ' + scale + ')';
    },

    setPreviewStream: function(previewStream) {
      this.el.mozSrcObject = previewStream;
    },

    startPreview: function() {
      this.el.play();
    },

    stopPreview: function() {
      this.el.stop();
    },

    setPreviewSize: function(camera) {
      var pictureSize = Camera._pictureSize;

      // Switch screen dimensions to landscape
      var screenWidth = document.body.clientHeight * window.devicePixelRatio;
      var screenHeight = document.body.clientWidth * window.devicePixelRatio;
      var pictureAspectRatio = pictureSize.height / pictureSize.width;
      var screenAspectRatio = screenHeight / screenWidth;

      // Previews should match the aspect ratio and not be smaller than the screen
      var validPreviews = camera.capabilities.previewSizes.filter(function(res) {
        var isLarger = res.height >= screenHeight && res.width >= screenWidth;
        var aspectRatio = res.height / res.width;
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

      var transform = 'rotate(90deg)';
      var width, height;
      var translateX = 0;

      // The preview should be larger than the screen, shrink it so that as
      // much as possible is on screen.
      if (screenAspectRatio < pictureAspectRatio) {
        width = screenWidth;
        height = screenWidth * pictureAspectRatio;
      } else {
        width = screenHeight / pictureAspectRatio;
        height = screenHeight;
      }

      var cameraNumber = CameraState.get('cameraNumber');
      if (cameraNumber == 1) {
        /* backwards-facing camera */
        transform += ' scale(-1, 1)';
        translateX = width;
      }

      // Counter the position due to the rotation
      // This translation goes after the rotation so the element is shifted up
      // (for back camera) - shifted up after it is rotated 90 degress clockwise.
      // (for front camera) - shifted up-left after it is mirrored and rotated.
      transform += ' translate(-' + translateX + 'px, -' + height + 'px)';

      // Now add another translation at to center the viewfinder on the screen.
      // We put this at the start of the transform, which means it is applied
      // last, after the rotation, so width and height are reversed.
      var dx = -(height - screenHeight) / 2;
      var dy = -(width - screenWidth) / 2;
      transform = 'translate(' + dx + 'px,' + dy + 'px) ' + transform;

      this.el.style.transform = transform;
      this.el.style.width = width + 'px';
      this.el.style.height = height + 'px';
    }
  });
});
