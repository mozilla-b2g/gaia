/*
 * ImageEditor.js: simple image editing and previews in a <canvas> element
 * 
 * Display an edited version of the specified image in a <canvas> element
 * inside the specified container element. The image (or cropped region of
 * the image) will be displayed as large as possible within the container's
 * area.  Edits is an object that specifies the edits to apply to the image.
 * The edits object may include these properties:
 *  
 *  crop: an object with x, y, w, and h properties specifying a crop rectangle
 *  exposure: a float specifying the # of stops of exposure compensation
 *  effects: a string naming an effect. "bw" and "sepia" are the options now.
 *  borderColor: a CSS color string for the border
 *  borderWidth: the size of the border as a percent of the image width
 * 
 * In addition to previewing the image, this class also defines a 
 * getFullSizeBlob() function that creates a full-size version of the
 * edited image.
 */
"use strict";

function ImageEditor(imageURL, container, edits) {
  this.imageURL = imageURL;
  this.container = container;
  this.edits = edits || {};

  // The canvas that displays the preview
  this.previewCanvas = document.createElement('canvas');
  this.previewContext = this.previewCanvas.getContext('2d');
  container.appendChild(previewCanvas);

  // An offscreen canvas for resizing and extracting pixels
  this.offscreenCanvas = document.createElement('canvas');
  this.offscreenContext = this.offscreenCanvas.getContext('2d');

  // A full-size offscreen image 
  this.original = new Image();
  original.src = imageURL;
  var self = this;
  // When the image loads....
  this.original.onload = function() {
    // Display an edited preview of it
    self.edit(edits);
  }

  this.worker = new Worker('ImageEditorWorker.js');
  this.worker.onmessage = function(e) {
    // Whenever the worker sends us some image data, we copy it into the
    // middle of the preview canvas
    var imagedata = e.data;
    var x = (self.previewCanvas.width - imagedata.width)/2;
    var y = (self.previewCanvas.height - imagedata.height)/2;
    self.previewContext.putImageData(imagedata, x, y);
  }
}

// Preview the image with the specified edits applyed. If edits is omitted,
// displays the original image. Clients should call this function when the
// desired edits change or when the size of the container changes (on 
// orientation change events, for example)
ImageEditor.prototype.edit = function(edits) {
  if (!edits) 
    edits = {};

  var containerWidth = this.container.clientWidth;
  var containerHeight = this.container.clientHeight;

  // Use crop size or full-size of image
  var imageWidth = edits.crop ? edits.crop.w : this.original.width;
  var imageHeight = edits.crop ? edits.crop.h : this.original.height;

  // Add in the borders, if there are any
  var borderWidth = edits.borderWidth || 0;
  if (borderWidth > 0) {
    borderWidth = Math.round(borderWidth * imageWidth / 100);
    imageWidth += 2*borderWidth;
    imageHeight += 2*borderWidth;
  }

  // Now figure out the size and position of the canvas within the container
  // based on the size of the image and the size of the container.
  // See also fitImageToScreen() in gallery.js
  var scalex = containerWidth/imageWidth;
  var scaley = containerHeight/imageHeight;
  var scale = Math.min(Math.min(scalex, scaley), 1);

  // Set the image size and position
  var scaledBorderWidth = Math.ceil(borderWidth * scale);
  var width = Math.floor((imageWidth-2*borderWidth) * scale);
  var height = Math.floor((imageHeight-2*borderWidth) * scale);
  var left = Math.floor((containerWidth - width - 2*scaledBorderWidth) / 2);
  var top = Math.floor((containerHeight - height - 2*scaledBorderWidth) / 2);

  // Set the on-screen position of the preview canvas.
  this.previewCanvas.width = width + 2*scaledBorderWidth;
  this.previewCanvas.height = height + 2*scaledBorderWidth;
  this.previewCanvas.style.left = left + 'px';
  this.previewCanvas.style.top = top + 'px';

  // Use the offscreen canvas to get image pixels that we want to edit
  this.offscreenCanvas.width = width;
  this.offscreenCanvas.height = height;
  this.offscreenContext.drawImage(this.original, 
                                  edits.crop ? edits.crop.x : 0,
                                  edits.crop ? edits.crop.y : 0,
                                  imageWidth,
                                  imageHeight,
                                  0, 0, width, height);
  var imagedata = this.offscreenContext.getImageData(0, 0, width, height);

  // Ask our worker thread to process the pixels.
  // They'll get drawn to the preview canvas when the editing is done
  this.worker.postMessage({
    pixels: imagedata,
    edits: edits
  });
                                  
  // Meanwhile, draw the border, if there is one
  if (borderWidth > 0) {
    this.previewContext.lineWidth = scaledBorderWidth;
    this.previewContext.strokeStyle = edits.borderColor || "#fff";
    this.previewContext.strokeRect(scaledBorderWidth/2,
                                   scaledBorderWidth/2,
                                   width + scaledBorderWidth,
                                   height + scaledBorderHeight);
  }
};

// Apply the edits offscreen and pass the full-size edited image as a blob
// to the specified callback function
ImageEditor.prototype.getFullSizeBlob = function(edits, type, callback) {
};

// Remove the preview canvas from the container and release any other resources
ImageEditor.prototype.close = function() {
};
