/*
 * ImageEditor.js: simple image editing and previews in a <canvas> element
 *
 * Display an edited version of the specified image in a <canvas> element
 * inside the specified container element. The image (or cropped region of
 * the image) will be displayed as large as possible within the container's
 * area.  Edits is an object that specifies the edits to apply to the image.
 * The edits object may include these properties:
 *
 *  gamma: a float specifying gamma correction
 *  effects: "bw" and "sepia" or "none"
 *  borderColor: a CSS color string for the border
 *  borderWidth: the size of the border as a fraction of the image width
 *
 * In addition to previewing the image, this class also defines a
 * getFullSizeBlob() function that creates a full-size version of the
 * edited image.
 *
 * This class also handles cropping.  See:
 *
 *   showCropOverlay()
 *   hideCropOverlay()
 *   cropImage()
 *   undoCrop()
 */
'use strict';

function ImageEditor(imageURL, container, edits) {
  this.imageURL = imageURL;
  this.container = container;
  this.edits = edits || {};
  this.crop = {};              // How much the image is cropped
  this.cropRegion = {};        // Crop rectangle while being dragged


  // The canvas that displays the preview
  this.previewCanvas = document.createElement('canvas');
  this.previewCanvas.style.position = 'absolute';
  this.previewContext = this.previewCanvas.getContext('2d');
  this.container.appendChild(this.previewCanvas);

  // An offscreen canvas for resizing and extracting pixels
  this.offscreenCanvas = document.createElement('canvas');
  this.offscreenContext = this.offscreenCanvas.getContext('2d');

  // A full-size offscreen image
  this.original = new Image();
  this.original.src = imageURL;
  var self = this;
  // When the image loads....
  this.original.onload = function() {
    // Initialize the crop region to the full size of the original image
    self.resetCropRegion();

    // Display an edited preview of it
    self.edit();
  }

  this.worker = new Worker('js/ImageEditorWorker.js');
  this.worker.onmessage = function(e) {
    if (e.data.type === 'preview') {
      // Whenever the worker sends us some image data, we copy it into the
      // middle of the preview canvas
      var imagedata = e.data.imagedata;
      var x = (self.previewCanvas.width - imagedata.width) / 2;
      var y = (self.previewCanvas.height - imagedata.height) / 2;
      self.previewContext.putImageData(imagedata, x, y);
    }
  }
}

// Preview the image with the specified edits applyed. If edits is omitted,
// displays the original image. Clients should call this function when the
// desired edits change or when the size of the container changes (on
// orientation change events, for example)
ImageEditor.prototype.edit = function() {
  var containerWidth = this.container.clientWidth;
  var containerHeight = this.container.clientHeight;

  // Use crop size
  var imageWidth = this.crop.w;
  var imageHeight = this.crop.h;

  // Add in the borders, if there are any
  var borderWidth = this.edits.borderWidth || 0;
  if (borderWidth > 0) {
    borderWidth = Math.round(borderWidth * imageWidth);
    imageWidth += 2 * borderWidth;
    imageHeight += 2 * borderWidth;
  }

  // Now figure out the size and position of the canvas within the container
  // based on the size of the image and the size of the container.
  // See also fitImageToScreen() in gallery.js
  var scalex = containerWidth / imageWidth;
  var scaley = containerHeight / imageHeight;
  var scale = Math.min(Math.min(scalex, scaley), 1);

  // Set the image size and position
  var scaledBorderWidth = Math.ceil(borderWidth * scale);
  var width = Math.floor((imageWidth - 2 * borderWidth) * scale);
  var height = Math.floor((imageHeight - 2 * borderWidth) * scale);
  var left = Math.floor((containerWidth - width - 2 * scaledBorderWidth) / 2);
  var top = Math.floor((containerHeight - height - 2 * scaledBorderWidth) / 2);

  // Set the on-screen position of the preview canvas.
  this.previewCanvas.width = width + 2 * scaledBorderWidth;
  this.previewCanvas.height = height + 2 * scaledBorderWidth;
  this.previewCanvas.style.left = left + 'px';
  this.previewCanvas.style.top = top + 'px';

  // Use the offscreen canvas to get image pixels that we want to edit
  this.offscreenCanvas.width = width;
  this.offscreenCanvas.height = height;
  this.offscreenContext.drawImage(this.original,
                                  this.crop.x, this.crop.y,
                                  imageWidth - 2 * borderWidth,
                                  imageHeight - 2 * borderWidth,
                                  0, 0, width, height);
  var imagedata = this.offscreenContext.getImageData(0, 0, width, height);

  // Ask our worker thread to process the pixels.
  // They'll get drawn to the preview canvas when the editing is done
  this.worker.postMessage({
    type: 'preview',
    imagedata: imagedata,
    edits: this.edits
  });

  // Meanwhile, draw the border, if there is one
  if (borderWidth > 0) {
    this.previewContext.lineWidth = scaledBorderWidth;
    this.previewContext.strokeStyle = this.edits.borderColor || '#fff';
    this.previewContext.strokeRect(scaledBorderWidth / 2,
                                   scaledBorderWidth / 2,
                                   width + scaledBorderWidth,
                                   height + scaledBorderWidth);
  }
};

// Apply the edits offscreen and pass the full-size edited image as a blob
// to the specified callback function. The code here is much like the
// code above in edit().
ImageEditor.prototype.getFullSizeBlob = function(type, callback) {
  // "full size" is the cropped size
  var imageWidth = this.crop.w;
  var imageHeight = this.crop.h;

  // Add in the borders, if there are any
  var borderWidth = this.edits.borderWidth || 0;
  if (borderWidth > 0) {
    borderWidth = Math.round(borderWidth * imageWidth);
  }

  // Use the offscreen canvas to get image pixels that we want to edit
  this.offscreenCanvas.width = imageWidth + 2 * borderWidth;
  this.offscreenCanvas.height = imageHeight + 2 * borderWidth;
  this.offscreenContext.drawImage(this.original,
                                  this.crop.x, this.crop.y,
                                  imageWidth, imageHeight,
                                  borderWidth, borderWidth,
                                  imageWidth, imageHeight);
  var imagedata = this.offscreenContext.getImageData(borderWidth, borderWidth,
                                                     imageWidth, imageHeight);


  // Ask our worker thread to process the pixels.
  this.worker.postMessage({
    type: 'fullsize',
    imagedata: imagedata,
    edits: this.edits
  });

  // Meanwhile, draw the border, if there is one
  if (borderWidth > 0) {
    this.offscreenContext.lineWidth = borderWidth;
    this.offscreenContext.strokeStyle = this.edits.borderColor || '#fff';
    this.offscreenContext.strokeRect(borderWidth / 2,
                                     borderWidth / 2,
                                     imageWidth + borderWidth,
                                     imageHeight + borderWidth);
  }

  // Handle a response from the worker
  var oldhandler = this.worker.onmessage; // Remember preview handler
  var self = this;
  this.worker.onmessage = function(e) {
    // restore the preview handler
    self.worker.onmessage = oldhandler;

    // Copy the edited imagedata into the offscreen canvas
    var imagedata = e.data.imagedata;
    self.offscreenContext.putImageData(imagedata, borderWidth, borderWidth);

    // Now get it as a blob and pass it to the callback
    callback(self.offscreenCanvas.mozGetAsFile('', type));
  };
};

// Stop the worker thread and remove the preview canvas.
ImageEditor.prototype.close = function() {
  // Stop the thread
  this.worker.terminate();
  // Remove the canvas from the container
  this.container.removeChild(this.previewCanvas);
  // Forget the URL of the offscreen image
  this.original.src = '';
  // Set canvas sizes to zero
  this.offscreenCanvas.width = 0;
  this.previewCanvas.width = 0;
  if (this.cropCanvas)
    this.hideCropOverlay();
};

// Display cropping controls
// XXX: have to handle rotate/resize
ImageEditor.prototype.showCropOverlay = function showCropOverlay() {
  this.cropCanvas = document.createElement('canvas');

  // Give the overlay 10px margins all around, so crop handles can
  this.cropCanvas.width = this.previewCanvas.width + 20;
  this.cropCanvas.height = this.previewCanvas.height + 20;

  this.cropCanvas.style.position = 'absolute';
  this.cropCanvas.style.left = (this.previewCanvas.offsetLeft - 10) + 'px';
  this.cropCanvas.style.top = (this.previewCanvas.offsetTop - 10) + 'px';
  this.container.appendChild(this.cropCanvas);
  this.cropContext = this.cropCanvas.getContext('2d');
  this.cropContext.translate(10, 10);   // Adjust for the margins
  this.cropContext.lineCap = 'round';   // For crop handles

  // Start off with a crop region that is the entire preview canvas
  this.cropRegion.left = 0;
  this.cropRegion.top = 0;
  this.cropRegion.right = this.previewCanvas.width;
  this.cropRegion.bottom = this.previewCanvas.height;

  this.drawCropControls();

  this.cropCanvas.addEventListener('mousedown', this.cropStart.bind(this));
};

ImageEditor.prototype.hideCropOverlay = function hideCropOverlay() {
  if (this.cropCanvas) {
    this.container.removeChild(this.cropCanvas);
    this.cropCanvas.width = 0;
    this.cropCanvas = this.cropContext = null;
  }
};

// Reset image to full original size
ImageEditor.prototype.resetCropRegion = function resetCropRegion() {
  this.crop.x = 0;
  this.crop.y = 0;
  this.crop.w = this.original.width;
  this.crop.h = this.original.height;
};

ImageEditor.prototype.drawCropControls = function(handle) {
  var left = this.cropRegion.left;
  var top = this.cropRegion.top;
  var right = this.cropRegion.right;
  var bottom = this.cropRegion.bottom;
  var centerX = (left + right) / 2;
  var centerY = (top + bottom) / 2;
  var width = right - left;
  var height = bottom - top;

  // Erase everything and reset context
  this.cropCanvas.width = this.cropCanvas.width;

  // Adjust for the margins
  this.cropContext.translate(10, 10);

  // Overlay the preview canvas with translucent gray
  this.cropContext.fillStyle = 'rgba(0, 0, 0, .5)';
  this.cropContext.fillRect(0, 0,
                            this.previewCanvas.width,
                            this.previewCanvas.height);

  // Clear a rectangle so interior of the crop region shows through
  this.cropContext.clearRect(left, top, width, height);

  // Draw a border around the crop region
  this.cropContext.strokeStyle = '#fff';
  this.cropContext.lineWidth = 1;
  this.cropContext.strokeRect(left, top, width, height);

  // Draw the drag handles in the corners of the crop region
  this.cropContext.lineWidth = 5;
  this.cropContext.beginPath();
  this.cropContext.moveTo(left, top + 10);
  this.cropContext.lineTo(left, top);
  this.cropContext.lineTo(left + 10, top);

  this.cropContext.moveTo(right - 10, top);
  this.cropContext.lineTo(right, top);
  this.cropContext.lineTo(right, top + 10);

  this.cropContext.moveTo(right, bottom - 10);
  this.cropContext.lineTo(right, bottom);
  this.cropContext.lineTo(right - 10, bottom);

  this.cropContext.moveTo(left + 10, bottom);
  this.cropContext.lineTo(left, bottom);
  this.cropContext.lineTo(left, bottom - 10);

  // And drag handles in the centers of each edge, too
  this.cropContext.moveTo(centerX - 8, top);
  this.cropContext.lineTo(centerX + 8, top);

  this.cropContext.moveTo(centerX - 8, bottom);
  this.cropContext.lineTo(centerX + 8, bottom);

  this.cropContext.moveTo(left, centerY - 8);
  this.cropContext.lineTo(left, centerY + 8);

  this.cropContext.moveTo(right, centerY - 8);
  this.cropContext.lineTo(right, centerY + 8);

  this.cropContext.stroke();

  // If one of the handles is being used, highlight it
  if (handle) {
    var cx, cy;
    switch (handle) {
    case 'n':
      cx = centerX;
      cy = top;
      break;
    case 'ne':
      cx = right;
      cy = top;
      break;
    case 'e':
      cx = right;
      cy = centerY;
      break;
    case 'se':
      cx = right;
      cy = bottom;
      break;
    case 's':
      cx = centerX;
      cy = bottom;
      break;
    case 'sw':
      cx = left;
      cy = bottom;
      break;
    case 'w':
      cx = left;
      cy = centerY;
      break;
    case 'nw':
      cx = left;
      cy = top;
      break;
    }

    this.cropContext.beginPath();
    this.cropContext.arc(cx, cy, 25, 0, 2 * Math.PI);
    this.cropContext.fillStyle = 'rgba(255,255,255,.5)';
    this.cropContext.strokeStyle = '#fff';
    this.cropContext.lineWidth = 1;
    this.cropContext.fill();
  }
};

// Called on mousedown in the crop overlay canvas
ImageEditor.prototype.cropStart = function(startEvent) {
  var self = this;
  var rect = this.previewCanvas.getBoundingClientRect();
  var x0 = startEvent.clientX - rect.left;
  var y0 = startEvent.clientY - rect.top;
  var left = this.cropRegion.left;
  var top = this.cropRegion.top;
  var right = this.cropRegion.right;
  var bottom = this.cropRegion.bottom;

  // Return true if (x0,y0) is within 25 pixels of (x,y)
  function hit(x, y) {
    return (x0 > x - 25 && x0 < x + 25 &&
            y0 > y - 25 && y0 < y + 25);
  }

  if (hit((left + right) / 2, top))
    drag('n');
  else if (hit(right, top))
    drag('ne');
  else if (hit(right, (top + bottom) / 2))
    drag('e');
  else if (hit(right, bottom))
    drag('se');
  else if (hit((left + right) / 2, bottom))
    drag('s');
  else if (hit(left, bottom))
    drag('sw');
  else if (hit(left, (top + bottom) / 2))
    drag('w');
  else if (hit(left, top))
    drag('nw');
  else
    drag(); // with no argument, do a pan instead of a drag

  function drag(handle) {
    window.addEventListener('mousemove', move, true);
    window.addEventListener('mouseup', up, true);

    self.drawCropControls(handle); // highlight drag handle

    function move(e) {
      var dx = e.clientX - startEvent.clientX;
      var dy = e.clientY - startEvent.clientY;

      if (!handle) {
        pan(dx, dy);
        return;
      }

      switch (handle) {
      case 'n':
        self.cropRegion.top = top + dy;
        break;
      case 'ne':
        self.cropRegion.right = right + dx;
        self.cropRegion.top = top + dy;
        break;
      case 'e':
        self.cropRegion.right = right + dx;
        break;
      case 'se':
        self.cropRegion.right = right + dx;
        self.cropRegion.bottom = bottom + dy;
        break;
      case 's':
        self.cropRegion.bottom = bottom + dy;
        break;
      case 'sw':
        self.cropRegion.left = left + dx;
        self.cropRegion.bottom = bottom + dy;
        break;
      case 'w':
        self.cropRegion.left = left + dx;
        break;
      case 'nw':
        self.cropRegion.left = left + dx;
        self.cropRegion.top = top + dy;
        break;
      }

      // Don't go out of bounds
      if (self.cropRegion.left < 0)
        self.cropRegion.left = 0;
      if (self.cropRegion.right > self.previewCanvas.width)
        self.cropRegion.right = self.previewCanvas.width;
      if (self.cropRegion.top < 0)
        self.cropRegion.top = 0;
      if (self.cropRegion.bottom > self.previewCanvas.height)
        self.cropRegion.bottom = self.previewCanvas.height;

      // Don't let the crop region become smaller than 100x100. If it does
      // then the sensitive regions of the crop handles start to intersect
      if (self.cropRegion.bottom - self.cropRegion.top < 100) {
        switch (handle) {
        case 'n':
        case 'ne':
        case 'nw':
          self.cropRegion.top = self.cropRegion.bottom - 100;
          break;
        case 's':
        case 'se':
        case 'sw':
          self.cropRegion.bottom = self.cropRegion.top + 100;
          break;
        }
      }
      if (self.cropRegion.right - self.cropRegion.left < 100) {
        switch (handle) {
        case 'e':
        case 'ne':
        case 'se':
          self.cropRegion.right = self.cropRegion.left + 100;
          break;
        case 'w':
        case 'nw':
        case 'sw':
          self.cropRegion.left = self.cropRegion.right - 100;
          break;
        }
      }

      self.drawCropControls(handle);
    }

    function pan(dx, dy) {
      if (dx > 0)
        dx = Math.min(dx, self.previewCanvas.width - right);
      if (dx < 0)
        dx = Math.max(dx, -left);
      if (dy > 0)
        dy = Math.min(dy, self.previewCanvas.height - bottom);
      if (dy < 0)
        dy = Math.max(dy, -top);

      self.cropRegion.left = left + dx;
      self.cropRegion.right = right + dx;
      self.cropRegion.top = top + dy;
      self.cropRegion.bottom = bottom + dy;

      self.drawCropControls();
    }

    function up(e) {
      window.removeEventListener('mousemove', move, true);
      window.removeEventListener('mouseup', up, true);
      self.drawCropControls(); // erase drag handle highlight
    }
  }

};

// If the crop overlay is displayed, use the current position of the
// overlaid crop region to actually set the crop region of the original image
ImageEditor.prototype.cropImage = function() {
  if (!this.cropCanvas)
    return;

  // Convert the preview crop region to fractions
  var left = this.cropRegion.left / this.previewCanvas.width;
  var right = this.cropRegion.right / this.previewCanvas.width;
  var top = this.cropRegion.top / this.previewCanvas.height;
  var bottom = this.cropRegion.bottom / this.previewCanvas.height;

  // Now convert those fractions to pixels in the original image
  // Note that the original image may have already been cropped, so we
  // multiply by the size of the crop region, not the full size
  left = Math.floor(left * this.crop.w);
  right = Math.ceil(right * this.crop.w);
  top = Math.floor(top * this.crop.h);
  bottom = Math.floor(bottom * this.crop.h);

  // And update the real crop region
  this.crop.x += left;
  this.crop.y += top;
  this.crop.w = right - left;
  this.crop.h = bottom - top;

  // Adjust the image
  this.edit();

  // Hide and reshow the crop overlay to reset it to match the new image size
  this.hideCropOverlay();
  this.showCropOverlay();
};

// Restore the image to its full original size
ImageEditor.prototype.undoCrop = function() {
  this.resetCropRegion();
  this.edit();
  this.hideCropOverlay();
  this.showCropOverlay();
};
