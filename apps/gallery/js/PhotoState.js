/*
 * This class encapsulates the zooming and panning functionality for
 * the gallery app and maintains the current size and position of the
 * currently displayed photo as well as the transition state (if any)
 * between photos.
 */
function PhotoState(img, width, height) {
  // The <img> element that we manipulate
  this.img = img;

  // The actual size of the photograph
  this.photoWidth = width;
  this.photoHeight = height;

  // Do all the calculations
  this.reset();
}

PhotoState.BORDER_WIDTH = 3;  // Border between photos

// An internal method called by reset(), zoom() and pan() to
// set the size and position of the image element.
PhotoState.prototype._reposition = function() {
  PhotoState.positionImage(this.img, this.fit);
};

// Compute the default size and position of the photo
PhotoState.prototype.reset = function() {
  // Store the display space we have for photos
  // call reset() when we get a resize or orientationchange event
  this.viewportWidth = this.img.parentNode.offsetWidth;
  this.viewportHeight = this.img.parentNode.offsetHeight;

  // Compute the default size and position of the image
  this.fit = PhotoState.fitImage(this.photoWidth, this.photoHeight,
                                 this.viewportWidth, this.viewportHeight);

  // We start off with no swipe from left to right
  this.swipe = 0;

  this._reposition(); // Apply the computed size and position
};

// We call this from the resize handler when the user rotates the
// screen or when going into or out of fullscreen mode.  We discard
// any side-to-side swipe. If the user has not zoomed in, then we just
// fit the image to the new size (same as reset).  But if the user has
// zoomed in (and we need to stay zoomed for the new size) then we
// adjust the fit properties so that the pixel that was at the center
// of the screen before remains at the center now, or as close as
// possible
PhotoState.prototype.resize = function() {
  var oldWidth = this.viewportWidth;
  var oldHeight = this.viewportHeight;
  var newWidth = this.img.parentNode.offsetWidth;
  var newHeight = this.img.parentNode.offsetHeight;

  var fit = this.fit; // The current image fit

  // this is how the image would fit at the new screen size
  var newfit = PhotoState.fitImage(this.photoWidth, this.photoHeight,
                                   newWidth, newHeight);

  // If no zooming has been done, then a resize is just a reset.
  // The same is true if the new fit base scale is greater than the
  // old scale.

  // The same is true if the image is smaller (in both dimensions)
  // than the new screen size.
  if (fit.scale === fit.baseScale || newfit.baseScale > fit.scale) {
    this.reset();
    this.setFramesPosition();
    return;
  }

  // Remember the new screen size
  this.viewportWidth = newWidth;
  this.viewportHeight = newHeight;

  // Figure out the change in both dimensions and adjust top and left
  // to accomodate the change
  fit.left += (newWidth - oldWidth) / 2;
  fit.top += (newHeight - oldHeight) / 2;

  // Adjust the base scale, too
  fit.baseScale = newfit.baseScale;

  // Reposition this image without resetting the zoom
  this._reposition();

  // Undo any swipe amount
  this.swipe = 0;
  this.setFramesPosition();
};

// Zoom in by the specified factor, adjusting the pan amount so that
// the image pixels at (centerX, centerY) remain at that position.
// Assume that zoom gestures can't be done in the middle of swipes, so
// if we're calling zoom, then the swipe property will be 0.
// If time is specified and non-zero, then we set a CSS transition
// to animate the zoom.
PhotoState.prototype.zoom = function(scale, centerX, centerY, time) {
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
  this.fit.width = Math.floor(this.photoWidth * this.fit.scale);
  this.fit.height = Math.floor(this.photoHeight * this.fit.scale);

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
  // call to reposition below is animated
  if (time) {
    // If a time was specfied, animate the transformation
    this.img.style.transition = 'transform ' + time + 'ms ease';
    var self = this;
    this.img.addEventListener('transitionend', function done(e) {
      self.img.removeEventListener('transitionend', done);
      self.img.style.transition = null;
    });
  }

  this._reposition();
};

PhotoState.prototype.pan = function(dx, dy) {
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

  // Now handle the X dimension. In this case, we have to handle panning within
  // a zoomed image, and swiping to transition from one photo to the next
  // or previous.
  if (this.fit.width <= this.viewportWidth) {
    // In this case, the photo isn't zoomed in, so we're just doing swiping
    this.swipe += dx;
  }
  else {
    if (this.swipe === 0) {
      this.fit.left += dx;

      // If this would take the left edge of the photo past the
      // left edge of the screen, then we've got to do a swipe
      if (this.fit.left > 0) {
        this.swipe += this.fit.left;
        this.fit.left = 0;
      }

      // Or, if this would take the right edge of the photo past the
      // right edge of the screen, then we've got to swipe the other way
      if (this.fit.left + this.fit.width < this.viewportWidth) {
        this.swipe += this.fit.left + this.fit.width - this.viewportWidth;
        this.fit.left = this.viewportWidth - this.fit.width;
      }
    }
    else if (this.swipe > 0) {
      this.swipe += dx;
      if (this.swipe < 0) {
        this.fit.left += this.swipe;
        this.swipe = 0;
      }
    }
    else if (this.swipe < 0) {
      this.swipe += dx;
      if (this.swipe > 0) {
        this.fit.left += this.swipe;
        this.swipe = 0;
      }
    }
  }

  this._reposition();
};

PhotoState.prototype.setFramesPosition = function() {
  // XXX we ignore rtl languages for now.
  currentPhotoFrame.style.transform = 'translateX(' + this.swipe + 'px)';
  nextPhotoFrame.style.transform = 'translateX(' +
    (this.viewportWidth + PhotoState.BORDER_WIDTH + this.swipe) + 'px)';
  previousPhotoFrame.style.transform = 'translateX(' +
    (-(this.viewportWidth + PhotoState.BORDER_WIDTH) + this.swipe) + 'px)';
};

PhotoState.positionImage = function positionImage(img, fit) {
  img.style.transform =
    'translate(' + fit.left + 'px,' + fit.top + 'px) ' +
    'scale(' + fit.scale + ')';
};

// figure out the size and position of an image based on its size
// and the screen size.
PhotoState.fitImage = function fitImage(photoWidth, photoHeight,
                                        viewportWidth, viewportHeight) {
  var scalex = viewportWidth / photoWidth;
  var scaley = viewportHeight / photoHeight;
  var scale = Math.min(Math.min(scalex, scaley), 1);

  // Set the image size and position
  var width = Math.floor(photoWidth * scale);
  var height = Math.floor(photoHeight * scale);

  return {
    width: width,
    height: height,
    left: Math.floor((viewportWidth - width) / 2),
    top: Math.floor((viewportHeight - height) / 2),
    scale: scale,
    baseScale: scale
  };
};
