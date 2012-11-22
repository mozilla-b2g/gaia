/*
 * Frame.js:
 *
 * A Frame displays a photo or a video. The open activity uses one of these
 * to display the opened item. The gallery app proper uses three side by side
 * to support smooth panning from one item to the next.
 *
 * Frames have different behavior depending on whether they display
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
 * the Frame will just move the photo within itself, if it can, and
 * return 0.
 *
 * Much of the code in this file used to be part of the PhotoState class.
 */
function Frame(container, includeVideo) {
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

Frame.prototype.displayImage = function displayImage(blob, width, height) {
  // Keep track of what kind of content we have
  this.displayingImage = true;
  this.displayingVideo = false;

  // Hide the video player and display the image
  if (this.video)
    this.video.hide();
  this.image.style.display = 'block';

  // Remember the blob
  this.blob = blob;

  // If we have the blob url of something we've previously displayed
  // revoke it now
  if (this.url)
    URL.revokeObjectURL(this.url);

  // Get a new URL for this blob
  this.url = URL.createObjectURL(blob);

  // Display it as an image, and make sure the video isn't holding anything
  this.image.src = this.url;
  if (this.video)
    this.video.player.src = null; // XXX '' or about:blank instead?

  // If we have the width and height, position the image now.
  // Otherwise, register an event handler to position it when loaded.
  // The gallery app always has the dimensions but the open activity doesn't.
  if (width && height) {
    this.itemWidth = width;
    this.itemHeight = height;
    this.computeFit();
    this.setPosition();
  }
  else {
    var self = this;
    this.image.addEventListener('load', function onload() {
      this.removeEventListener('load', onload);
      self.itemWidth = this.naturalWidth;
      self.itemHeight = this.naturalHeight;
      self.computeFit();
      self.setPosition();
    });
  }
};

Frame.prototype.displayVideo = function displayVideo(blob, width, height) {
  if (!this.video)
    return;
  // Keep track of what kind of content we have
  this.displayingImage = false;
  this.displayingVideo = true;

  // Show the video player and hide the image
  this.video.show();
  this.image.style.display = 'none';

  // Remember the blob
  this.blob = blob;

  // If we have the blob url of something we've previously displayed
  // revoke it now
  if (this.url)
    URL.revokeObjectURL(this.url);

  // Get a new URL for this blob
  this.url = URL.createObjectURL(blob);

  // Display it in the video element
  this.video.player.src = this.url;
  this.image.src = null; // XXX: about:blank or empty string?

  // If we have the width and height, position the video element now.
  // Otherwise, register an event handler to position it when loaded.
  // The gallery app always has the dimensions but the open activity doesn't.
  // Note that the video controls don't need to be positioned; they
  // always go at the bottom of the container.
  if (width && height) {
    this.itemWidth = width;
    this.itemHeight = height;
    this.video.player.style.width = width + 'px';
    this.video.player.style.height = height + 'px';
    this.computeFit();
    this.setPosition();
  }
  else {
    var self = this;
    this.video.player.addEventListener('loadedmetadata', function onload() {
      this.removeEventListener('loadedmetadata', onload);
      self.itemWidth = this.videoWidth;
      self.itemHeight = this.videoHeight;
      this.style.width = this.videoWidth + 'px';
      this.style.height = this.videoHeight + 'px';
      self.computeFit();
      self.setPosition();
    });
  }
};

// Display nothing
Frame.prototype.clear = function clear() {
  this.displayingImage = false;
  this.displayingVideo = false;
  this.itemWidth = this.itemHeight = null;
  if (this.video)
    this.video.hide();
  this.image.style.display = 'none';
  this.blob = null;
  if (this.url) {
    URL.revokeObjectURL(this.url);
    this.url = null;
  }
  this.image.src = null;  // XXX: use about:blank or '' here?
  if (this.video)
    this.video.player.src = null;
  this.fit = null;
};

// Set the item's position based on this.fit
// The VideoPlayer object fits itself to its container, and it
// can't be zoomed or panned, so we only need to do this for images
Frame.prototype.setPosition = function setPosition() {
  if (!this.fit || !this.displayingImage)
    return;

  this.image.style.transform =
    'translate(' + this.fit.left + 'px,' + this.fit.top + 'px) ' +
    'scale(' + this.fit.scale + ')';
};

Frame.prototype.computeFit = function computeFit() {
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

Frame.prototype.reset = function reset() {
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
Frame.prototype.resize = function resize() {
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
    this.setPosition();
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
Frame.prototype.zoom = function zoom(scale, centerX, centerY, time) {
  // Ignore zooms if we're not displaying an image
  if (!this.displayingImage)
    return;

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
Frame.prototype.pan = function(dx, dy) {
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
