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
 * MediaFrame uses the #-moz-samplesize media fragment (via the downsample.js
 * module) to downsample large jpeg images while decoding them when necessary.
 * You can specify a maximum image decode size (in megapixels) when invoking
 * the constructor. The MediaFrame code also includes a runtime check for
 * the amount of RAM available on the device, and may limit the image decode
 * size on low-memory devices.
 */
function MediaFrame(container, includeVideo, maxImageSize) {
  if (typeof container === 'string')
    container = document.getElementById(container);
  this.container = container;
  this.maximumImageSize = maxImageSize || 0;
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
}

MediaFrame.computeMaxImageDecodeSize = function(mem) {
  if (!mem) {
    return 0;
  }
  else if (mem < 256) {  // This is a Tarako-class device ultra low-end device.
    return 2 * 1024 * 1024;   // 2 megapixels
  }
  else if (mem < 512) {  // This is a low-end 256mb device
    // Normally we can handle 3mp images on devices like this, but if
    // this device has a big screen and low memory (like a memory
    // throttled Flame) then it needs something smaller than 3mp.
    var screensize = screen.width * window.devicePixelRatio *
      screen.height * window.devicePixelRatio;
    if (mem < 325 && screensize > 480 * 800) {
      return 2.5 * 1024 * 1024;  // 2.5mp megapixels for throttled Flame
    }

    return 3 * 1024 * 1024;      // 3 megapixels otherwise
  }
  else if (mem < 1024) { // A mid-range 512mb device
    return 5 * 1024 * 1024;   // 5 megapixels
  }
  else {                 // A high-end device with 1 gigabyte or more of memory
    // Allow 8 megapixels of image decode size per gigabyte of memory
    return (mem / 1024) * 8 * 1024 * 1024;
  }
};

//
// Find out how much memory this device has because we may need to limit image
// decode size on low-end devices.  Note that navigator.getFeature requires
// the "feature-detection" permission (at least for now) so we only run this
// code if the client app has that permission.
//
if (navigator.getFeature) {
  MediaFrame.pendingPromise = navigator.getFeature('hardware.memory');
  MediaFrame.pendingPromise.then(
    function resolve(mem) {
      delete MediaFrame.pendingPromise;
      MediaFrame.maxImageDecodeSize = MediaFrame.computeMaxImageDecodeSize(mem);
    },
    function reject(err) {
      // This should never happen!
      delete MediaFrame.pendingPromise;
      MediaFrame.maxImageDecodeSize = 0;
    }
  );
}

MediaFrame.prototype.displayImage = function displayImage(blob,
                                                          width,
                                                          height,
                                                          preview,
                                                          rotation,
                                                          mirrored)
{
  // If we are still querying the device memory, wait for that query to
  // complete and then try again.
  if (MediaFrame.pendingPromise) {
    MediaFrame.pendingPromise.then(function resolve() {
      displayImage(blob, width, height, preview, rotation, mirrored);
    });
    return;
  }

  var self = this;
  this.clear();  // Reset everything
  // Remember what we're displaying
  this.imageblob = blob;
  this.preview = preview;

  // Figure out if we are going to downsample the image before displaying it
  this.fullSampleSize = computeFullSampleSize(blob, width, height);
  this.fullsizeWidth = this.fullSampleSize.scale(width);
  this.fullsizeHeight = this.fullSampleSize.scale(height);

  // Note: There is a default value for orientation/mirrored since some
  // images don't have EXIF data to retrieve this information.
  this.rotation = rotation || 0;
  this.mirrored = mirrored || false;

  // Keep track of what kind of content we have
  this.displayingImage = true;

  // Determine whether we can use the preview image
  function usePreview(preview) {
    // If no preview at all, we can't use it.
    if (!preview)
      return false;

    // If we don't know the preview size, we can't use it.
    if (!preview.width || !preview.height)
      return false;

    // If there isn't a preview offset or file, we can't use it
    if (!preview.start && !preview.filename)
      return false;

    // If the aspect ratio does not match, we can't use it
    if (Math.abs(width / height - preview.width / preview.height) > 0.01)
      return false;

    // If setMinimumPreviewSize has been called, then a preview is big
    // enough if it is at least that big.
    if (self.minimumPreviewWidth && self.minimumPreviewHeight) {
      return Math.max(preview.width, preview.height) >=
        Math.max(self.minimumPreviewWidth, self.minimumPreviewHeight) &&
        Math.min(preview.width, preview.height) >=
        Math.min(self.minimumPreviewWidth, self.minimumPreviewHeight);
    }

    // Otherwise a preview is big enough if at least one dimension is >= the
    // screen size in both portait and landscape mode.
    var screenWidth = window.innerWidth * window.devicePixelRatio;
    var screenHeight = window.innerHeight * window.devicePixelRatio;

    return ((preview.width >= screenWidth ||
             preview.height >= screenHeight) && // portrait
            (preview.width >= screenHeight ||
             preview.height >= screenWidth));  // landscape
  }

  // If we have a useable preview image, use it.
  if (usePreview(preview)) {
    if (preview.start) {
      this.previewblob = blob.slice(preview.start, preview.end, 'image/jpeg');
      this.previewSampleSize = Downsample.NONE;
      this._displayImage(this.previewblob, true);
    }
    else {
      var storage = navigator.getDeviceStorage('pictures');
      var getreq = storage.get(preview.filename);
      getreq.onsuccess = function() {
        self.previewblob = getreq.result;
        self.previewSampleSize = Downsample.NONE;
        self._displayImage(self.previewblob, true);
      };
      getreq.onerror = function() {
        self.preview = null;
        self.previewblob = null;
        self.previewSampleSize = computePreviewSampleSize(blob, width, height);
        self._displayImage(blob, self.previewSampleSize !== Downsample.NONE);
      };
    }
  }
  else {
    // In this case we don't have a usable preview image
    this.preview = null;
    this.previewblob = null;

    // If the image is a JPEG, then we can use #-moz-samplesize to downsample
    // while decoding so that we can display a small preview without using
    // lots of memory.
    this.previewSampleSize = computePreviewSampleSize(blob, width, height);
    this._displayImage(blob, this.previewSampleSize !== Downsample.NONE);
  }

  // If the blob is a JPEG then we can use #-moz-samplesize to downsample
  // it while decoding. If this is a particularly large image then to avoid
  // OOMs, we may not want to allow it to ever be decoded at full size
  function computeFullSampleSize(blob, width, height) {
    if (blob.type !== 'image/jpeg') {
      // We're not using #-moz-samplesize at all
      return Downsample.NONE;
    }

    // Determine the maximum size we will decode the image at, based on
    // device memory and the maximum size passed to the constructor.
    var max = MediaFrame.maxImageDecodeSize || 0;
    if (self.maximumImageSize && (max === 0 || self.maximumImageSize < max)) {
      max = self.maximumImageSize;
    }

    if (!max || width * height <= max) {
      return Downsample.NONE;
    }

    return Downsample.areaAtLeast(max / (width * height));
  }

  function computePreviewSampleSize(blob, width, height) {
    // If the image is not a JPEG we can't use a samplesize
    if (blob.type !== 'image/jpeg') {
      return Downsample.NONE;
    }

    //
    // Determine how much we can scale the image down and still have it
    // big enough to fill the screen in at least one dimension.
    //
    // For example, suppose we have a 1600x1200 photo and a 320x480 screen
    //
    //  portraitScale = Math.min(.2, .4) = 0.2
    //  landscapeScale = Math.min(.3, .266) = 0.266
    //  scale = 0.266
    //
    var screenWidth = window.innerWidth * window.devicePixelRatio;
    var screenHeight = window.innerHeight * window.devicePixelRatio;

    // To display the image in portrait orientation, this is how much we
    // have to scale it down to ensure that both dimensions fit
    var portraitScale = Math.min(screenWidth / width, screenHeight / height);

    // To display the image in landscape, this is we need to scale it
    // this much
    var landscapeScale = Math.min(screenHeight / width, screenWidth / height);

    // We need an image that is big enough in either orientation
    var scale = Math.max(portraitScale, landscapeScale);

    // Return the largest samplesize that still produces a big enough preview
    return Downsample.sizeNoMoreThan(scale);
  }
};

// A utility function we use to display the full-size image or the preview.
MediaFrame.prototype._displayImage = function _displayImage(blob, isPreview) {
  var self = this;

  // Get rid of any existing image and its event handlers
  this._clearImage();

  // And create a fresh new one
  this.image = document.createElement('img');
  this.image.style.transformOrigin = 'center center';
  this.image.style.display = 'none';
  this.container.appendChild(this.image);

  this.displayingPreview = isPreview;

  // Create a URL for the blob (or preview blob)
  if (this.url)
    URL.revokeObjectURL(this.url);
  this.url = URL.createObjectURL(blob);

  this.image.onerror = function(e) {
    console.error('failed to load image', self.image.url, e);
    if (self.onerror)
      self.onerror(e);
  };
  this.image.onload = function(e) {
    self.image.onload = null;

    // Switch height & width for rotated images
    if (self.rotation == 0 || self.rotation == 180) {
      self.itemWidth = self.image.width;
      self.itemHeight = self.image.height;
    } else {
      self.itemWidth = self.image.height;
      self.itemHeight = self.image.width;
    }

    self.computeFit();
    self.setPosition();
    self.image.style.display = 'block';
  };

  this.image.src = this.url +
    (isPreview ? this.previewSampleSize : this.fullSampleSize);
};

MediaFrame.prototype._switchToFullSizeImage = function _switchToFull() {
  if (!this.displayingImage || !this.displayingPreview)
    return;

  var self = this;
  this.displayingPreview = false;

  var oldimage = this.oldimage = this.image;
  var newimage = this.image = document.createElement('img');
  newimage.style.transformOrigin = 'center center';

  // If there is a separate preview blob, then we need a new url now
  if (this.previewblob) {
    URL.revokeObjectURL(this.url);
    this.url = URL.createObjectURL(this.imageblob);
  }

  newimage.src = this.url + this.fullSampleSize;

  // move onerror callback to newimage when oldimage becomes useless.
  newimage.onerror = oldimage.onerror;
  oldimage.onerror = null;

  // Add the new image to the container before the current preview image
  // Because it comes first it will be obscured by the preview
  this.container.insertBefore(newimage, oldimage);

  // Resize the preview image to be the same size as the full image.
  // It will be pixelated, but it will be ready right away.
  if (this.rotation == 0 || this.rotation == 180) {
    this.itemWidth = this.oldimage.width = this.fullsizeWidth;
    this.itemHeight = this.oldimage.height = this.fullsizeHeight;
  } else {
    this.itemWidth = this.oldimage.height = this.fullsizeHeight;
    this.itemHeight = this.oldimage.width = this.fullsizeWidth;
  }

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
  newimage.onload = function imageLoaded() {
    newimage.onload = null;

    // If the image we got has a different size than what we predicted
    // then make an adjustment now. This might happen if we use a
    // #-moz-samplesize fragment and it does not do what we expect.
    if (newimage.width !== self.fullsizeWidth) {
      console.warn('#-moz-samplesize did not scale as expected',
                  newimage.width, self.fullsizeWidth);
      self.itemWidth = self.fullsizeWidth = newimage.width;
      self.itemHeight = self.fullsizeHeight = newimage.height;
    }

    // It takes quite a while for gecko to decode a 1200x1600 image once
    // it is loaded, so we wait a second here before removing the preview.
    // XXX: This is a hack. There really ought to be an event we can listen for
    // to know when the image is ready to display onscreen. See Bug 844245.
    self.imageSwitchTimeout = setTimeout(function() {
      self.imageSwitchTimeout = null;
      if (self.oldimage) {
        self.container.removeChild(self.oldimage);
        self.oldimage.onload = null;
        self.oldimage.src = '';
        self.oldimage = null;
      }
    }, 1000);
  };
};

MediaFrame.prototype._switchToPreviewImage = function _switchToPreview() {
  // If we're not displaying an image or already displaying preview
  // then there is nothing to do
  if (!this.displayingImage || this.displayingPreview)
    return;

  this._displayImage(this.previewblob || this.imageblob, true);
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

// Get rid of the image if we have one
MediaFrame.prototype._clearImage = function _clearImage() {
  if (this.image) {
    this.container.removeChild(this.image);
    this.image.onload = null;
    this.image.onerror = null;
    this.image.src = '';
    this.image = null;
  }
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

  this._clearImage();

  // If we were in the middle of switching from a preview image to a
  // fullsize image, then clean up from that, too.
  if (this.imageSwitchTimeout) {
    clearTimeout(this.imageSwitchTimeout);
    this.imageSwitchTimeout = null;
  }
  if (this.oldimage) {
    this.container.removeChild(this.oldimage);
    this.oldimage.onload = null;
    this.oldimage.onerror = null;
    this.oldimage.src = '';
    this.oldimage = null;
  }

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

  var dx = this.fit.left, dy = this.fit.top;

  // We have to adjust the translation to account for the fact that the
  // scaling is being done around the middle of the image, rather than the
  // upper-left corner.  And we have to make this adjustment differently
  // for different rotations.
  switch (this.rotation) {
  case 0:
  case 180:
    dx += (this.fit.width - this.itemWidth) / 2;
    dy += (this.fit.height - this.itemHeight) / 2;
    break;
  case 90:
  case 270:
    dx += (this.fit.width - this.itemHeight) / 2;
    dy += (this.fit.height - this.itemWidth) / 2;
    break;
  }

  var sx = this.mirrored ? -this.fit.scale : this.fit.scale;
  var sy = this.fit.scale;

  var transform =
    'translate(' + dx + 'px, ' + dy + 'px) ' +
    'scale(' + sx + ',' + sy + ')' +
    'rotate(' + this.rotation + 'deg) ';

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
  if (this.displayingImage && !this.displayingPreview &&
      (this.previewblob || this.previewSampleSize !== Downsample.NONE)) {
    this._switchToPreviewImage(); // resets image size and position
    return;
  }

  // Otherwise, just resize and position the item we're already displaying
  this.computeFit();
  this.setPosition();
  // If frame is resized, the video's size also need to reset.
  if (this.displayingVideo)
    this.video.setPlayerSize();
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

  // If no zooming has been done (or almost no zooming), then a resize is just
  // a reset. The same is true if the new fit base scale is greater than the
  // old scale.
  // The scale is calculated with division, the value may not be accurate
  // because of IEEE 754. We use abs difference to do the equality checking.
  if (Math.abs(oldfit.scale - oldfit.baseScale) < 0.01 ||
      newfit.baseScale > oldfit.scale) {

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
// the image pixels at (fixedX, fixedY) remain at that position.
// Assume that zoom gestures can't be done in the middle of swipes, so
// if we're calling zoom, then the swipe property will be 0.
// If time is specified and non-zero, then we set a CSS transition
// to animate the zoom.
MediaFrame.prototype.zoom = function zoom(scale, fixedX, fixedY, time) {
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

  // fixedX and fixedY are in viewport coordinates.
  // These are the photo coordinates displayed at that point in the viewport
  var photoX = fixedX - this.fit.left;
  var photoY = fixedY - this.fit.top;

  // After zooming, these are the new photo coordinates.
  // Note we just use the relative scale amount here, not this.fit.scale
  photoX = Math.floor(photoX * scale);
  photoY = Math.floor(photoY * scale);

  // To keep that point still, here are the new left and top values we need
  this.fit.left = fixedX - photoX;
  this.fit.top = fixedY - photoY;

  // Now make sure we didn't pan too much: If the image fits on the
  // screen, fixed it. If the image is bigger than the screen, then
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
    this.image.addEventListener('transitionend', function done() {
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

MediaFrame.prototype.setMinimumPreviewSize = function(w, h) {
  this.minimumPreviewWidth = w;
  this.minimumPreviewHeight = h;
};
