/*
 * media_frame.js:
 *
 * A MediaFrame displays a photo or a video. The gallery app uses
 * three side by side to support smooth panning from one item to the
 * next.  The Camera app uses one for image and video preview. The
 * Gallery app's open activity uses one of these to display the opened
 * item.
 *
 * MediaFrames have different behavior depending on whether they display
 * images or videos. Photo frames allow the user to zoom and pan on the photo.
 * Video frames allow the user to play and pause but don't allow zooming.
 *
 * When a frame is displaying a video, it handles mouse events.
 * When display a picture, however, it expects the client to handle events
 * and call the pan() and zoom() methods.
 *
 * The pan() method is a little unusual. It "uses" as much of the pan
 * event as it can, and returns a number indicating how much of the
 * horizontal motion it did not use. The gallery uses this returned
 * value for transitioning between frames.  If a frame displays a
 * photo that is not zoomed in at all, then it can't use any of the
 * pan, and returns the full amount which the gallery app turns into a
 * panning motion between frames.  But if the photo is zoomed in, then
 * the MediaFrame will just move the photo within itself, if it can, and
 * return 0.
 *
 * Much of the code in this file used to be part of the PhotoState class.
 */
function MediaFrame(container, includeVideo) {
  if (typeof container === 'string')
    container = document.getElementById(container);
  this.container = container;
  this.image = document.createElement('img');
  this.container.appendChild(this.image);
  this.image.style.display = 'none';
  if (includeVideo !== false) {
    this.video = new VideoPlayer(container);
    this.video.hide();
  }
  this.displayingVideo = false;
  this.displayingImage = false;
  this.blob = null;
  this.url = null;
}

MediaFrame.prototype.displayImage = function displayImage(blob, width, height,
                                                          preview)
{
  this.clear();  // Reset everything

  // Remember what we're displaying
  this.blob = blob;
  this.fullsizeWidth = width;
  this.fullsizeHeight = height;
  this.preview = preview;

  // Keep track of what kind of content we have
  this.displayingImage = true;

  // Make the image element visible
  this.image.style.display = 'block';

  // If the preview is at least as big as the screen, display that.
  // Otherwise, display the full-size image.
  if (preview &&
      (preview.width >= window.innerWidth ||
       preview.height >= window.innerHeight)) {
    this.displayingPreview = true;
    this._displayImage(blob.slice(preview.start, preview.end, 'image/jpeg'),
                       preview.width, preview.height);
  }
  else {
    this._displayImage(blob, width, height);
  }
};

// A utility function we use to display the full-size image or the
// preview The last two arguments are optimizations used by
// switchToFullSizeImage() to make the transition from preview to
// fullscreen smooth. If waitForPaint is true, then this function will
// keep the old image on the screen until the new image is painted
// over it so we (hopefully) don't end up with a blank screen or
// flash.  And if callback is specified, it will call the callback
// when thew new images is visible on the screen.  If either of those
// arguments are specified, the width and height must be specified.
MediaFrame.prototype._displayImage = function _displayImage(blob, width, height,
                                                            waitForPaint,
                                                            callback)
{
  var self = this;
  var oldImage;

  // Create a URL for the blob (or preview blob)
  if (this.url)
    URL.revokeObjectURL(this.url);
  this.url = URL.createObjectURL(blob);

  // If we don't know the width or the height yet, then set up an event
  // handler to set the image size and position once it is loaded.
  // This happens for the open activity.
  if (!width || !height) {
    this.image.src = this.url;
    this.image.addEventListener('load', function onload() {
      this.removeEventListener('load', onload);
      self.itemWidth = this.naturalWidth;
      self.itemHeight = this.naturalHeight;
      self.computeFit();
      self.setPosition();
    });
    return;
  }

  // Otherwise, we have a width and height, and we may also have to handle
  // the waitForPaint and callback arguments

  // If waitForPaint is set, then keep the old image around and displayed
  // until the new image is loaded.
  if (waitForPaint) {
    // Remember the old image
    oldImage = this.image;

    // Create a new element to load the new image into.
    // Insert it into the frame, but don't remove the old image yet
    this.image = document.createElement('img');
    this.container.appendChild(this.image);

    // Change the old image slightly to give the user some immediate
    // feedback that something is happening
    oldImage.classList.add('swapping');
  }

  // Start loading the new image
  this.image.src = this.url;
  // Update image size and position
  this.itemWidth = width;
  this.itemHeight = height;
  this.computeFit();
  this.setPosition();

  // If waitForPaint is set, or if there is a callback, then we need to
  // run some code when the new image has loaded and been painted.
  if (waitForPaint || callback) {
    whenLoadedAndVisible(this.image, 1000, function() {
      if (waitForPaint) {
        // Remove the old image now that the new one is visible
        self.container.removeChild(oldImage);
        oldImage.src = null;
      }

      if (callback) {
        // Let the caller know that the new image is ready, but
        // wait for an animation frame before doing it. The point of
        // using mozRequestAnimationFrame here is that it gives the
        // removeChild() call above a chance to take effect.
        mozRequestAnimationFrame(function() {
          callback();
        });
      }
    });
  }

  // Wait until the load event on the image fires, and then wait for a
  // MozAfterPaint event after that, and then, finally, invoke the
  // callback.  Don't wait more than the timeout, though: we need to
  // ensure that we always call the callback even if the image does not
  // load or if we don't get a MozAfterPaint event.
  function whenLoadedAndVisible(image, timeout, callback) {
    var called = false;
    var timer = setTimeout(function()
                           {
                             called = true;
                             callback();
                           },
                           timeout || 1000);

    image.addEventListener('load', function onload() {
      image.removeEventListener('load', onload);
      window.addEventListener('MozAfterPaint', function onpaint() {
        window.removeEventListener('MozAfterPaint', onpaint);
        clearTimeout(timer);
        if (!called) {
          callback();
        }
      });
    });
  }
};

MediaFrame.prototype._switchToFullSizeImage = function _switchToFull(cb) {
  if (this.displayingImage && this.displayingPreview) {
    this.displayingPreview = false;
    this._displayImage(this.blob, this.fullsizeWidth, this.fullsizeHeight,
                       true, cb);
  }
};

MediaFrame.prototype._switchToPreviewImage = function _switchToPreview() {
  if (this.displayingImage && !this.displayingPreview) {
    this.displayingPreview = true;
    this._displayImage(this.blob.slice(this.preview.start,
                                       this.preview.end,
                                       'image/jpeg'),
                       this.preview.width,
                       this.preview.height);
  }
};

MediaFrame.prototype.displayVideo = function displayVideo(blob, width, height,
                                                          rotation)
{
  if (!this.video)
    return;

  this.clear();  // reset everything

  // Keep track of what kind of content we have
  this.displayingVideo = true;

  // Show the video player and hide the image
  this.video.show();

  // Remember the blob
  this.blob = blob;

  // Get a new URL for this blob
  this.url = URL.createObjectURL(blob);

  // Display it in the video element.
  // The VideoPlayer class takes care of positioning itself, so we
  // don't have to do anything here with computeFit() or setPosition()
  this.video.load(this.url, rotation || 0);
};

// Reset the frame state, release any urls and and hide everything
MediaFrame.prototype.clear = function clear() {
  // Reset the saved state
  this.displayingImage = false;
  this.displayingPreview = false;
  this.displayingVideo = false;
  this.itemWidth = this.itemHeight = null;
  this.blob = null;
  this.fullsizeWidth = this.fullsizeHeight = null;
  this.preview = null;
  this.fit = null;
  if (this.url) {
    URL.revokeObjectURL(this.url);
    this.url = null;
  }

  // Hide the image
  this.image.style.display = 'none';
  this.image.src = null;  // XXX: use about:blank or '' here?

  // Hide the video player
  if (this.video) {
    this.video.hide();

    // If the video player has its src set, clear it and release resources
    // We do this in a roundabout way to avoid getting a warning in the console
    if (this.video.player.src) {
      this.video.player.removeAttribute('src');
      this.video.player.load();
    }
  }
};

// Set the item's position based on this.fit
// The VideoPlayer object fits itself to its container, and it
// can't be zoomed or panned, so we only need to do this for images
MediaFrame.prototype.setPosition = function setPosition() {
  if (!this.fit || !this.displayingImage)
    return;

  this.image.style.transform =
    'translate(' + this.fit.left + 'px,' + this.fit.top + 'px) ' +
    'scale(' + this.fit.scale + ')';
};

MediaFrame.prototype.computeFit = function computeFit() {
  if (!this.displayingImage)
    return;
  this.viewportWidth = this.container.offsetWidth;
  this.viewportHeight = this.container.offsetHeight;

  var scalex = this.viewportWidth / this.itemWidth;
  var scaley = this.viewportHeight / this.itemHeight;
  var scale = Math.min(Math.min(scalex, scaley), 1);

  // Set the image size and position
  var width = Math.floor(this.itemWidth * scale);
  var height = Math.floor(this.itemHeight * scale);

  this.fit = {
    width: width,
    height: height,
    left: Math.floor((this.viewportWidth - width) / 2),
    top: Math.floor((this.viewportHeight - height) / 2),
    scale: scale,
    baseScale: scale
  };
};

MediaFrame.prototype.reset = function reset() {
  // If we're not displaying the preview image, but we have one,
  // and it is the right size, then switch to it
  if (this.displayingImage && !this.displayingPreview && this.preview &&
      (this.preview.width >= window.innerWidth ||
       this.preview.height >= window.innerHeight)) {
    this._switchToPreviewImage(); // resets image size and position
    return;
  }

  // Otherwise, if we are displaying the preview image but it is no
  // longer big enough for the screen (such as after a resize event)
  // then switch to full size. This case should be rare.
  if (this.displayingImage && this.displayingPreview &&
      this.preview.width < window.innerWidth &&
      this.preview.height < window.innerHeight) {
    this._switchToFullSizeImage(); // resets image size and position
    return;
  }

  // Otherwise, just resize and position the item we're already displaying
  this.computeFit();
  this.setPosition();
};

// We call this from the resize handler when the user rotates the
// screen or when going into or out of fullscreen mode. If the user
// has not zoomed in, then we just fit the image to the new size (same
// as reset).  But if the user has zoomed in (and we need to stay
// zoomed for the new size) then we adjust the fit properties so that
// the pixel that was at the center of the screen before remains at
// the center now, or as close as possible
MediaFrame.prototype.resize = function resize() {
  var oldWidth = this.viewportWidth;
  var oldHeight = this.viewportHeight;
  var newWidth = this.container.offsetWidth;
  var newHeight = this.container.offsetHeight;

  var oldfit = this.fit; // The current image fit

  // If this is triggered by a resize event before the frame has computed
  // its size, then there is nothing we can do yet.
  if (!oldfit)
    return;

  // Compute the new fit.
  // This updates the the viewportWidth, viewportHeight and fit properties
  this.computeFit();

  // This is how the image would fit at the new screen size
  var newfit = this.fit;

  // If no zooming has been done, then a resize is just a reset.
  // The same is true if the new fit base scale is greater than the
  // old scale.
  if (oldfit.scale === oldfit.baseScale || newfit.baseScale > oldfit.scale) {
    this.reset();
    return;
  }

  // Otherwise, just adjust the old fit as needed and use that so we
  // retain the zoom factor.
  oldfit.left += (newWidth - oldWidth) / 2;
  oldfit.top += (newHeight - oldHeight) / 2;
  oldfit.baseScale = newfit.baseScale;
  this.fit = oldfit;

  // Reposition this image without resetting the zoom
  this.setPosition();
};

// Zoom in by the specified factor, adjusting the pan amount so that
// the image pixels at (centerX, centerY) remain at that position.
// Assume that zoom gestures can't be done in the middle of swipes, so
// if we're calling zoom, then the swipe property will be 0.
// If time is specified and non-zero, then we set a CSS transition
// to animate the zoom.
MediaFrame.prototype.zoom = function zoom(scale, centerX, centerY, time) {
  // Ignore zooms if we're not displaying an image
  if (!this.displayingImage)
    return;

  // If we were displaying the preview, switch to the full-size image
  if (this.displayingPreview) {
    // If we want to to animate the zoom, then switch images, wait
    // for the new one to load, and call this function again to process
    // the zoom and animation.  But if we're not animating, then just
    // switch images and continue.
    if (time) { // if animating
      var self = this;
      this._switchToFullSizeImage(function() {
        self.zoom(scale, centerX, centerY, time);
      });
      return;
    }
    else {
      this.switching = true;
      var self = this;
      this._switchToFullSizeImage(function() { self.switching = false; });
    }
  }

  // Never zoom in farther than the native resolution of the image
  if (this.fit.scale * scale > 1) {
    scale = 1 / (this.fit.scale);
  }
  // And never zoom out to make the image smaller than it would normally be
  else if (this.fit.scale * scale < this.fit.baseScale) {
    scale = this.fit.baseScale / this.fit.scale;
  }

  this.fit.scale = this.fit.scale * scale;

  // Change the size of the photo
  this.fit.width = Math.floor(this.itemWidth * this.fit.scale);
  this.fit.height = Math.floor(this.itemHeight * this.fit.scale);

  // centerX and centerY are in viewport coordinates.
  // These are the photo coordinates displayed at that point in the viewport
  var photoX = centerX - this.fit.left;
  var photoY = centerY - this.fit.top;

  // After zooming, these are the new photo coordinates.
  // Note we just use the relative scale amount here, not this.fit.scale
  var photoX = Math.floor(photoX * scale);
  var photoY = Math.floor(photoY * scale);

  // To keep that point still, here are the new left and top values we need
  this.fit.left = centerX - photoX;
  this.fit.top = centerY - photoY;

  // Now make sure we didn't pan too much: If the image fits on the
  // screen, center it. If the image is bigger than the screen, then
  // make sure we haven't gone past any edges
  if (this.fit.width <= this.viewportWidth) {
    this.fit.left = (this.viewportWidth - this.fit.width) / 2;
  }
  else {
    // Don't let the left of the photo be past the left edge of the screen
    if (this.fit.left > 0)
      this.fit.left = 0;

    // Right of photo shouldn't be to the left of the right edge
    if (this.fit.left + this.fit.width < this.viewportWidth) {
      this.fit.left = this.viewportWidth - this.fit.width;
    }
  }

  if (this.fit.height <= this.viewportHeight) {
    this.fit.top = (this.viewportHeight - this.fit.height) / 2;
  }
  else {
    // Don't let the top of the photo be below the top of the screen
    if (this.fit.top > 0)
      this.fit.top = 0;

    // bottom of photo shouldn't be above the bottom of screen
    if (this.fit.top + this.fit.height < this.viewportHeight) {
      this.fit.top = this.viewportHeight - this.fit.height;
    }
  }

  if (this.switching)
    return;

  // If a time was specified, set up a transition so that the
  // call to setPosition() below is animated
  if (time) {
    // If a time was specfied, animate the transformation
    this.image.style.transition = 'transform ' + time + 'ms ease';
    var self = this;
    this.image.addEventListener('transitionend', function done(e) {
      self.image.removeEventListener('transitionend', done);
      self.image.style.transition = null;
    });
  }

  this.setPosition();
};

// If the item being displayed is larger than the continer, pan it by
// the specified amounts.  Return the "unused" dx amount for the gallery app
// to use for sideways swiping
MediaFrame.prototype.pan = function(dx, dy) {
  // We can only pan images, so return the entire dx amount
  if (!this.displayingImage) {
    return dx;
  }

  // Handle panning in the y direction first, since it is easier.
  // Don't pan in the y direction if we already fit on the screen
  if (this.fit.height > this.viewportHeight) {
    this.fit.top += dy;

    // Don't let the top of the photo be below the top of the screen
    if (this.fit.top > 0)
      this.fit.top = 0;

    // bottom of photo shouldn't be above the bottom of screen
    if (this.fit.top + this.fit.height < this.viewportHeight)
      this.fit.top = this.viewportHeight - this.fit.height;
  }

  // Now handle the X dimension. If we've already panned as far as we can
  // within the image (or if it isn't zoomed in) then return the "extra"
  // unused dx amount to the caller so that the caller can use them to
  // shift the frame left or right.
  var extra = 0;

  if (this.fit.width <= this.viewportWidth) {
    // In this case, the photo isn't zoomed in, so it is all extra
    extra = dx;
  }
  else {
    this.fit.left += dx;

    // If this would take the left edge of the photo past the
    // left edge of the screen, then some of the motion is extra
    if (this.fit.left > 0) {
      extra = this.fit.left;
      this.fit.left = 0;
    }

    // Or, if this would take the right edge of the photo past the
    // right edge of the screen, then we've got extra.
    if (this.fit.left + this.fit.width < this.viewportWidth) {
      extra = this.fit.left + this.fit.width - this.viewportWidth;
      this.fit.left = this.viewportWidth - this.fit.width;
    }
  }

  this.setPosition();
  return extra;
};
