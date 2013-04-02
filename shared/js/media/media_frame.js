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
  this.imageblob = null;
  this.previewblob = null;
  this.videoblob = null;
  this.posterblob = null;
  this.url = null;

  var self = this;
  this.image.onerror = function(e) {
    if (self.onerror)
      self.onerror(e);
  };
}

MediaFrame.prototype.displayImage = function displayImage(blob, width, height,
                                                          preview)
{
  this.clear();  // Reset everything

  // Remember what we're displaying
  this.imageblob = blob;
  this.fullsizeWidth = width;
  this.fullsizeHeight = height;
  this.preview = preview;

  // Keep track of what kind of content we have
  this.displayingImage = true;

  // Make the image element visible
  this.image.style.display = 'block';

  // If the preview is at least as big as the screen, display that.
  // Otherwise, display the full-size image.
  if (preview && (preview.start || preview.filename)) {
    this.displayingPreview = true;
    if (preview.start) {
      this.previewblob = blob.slice(preview.start, preview.end, 'image/jpeg');
      this._displayImage(this.previewblob, preview.width, preview.height);
    }
    else {
      var storage = navigator.getDeviceStorage('pictures');
      var getreq = storage.get(preview.filename);
      var self = this;
      getreq.onsuccess = function() {
        self.previewblob = getreq.result;
        self._displayImage(self.previewblob, preview.width, preview.height);
      };
      getreq.onerror = function() {
        self.displayingPreview = false;
        self.preview = null;
        self._displayImage(blob, width, height);
      };
    }
  }
  else {
    this._displayImage(blob, width, height);
  }
};

// A utility function we use to display the full-size image or the preview.
MediaFrame.prototype._displayImage = function _displayImage(blob, width, height)
{
  var self = this;

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
      self.itemWidth = this.width = this.naturalWidth;
      self.itemHeight = this.height = this.naturalHeight;
      self.computeFit();
      self.setPosition();
    });
    return;
  }

  // Start loading the new image
  this.image.src = this.url;
  // Update image size and position
  this.itemWidth = width;
  this.itemHeight = height;
  this.computeFit();
  this.setPosition();
};

MediaFrame.prototype._switchToFullSizeImage = function _switchToFull() {
  if (!this.displayingImage || !this.displayingPreview)
    return;

  var self = this;
  this.displayingPreview = false;

  var oldurl = this.url;
  var oldimage = this.oldimage = this.image;
  var newimage = this.image = document.createElement('img');
  newimage.src = this.url = URL.createObjectURL(this.imageblob);

  // Add the new image to the container before the current preview image
  // Because it comes first it will be obscured the the preview
  this.container.insertBefore(newimage, oldimage);

  // Resize the preview image to be the same size as the full image.
  // It will be pixelated, but it will be ready right away.
  this.itemWidth = this.oldimage.width = this.fullsizeWidth;
  this.itemHeight = this.oldimage.height = this.fullsizeHeight;
  this.computeFit();
  this.setPosition();

  // Query the position of the two images in order to flush the changes
  // made by setPosition() above. This prevents us from accidentally
  // animating those changes when the user double taps to zoom.
  if (this.oldimage) {
    var temp = this.oldimage.clientLeft;
    temp = this.image.clientLeft;
  }

  // When the new image is loaded we can begin to remove the preview image
  newimage.addEventListener('load', function imageLoaded() {
    newimage.removeEventListener('load', imageLoaded);

    // It takes quite a while for gecko to decode a 1200x1600 image once
    // it is loaded, so we wait a second here before removing the preview.
    // XXX: This is a hack. There really ought to be an event we can listen for
    // to know when the image is ready to display onscreen. See Bug 844245.
    setTimeout(function() {
      mozRequestAnimationFrame(function() {
        self.container.removeChild(oldimage);
        self.oldimage = null;
        oldimage.src = null;
        if (oldurl)
          URL.revokeObjectURL(oldurl);
      });
    }, 1000);
  });
};

MediaFrame.prototype._switchToPreviewImage = function _switchToPreview() {
  if (this.displayingImage && this.preview && !this.displayingPreview) {
    this.displayingPreview = true;
    this._displayImage(this.previewblob,
                       this.preview.width,
                       this.preview.height);
  }
};

MediaFrame.prototype.displayVideo = function displayVideo(videoblob, posterblob,
                                                          width, height,
                                                          rotation)
{
  if (!this.video)
    return;

  this.clear();  // reset everything

  // Keep track of what kind of content we have
  this.displayingVideo = true;

  // Remember the blobs
  this.videoblob = videoblob;
  this.posterblob = posterblob;

  // Get new URLs for the blobs
  this.videourl = URL.createObjectURL(videoblob);
  this.posterurl = URL.createObjectURL(posterblob);

  // Display them in the video element.
  // The VideoPlayer class takes care of positioning itself, so we
  // don't have to do anything here with computeFit() or setPosition()
  this.video.load(this.videourl, this.posterurl, width, height, rotation || 0);

  // Show the player controls
  this.video.show();
};

// Reset the frame state, release any urls and and hide everything
MediaFrame.prototype.clear = function clear() {
  // Reset the saved state
  this.displayingImage = false;
  this.displayingPreview = false;
  this.displayingVideo = false;
  this.itemWidth = this.itemHeight = null;
  this.imageblob = null;
  this.previewblob = null;
  this.videoblob = null;
  this.posterblob = null;
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
    this.video.reset();
    this.video.hide();
    if (this.videourl)
      URL.revokeObjectURL(this.videourl);
    if (this.posterurl)
      URL.revokeObjectURL(this.posterurl);
  }
};

// Set the item's position based on this.fit
// The VideoPlayer object fits itself to its container, and it
// can't be zoomed or panned, so we only need to do this for images
MediaFrame.prototype.setPosition = function setPosition() {
  if (!this.fit || !this.displayingImage)
    return;

  var transform =
    'translate(' + this.fit.left + 'px,' + this.fit.top + 'px) ' +
    'scale(' + this.fit.scale + ')';

  this.image.style.transform = transform;
  if (this.oldimage)
    this.oldimage.style.transform = transform;
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
  if (this.displayingImage && !this.displayingPreview && this.preview) {
    this._switchToPreviewImage(); // resets image size and position
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
  if (this.displayingPreview)
    this._switchToFullSizeImage();

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

  // If a time was specified, set up a transition so that the
  // call to setPosition() below is animated
  if (time) {
    // If a time was specfied, animate the transformation
    var transition = 'transform ' + time + 'ms ease';
    this.image.style.transition = transition;
    if (this.oldimage)
      this.oldimage.style.transition = transition;
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
