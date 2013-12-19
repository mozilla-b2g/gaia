// This file contains Gallery code for editing images
'use strict';

var editedPhotoURL; // The blob URL of the photo we're currently editing
var editSettings;
var imageEditor;

var editOptionButtons =
  Array.slice($('edit-options').querySelectorAll('a.radio.button'), 0);

var editBgImageButtons =
  Array.slice($('edit-options').querySelectorAll('a.bgimage.button'), 0);

// Edit mode event handlers
$('edit-exposure-button').onclick = setEditTool.bind(null, 'exposure');
$('edit-crop-button').onclick = setEditTool.bind(null, 'crop');
$('edit-effect-button').onclick = setEditTool.bind(null, 'effect');
$('edit-border-button').onclick = setEditTool.bind(null, 'border');
$('edit-crop-none').onclick = undoCropHandler;
$('edit-cancel-button').onclick = function() { exitEditMode(false); };
$('edit-save-button').onclick = saveEditedImage;
editOptionButtons.forEach(function(b) { b.onclick = editOptionsHandler; });

// Ensure there is enough space to store an edited copy of photo n
// and if there is, call editPhoto to do so
function editPhotoIfCardNotFull(n) {
  var fileinfo = files[n];
  var imagesize = fileinfo.size;

  photodb.freeSpace(function(freespace) {
    // the edited image might take up more space on the disk, but
    // not all that much more
    if (freespace > imagesize * 2) {
      editPhoto(n);
    }
    else {
      alert(navigator.mozL10n.get('memorycardfull'));
    }
  });
}

function resizeHandler() {
  exposureSlider.resize();
  imageEditor.resize();
}

function editPhoto(n) {
  editedPhotoIndex = n;

  // Start with no edits
  editSettings = {
    crop: {
      x: 0, y: 0, w: files[n].metadata.width, h: files[n].metadata.height
    },
    gamma: 1,
    borderWidth: 0,
    borderColor: [0, 0, 0, 0]
  };

  // Start looking up the image file
  photodb.getFile(files[n].name, function(file) {
    // Once we get the file create a URL for it and use that url for the
    // preview image and all the buttons that need it.
    editedPhotoURL = URL.createObjectURL(file);

    // Create the image editor object
    // This has to come after setView or the canvas size is wrong.
    imageEditor = new ImageEditor(editedPhotoURL,
                                  $('edit-preview-area'),
                                  editSettings);

    // Configure the exposure tool as the first one shown
    setEditTool('exposure');

    // Set the exposure slider to its default value
    exposureSlider.setExposure(0);

    window.addEventListener('resize', resizeHandler);

    // Set the background for all of the image buttons
    var backgroundImage = 'url(' + editedPhotoURL + ')';
    editBgImageButtons.forEach(function(b) {
      b.style.backgroundImage = backgroundImage;
    });
  });

  // Display the edit screen
  setView(editView);

  // Set the default option buttons to correspond to those edits
  editOptionButtons.forEach(function(b) { b.classList.remove('selected'); });
  $('edit-crop-aspect-free').classList.add('selected');
  $('edit-effect-none').classList.add('selected');
  $('edit-border-none').classList.add('selected');
}

// Crop, Effect and border buttons call this
function editOptionsHandler() {
  // First, unhighlight all buttons in this group and then
  // highlight the button that has just been chosen. These
  // buttons have radio behavior
  var parent = this.parentNode;
  var buttons = parent.querySelectorAll('a.radio.button');
  Array.forEach(buttons, function(b) { b.classList.remove('selected'); });
  this.classList.add('selected');

  if (this === $('edit-crop-aspect-free'))
    imageEditor.setCropAspectRatio();
  else if (this === $('edit-crop-aspect-portrait'))
    imageEditor.setCropAspectRatio(2, 3);
  else if (this === $('edit-crop-aspect-landscape'))
    imageEditor.setCropAspectRatio(3, 2);
  else if (this === $('edit-crop-aspect-square'))
    imageEditor.setCropAspectRatio(1, 1);
  else if (this.dataset.effect) {
    editSettings.matrix = ImageProcessor[this.dataset.effect + '_matrix'];
    imageEditor.edit();
  }
  else {
    if (this.dataset.borderWidth) {
      editSettings.borderWidth = parseFloat(this.dataset.borderWidth);
    }
    if (this.dataset.borderColor === 'white') {
      editSettings.borderColor = [1, 1, 1, 1];
    }
    else if (this.dataset.borderColor === 'black') {
      editSettings.borderColor = [0, 0, 0, 1];
    }
    imageEditor.edit();
  }
}

/*
 * This is the exposure slider component for edit mode.  This ought to be
 * converted into a reusable slider module, but for now this is a
 * custom version that hardcodes things like the -3 to +3 range of values.
 */
var exposureSlider = (function() {
  var slider = document.getElementById('exposure-slider');
  var bar = document.getElementById('sliderline');
  var thumb = document.getElementById('sliderthumb');

  // prepare gesture detector for slider
  var gestureDetector = new GestureDetector(thumb);
  gestureDetector.startDetecting();

  thumb.addEventListener('pan', sliderDrag);
  thumb.addEventListener('swipe', function(e) {
    // when stopping we init the start to be at the current level
    // this way we avoid a 'panstart' event
    sliderStartExposure = currentExposure;
    e.preventDefault();
  });
  thumb.addEventListener('touchstart', function(e) {
    thumb.classList.add('active');
  });
  thumb.addEventListener('touchend', function(e) {
    thumb.classList.remove('active');
  });

  var currentExposure; // will be set by the initial setExposure call
  var sliderStartExposure = 0;

  function sliderDrag(e) {
    var delta = e.detail.absolute.dx;
    var exposureDelta = delta / parseInt(bar.clientWidth, 10) * 6;
    setExposure(sliderStartExposure + exposureDelta);
    e.preventDefault();
  }

  function resize() {
    forceSetExposure(currentExposure);
  }

  // Set the thumb position between -3 and +3
  function setExposure(exposure) {
    // Make sure it is not out of bounds
    if (exposure < -3)
      exposure = -3;
    else if (exposure > 3)
      exposure = 3;

    // Round to the closest .25
    exposure = Math.round(exposure * 4) / 4;

    if (exposure === currentExposure)
      return;

    forceSetExposure(exposure);
  }

  function forceSetExposure(exposure) {
    // Remove left/right 4 pixels of margin
    var barWidth = parseInt(bar.clientWidth, 10) - 4 * 2;
    var thumbWidth = parseInt(thumb.clientWidth, 10);
    var offset = bar.offsetLeft + 4;

    // Remember the new exposure value
    currentExposure = exposure;
    // Convert exposure value to a unit coefficient position of thumb center
    var unitCoef = (exposure + 3) / 6;

    // Convert unitCoef to pixel position of thumb center
    var pixel = offset + barWidth * unitCoef;

    // Compute pixel position of left edge of thumb
    pixel -= thumbWidth / 2;

    // Move the thumb to that position
    thumb.style.left = pixel + 'px';

    // Display exposure value in thumb
    thumb.textContent = exposure;

    // Dispatch an event to actually change the image
    slider.dispatchEvent(new Event('change', {bubbles: true}));
  }

  return {
    resize: resize,
    forceSetExposure: forceSetExposure,
    setExposure: setExposure,
    getExposure: function() { return currentExposure; }
  };
})();

$('exposure-slider').onchange = function() {
  var stops = exposureSlider.getExposure();

  // Convert the exposure compensation stops gamma correction value.
  var factor = -1;  // XXX: adjust this factor to get something reasonable.
  var gamma = Math.pow(2, stops * factor);
  editSettings.gamma = gamma;
  imageEditor.edit();
};

function setEditTool(tool) {
  // Deselect all tool buttons and hide all options
  var buttons = $('edit-toolbar').querySelectorAll('a.button');
  Array.forEach(buttons, function(b) { b.classList.remove('selected'); });
  var options = $('edit-options').querySelectorAll('div.edit-options-bar');
  Array.forEach(options, function(o) { o.classList.add('hidden'); });

  // If we were in crop mode, perform the crop and then
  // exit crop mode. If the user tapped the Crop button then we'll go
  // right back into crop mode, but this means that the Crop button both
  // acts as a mode switch button and a "do the crop now" button.
  imageEditor.cropImage(function() {
    imageEditor.hideCropOverlay();

    // Now select and show the correct set based on tool
    switch (tool) {
    case 'exposure':
      $('edit-exposure-button').classList.add('selected');
      $('exposure-slider').classList.remove('hidden');
      exposureSlider.forceSetExposure(exposureSlider.getExposure());
      break;
    case 'crop':
      $('edit-crop-button').classList.add('selected');
      $('edit-crop-options').classList.remove('hidden');
      imageEditor.edit(function() {
        imageEditor.showCropOverlay();
      });
      break;
    case 'effect':
      $('edit-effect-button').classList.add('selected');
      $('edit-effect-options').classList.remove('hidden');
      break;
    case 'border':
      $('edit-border-button').classList.add('selected');
      $('edit-border-options').classList.remove('hidden');
      break;
    }
  });
}

function undoCropHandler() {
  // Switch to free-form cropping
  Array.forEach($('edit-crop-options').querySelectorAll('a.radio.button'),
                function(b) { b.classList.remove('selected'); });
  $('edit-crop-aspect-free').classList.add('selected');
  imageEditor.setCropAspectRatio(); // freeform

  // And revert to full-size image
  imageEditor.undoCrop();
}

function exitEditMode(saved) {
  // Enables the save button once the edited image has been saved
  $('edit-save-button').disabled = false;

  // Revoke the blob URL we've been using
  URL.revokeObjectURL(editedPhotoURL);
  editedPhotoURL = null;

  // close the editor object
  imageEditor.destroy();
  imageEditor = null;

  window.removeEventListener('resize', resizeHandler);

  // we want the slider re-zeroed for the next time we come into the editor
  exposureSlider.forceSetExposure(0.0);

  // We came in to edit mode from fullscreenView.  If the user cancels the edit
  // go back to fullscreenView.  Otherwise, if the user saves the photo, we go
  // back to thumbnail list view because that is where the newly saved
  // image is going to show up.
  // XXX: this isn't really right. Ideally the new photo should show up
  // right next to the old one and we should go back to fullscreenView to view
  // the edited photo.
  if (saved) {
    currentFileIndex = 0; // because the saved image will be newest
    setView(thumbnailListView);
  }
  else
    showFile(currentFileIndex);
}

// When the user clicks the save button, we produce a full-size version
// of the edited image, save it into the media database and return to
// photo view mode.
// XXX: figure out what the image number of the edited photo is or will be
// and return to viewing that one.  Ideally, edited photos would be grouped
// with the original, rather than by date, but I'm not sure I can
// do that sort order.  Ideally, I'd like the mediadb to not generate a
// change event when we manually add something to it or at least have that
// option
function saveEditedImage() {
  // Save button disabled to prevent the user triggering multiple
  // save operations
  $('edit-save-button').disabled = true;

  // If we are in crop mode, perform the crop before saving
  if ($('edit-crop-button').classList.contains('selected'))
    imageEditor.cropImage();

  var progressBar = $('save-progress');
  // Show progressbar when start to save.
  progressBar.classList.remove('hidden');
  progressBar.value = 0;
  progressBar.max = 110; // Allow an extra 10% time for conversion to blob

  imageEditor.getFullSizeBlob('image/jpeg', gotBlob, onProgress);

  function onProgress(p) {
    progressBar.value = Math.floor(p * 100);
  }

  function gotBlob(blob) {
    // Hide progressbar when saved.
    progressBar.classList.add('hidden');
    var original = files[editedPhotoIndex].name;
    var basename, extension, filename;
    var version = 1;
    var p = original.lastIndexOf('.');
    if (p === -1) {
      basename = original;
      extension = '';
    }
    else {
      basename = original.substring(0, p);
      extension = original.substring(p);
    }

    // Create a filename for the edited image.  Loop if necessary and
    // increment the version number until we find a version a name that
    // is not in use.
    // XXX: this loop is O(n^2) and slow if the user saves many edits
    // of the same image.
    filename = basename + '.edit' + version + extension;
    while (files.some(function(i) { return i.name === filename; })) {
      version++;
      filename = basename + '.edit' + version + extension;
    }

    // Now that we have a filename, save the file This will send a
    // change event, which will cause us to rebuild our thumbnails.
    // For now, the edited image will become the first thumbnail since
    // it si the most recent one. Ideally, I'd like a more
    // sophisticated sort order that put edited sets of photos next to
    // each other.
    photodb.addFile(filename, blob);

    // We're done.
    exitEditMode(true);
    progressBar.value = 0;
  }
}


function createThumbnailFromSource(fullSizeImage, sourceRectangle,
                                    containerWidth, containerHeight, callback) {
  // Create a thumbnail image
  var canvas = document.createElement('canvas');
  var context = canvas.getContext('2d');

  // infer the thumbnailHeight such that the aspect ratio stays the same
  var scalex = containerWidth / sourceRectangle.w;
  var scaley = containerHeight / sourceRectangle.h;
  var scale = Math.min(Math.min(scalex, scaley), 1);

  var thumbnailWidth = Math.floor(sourceRectangle.w * scale);
  var thumbnailHeight = Math.floor(sourceRectangle.h * scale);

  canvas.width = thumbnailWidth;
  canvas.height = thumbnailHeight;
  // Draw that region of the image into the canvas, scaling it down
  context.drawImage(fullSizeImage, sourceRectangle.x, sourceRectangle.y,
                    sourceRectangle.w, sourceRectangle.h,
                    0, 0, thumbnailWidth, thumbnailHeight);

  canvas.toBlob(callback, 'image/jpeg');
  return scale;
}



/*
 * ImageEditor.js: simple image editing and previews in a <canvas> element.
 *
 * Display an edited version of the specified image in a <canvas> element
 * inside the specified container element. The image (or cropped region of
 * the image) will be displayed as large as possible within the container's
 * area.  Edits is an object that specifies the edits to apply to the image.
 * The edits object may include these properties:
 *
 *  gamma: a float specifying gamma correction
 *  matrix: a 4x4 matrix that represents a transformation of each rgba pixel.
 *    this can be used to convert to bw or sepia, for example.
 *  borderWidth: the size of the border as a fraction of the image width
 *  borderColor: a [r, g, b, a] array specifying border color
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
 *
 * This code expects WebGL GLSL shader programs in scripts with ids
 * edit-vertex-shader and edit-fragment-shader. It dynamically creates
 * canvas elements with ids edit-preview-canvas and edit-crop-canvas.
 * The stylesheet includes static styles to position those dyanamic elements.
 *
 * Bug 935273: if previewURL is passed then we're using the ImageEditor
 *  only to display a crop overlay. We avoid decoding the full-size
 *  image for as long as we can. Also, if we're only cropping then we
 *  can avoid all of the webgl stuff.
 */
function ImageEditor(imageURL, container, edits, ready, previewURL) {
  this.imageURL = imageURL;
  this.container = container;
  this.edits = edits || {};
  this.source = {};     // The source rectangle (crop region) of the image
  this.dest = {};       // The destination (preview) rectangle of canvas
  this.cropRegion = {}; // Region displayed in crop overlay during drags

  // The canvas that displays the preview

  this.previewCanvas = document.createElement('canvas');
  this.previewCanvas.id = 'edit-preview-canvas'; // for stylesheet
  this.container.appendChild(this.previewCanvas);
  this.previewCanvas.width = this.previewCanvas.clientWidth;
  this.previewCanvas.height = this.previewCanvas.clientHeight;

  // prepare gesture detector for ImageEditor
  this.gestureDetector = new GestureDetector(container);
  this.gestureDetector.startDetecting();

  // preset the scale to something useful in case resize() gets called
  // before generateNewPreview()
  this.scale = 1.0;

  var self = this;
  if (previewURL) {
    this.croponly = true;
    this.original = null;
    this.preview = new Image();
    this.preview.src = previewURL;
    this.preview.onload = function() {
      self.displayCropOnlyPreview();
      if (ready)
        ready();
    };
  }
  else {
    this.croponly = false;

    // Start loading the image into a full-size offscreen image
    this.original = new Image();
    this.original.src = imageURL;
    this.preview = new Image();
    this.preview.src = null;

    this.processor = new ImageProcessor(this.previewCanvas);

    // When the image loads display it
    this.original.onload = function() {
      // Initialize the crop region to the full size of the original image
      self.resetCropRegion();
      self.resetPreview();

      // Display an edited preview of it
      self.edit(function() {
        // If the constructor had a ready callback argument, call it now
        if (ready)
          ready();
      });

    };
  }
}

ImageEditor.prototype.displayCropOnlyPreview = function() {
  var previewContext = this.previewCanvas.getContext('2d');

  var scalex = this.previewCanvas.width / this.preview.width;
  var scaley = this.previewCanvas.height / this.preview.height;
  var scale = Math.min(Math.min(scalex, scaley), 1);

  var previewWidth = Math.floor(this.preview.width * scale);
  var previewHeight = Math.floor(this.preview.height * scale);
  var previewX = Math.floor((this.previewCanvas.width - previewWidth) / 2);
  var previewY =
    Math.floor((this.previewCanvas.height - previewHeight) / 2);

  previewContext.drawImage(this.preview,
                           previewX, previewY,
                           previewWidth, previewHeight);

  this.scale = scale;
  this.dest.x = previewX;
  this.dest.y = previewY;
  this.dest.w = previewWidth;
  this.dest.h = previewHeight;
};

ImageEditor.prototype.generateNewPreview = function(callback) {
  var self = this;
  this.scale = createThumbnailFromSource(this.original,
    this.source, this.previewCanvas.width, this.previewCanvas.height,
    function(thumbnail) {
      self.preview.src = URL.createObjectURL(thumbnail);
      self.preview.onload = function() {
        callback();
      };
    }
  );
};

ImageEditor.prototype.resetPreview = function() {
  if (this.preview.src) {
    URL.revokeObjectURL(this.preview.src);
    this.preview.removeAttribute('src');
  }
};

ImageEditor.prototype.resize = function() {
  var self = this;
  var canvas = this.previewCanvas;
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;

  // Save the crop region (scaled up to full image dimensions)
  var savedCropRegion = {};
  var hadCropOverlay = this.isCropOverlayShown();
  if (hadCropOverlay) {
    savedCropRegion.left = this.cropRegion.left / this.scale;
    savedCropRegion.top = this.cropRegion.top / this.scale;
    savedCropRegion.right = this.cropRegion.right / this.scale;
    savedCropRegion.bottom = this.cropRegion.bottom / this.scale;
    this.hideCropOverlay();
  }

  // Now update the preview image. This is done differently in the
  // croponly case and in the regular image editing case
  if (this.croponly) {
    this.displayCropOnlyPreview();
    restoreCropRegion();
  }
  else {
    this.resetPreview();
    this.edit(restoreCropRegion);
  }

  // Restore the crop region to what it was before the resize
  function restoreCropRegion() {
    if (hadCropOverlay) {
      // showCropOverlay normally resets cropRegion to the full extent,
      // so we need to pass in a new crop region to use
      var newRegion = {};
      newRegion.left = Math.floor(savedCropRegion.left * self.scale);
      newRegion.top = Math.floor(savedCropRegion.top * self.scale);
      newRegion.right = Math.floor(savedCropRegion.right * self.scale);
      newRegion.bottom = Math.floor(savedCropRegion.bottom * self.scale);
      self.showCropOverlay(newRegion);
    }
  }
};

ImageEditor.prototype.destroy = function() {
  if (!this.croponly) {
    this.processor.destroy();
    this.resetPreview();
    this.preview = null;
  }

  if (this.original) {
    this.original.src = '';
    this.original = null;
  }

  this.container.removeChild(this.previewCanvas);
  this.previewCanvas = null;
  this.hideCropOverlay();
  this.gestureDetector.stopDetecting();
  this.gestureDetector = null;
};

// Preview the image with the specified edits applyed. If edits is omitted,
// displays the original image. Clients should call this function when the
// desired edits change or when the size of the container changes (on
// orientation change events, for example)
ImageEditor.prototype.edit = function(callback) {
  if (!this.preview.src) {
    var self = this;
    this.generateNewPreview(function() {self.finishEdit(callback);});
  } else {
    this.finishEdit(callback);
  }
};

ImageEditor.prototype.finishEdit = function(callback) {
  var canvas = this.previewCanvas;
  var xOffset = Math.floor((canvas.width - this.preview.width) / 2);
  var yOffset = Math.floor((canvas.height - this.preview.height) / 2);

  this.dest.x = xOffset;
  this.dest.y = yOffset;
  this.dest.w = this.preview.width;
  this.dest.h = this.preview.height;

  var borderWidth = Math.ceil(this.edits.borderWidth * this.dest.w);
  this.edits.borderLeftWidth = borderWidth;
  this.edits.borderRightWidth = borderWidth;
  this.edits.borderTopWidth = borderWidth;
  this.edits.borderBottomWidth = borderWidth;

  this.processor.draw(this.preview,
                      0, 0, this.preview.width, this.preview.height,
                      this.dest.x, this.dest.y, this.dest.w, this.dest.h,
                      this.edits);
  if (callback) {
    callback();
  }
};

// Apply the edits offscreen and pass the full-size edited image as a blob
// to the specified callback function. The code here is much like the
// code above in edit().
//
// This function releases the this.original image so you should only call
// it to get the edited image when you are done with the ImageEditor.
//
ImageEditor.prototype.getFullSizeBlob = function(type, done, progress) {
  const TILE_SIZE = 1024;
  var self = this;

  // Create an offscreen canvas and copy the image into it
  var canvas = document.createElement('canvas');
  canvas.width = this.source.w; // "full size" is cropped image size
  canvas.height = this.source.h;
  var context = canvas.getContext('2d');
  context.drawImage(this.original,
                    this.source.x, this.source.y, this.source.w, this.source.h,
                    0, 0, this.source.w, this.source.h);

  // As soon as we've copied the original image into the canvas we are
  // done with the original and should release it to reduce memory usage.
  this.original.src = '';

  // How many pixels do we have to process? How many have we processed so far?
  var total_pixels = canvas.width * canvas.height;
  var processed_pixels = 0;

  function makeTileList(imageWidth, imageHeight, tileWidth, tileHeight) {
    var tiles = [];
    var x = 0, y = 0;
    while (y < imageHeight) {
      x = 0;
      while (x < imageWidth) {
        var tile = {x: x, y: y, w: tileWidth, h: tileHeight};
        if (x + tileWidth > imageWidth)
          tile.w = imageWidth - x;
        if (y + tileHeight > imageHeight)
          tile.h = imageHeight - y;
        tiles.push(tile);
        x += tileWidth;
      }
      y += tileHeight;
    }
    return tiles;
  }

  // Create a smaller tile canvas.
  var tile = document.createElement('canvas');
  tile.width = tile.height = TILE_SIZE;

  // Create an ImageProcessor object that renders into the tile.
  var processor = new ImageProcessor(tile);

  // Divide the image into a set of tiled rectangles
  var rectangles = makeTileList(this.source.w, this.source.h,
                                tile.width, tile.height);

  var borderWidth = Math.ceil(this.edits.borderWidth * this.source.w);

  processNextTile();

  // Process one tile of the original image, copy the processed tile
  // to the full-size canvas, and then return to the event queue.
  function processNextTile() {
    var rect = rectangles.shift();

    // Set the borders for this tile
    self.edits.borderTopWidth =
      (rect.y === 0) ? borderWidth : 0;
    self.edits.borderBottomWidth =
      (rect.y + rect.h === self.source.h) ? borderWidth : 0;
    self.edits.borderLeftWidth =
      (rect.x === 0) ? borderWidth : 0;
    self.edits.borderRightWidth =
      (rect.x + rect.w === self.source.w) ? borderWidth : 0;

    // Get the input pixels for this tile
    var pixels = context.getImageData(rect.x, rect.y, rect.w, rect.h);

    var centerX = Math.floor((tile.width - rect.w) / 2);
    var centerY = Math.floor((tile.height - rect.h) / 2);

    // Edit the pixels and draw them to the tile
    processor.draw(pixels,
                   0, 0, rect.w, rect.h,
                   centerX, centerY, rect.w, rect.h,
                   self.edits);

    // Copy the edited pixels from the tile back to the canvas
    context.drawImage(tile,
                      centerX, centerY, rect.w, rect.h,
                      rect.x, rect.y, rect.w, rect.h);

    processed_pixels += rect.w * rect.h;
    if (progress)
      progress(processed_pixels / total_pixels);

    if (rectangles.length) {
      // If we're not done yet return to the event loop,
      // and process the next tile soon.
      setTimeout(processNextTile);
    }
    else {      // Otherwise we are done.
      // The processed image is in our offscreen canvas, so we don't need
      // the WebGL stuff anymore.
      processor.destroy();
      tile.width = tile.height = 0;
      processor = tile = null;

      // Now get the canvas contents as a file and pass to the callback
      canvas.toBlob(function(blobData) {
        // Now that we've got the blob, we don't need the canvas anymore
        canvas.width = canvas.height = 0;
        canvas = null;
        // Pass the blob to the callback
        done(blobData);
      }, type);
    }
  }
};

ImageEditor.prototype.isCropOverlayShown = function() {
  return this.cropCanvas;
};

// Returns true if the crop region is anything different than the
// entire dest rectangle. If this method returns false, there is no
// need to call getCroppedRegionBlob().
ImageEditor.prototype.hasBeenCropped = function() {
  return (this.cropRegion.left !== 0 ||
          this.cropRegion.top !== 0 ||
          this.cropRegion.right !== this.dest.w ||
          this.cropRegion.bottom !== this.dest.h);
};

// Display cropping controls
// XXX: have to handle rotate/resize
ImageEditor.prototype.showCropOverlay = function showCropOverlay(newRegion) {
  var self = this;

  var canvas = this.cropCanvas = document.createElement('canvas');
  var context = this.cropContext = canvas.getContext('2d');
  canvas.id = 'edit-crop-canvas'; // for stylesheet
  this.container.appendChild(canvas);

  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;

  // Crop handle styles
  context.translate(15, 15);
  context.lineCap = 'round';
  // XXX
  // Please turn on the followig line when Bug 937529 is fixed. This is an
  // workaround to have active handles drawn.
  // context.lineJoin = 'round';
  context.strokeStyle = 'rgba(255,255,255,.75)';

  // Start off with a crop region that is the one passed in, if it is not null.
  // Otherwise, it should be the entire preview canvas
  if (newRegion) {
    var region = this.cropRegion;
    region.left = newRegion.left;
    region.top = newRegion.top;
    region.right = newRegion.right;
    region.bottom = newRegion.bottom;
  } else {
    var region = this.cropRegion;
    region.left = 0;
    region.top = 0;
    region.right = this.dest.w;
    region.bottom = this.dest.h;
  }

  this.drawCropControls();

  var isCropping = false;
  this.cropCanvas.addEventListener('pan', function(ev) {
    if (!isCropping) {
      self.cropStart(ev);
      isCropping = true;
    }
  });
  this.cropCanvas.addEventListener('swipe', function() {
    isCropping = false;
  });
};

ImageEditor.prototype.hideCropOverlay = function hideCropOverlay() {
  if (this.isCropOverlayShown()) {
    this.container.removeChild(this.cropCanvas);
    this.cropCanvas.width = 0;
    this.cropCanvas = this.cropContext = null;
  }
};

// Reset image to full original size
ImageEditor.prototype.resetCropRegion = function resetCropRegion() {
  this.source.x = 0;
  this.source.y = 0;
  this.source.w = this.original.width;
  this.source.h = this.original.height;

};

ImageEditor.prototype.drawCropControls = function(handle) {
  var canvas = this.cropCanvas;
  var context = this.cropContext;
  var region = this.cropRegion;
  var dest = this.dest;
  var left = region.left + dest.x;
  var top = region.top + dest.y;
  var right = region.right + dest.x;
  var bottom = region.bottom + dest.y;
  var centerX = (left + right) / 2;
  var centerY = (top + bottom) / 2;
  var width = right - left;
  var height = bottom - top;

  // Erase everything
  context.clearRect(-15, -15, canvas.width, canvas.height);

  // Overlay the preview canvas with translucent gray
  context.fillStyle = 'rgba(0, 0, 0, .5)';
  context.fillRect(dest.x, dest.y, dest.w, dest.h);

  // Clear a rectangle so interior of the crop region shows through
  context.clearRect(left, top, width, height);

  // Draw a border around the crop region
  context.lineWidth = 1;
  context.strokeRect(left, top, width, height);

  // Draw the drag handles in the corners of the crop region
  context.lineWidth = 4;
  context.beginPath();

  // N
  context.moveTo(centerX - 23, top - 1);
  context.lineTo(centerX + 23, top - 1);

  // E
  context.moveTo(right + 1, centerY - 23);
  context.lineTo(right + 1, centerY + 23);

  // S
  context.moveTo(centerX - 23, bottom + 1);
  context.lineTo(centerX + 23, bottom + 1);

  // W
  context.moveTo(left - 1, centerY - 23);
  context.lineTo(left - 1, centerY + 23);

  // Don't draw the corner handles if there is an aspect ratio we're maintaining
  if (!this.cropAspectWidth) {
    // NE
    context.moveTo(right - 23, top - 1);
    context.lineTo(right + 1, top - 1);
    context.lineTo(right + 1, top + 23);

    // SE
    context.moveTo(right + 1, bottom - 23);
    context.lineTo(right + 1, bottom + 1);
    context.lineTo(right - 23, bottom + 1);

    // SW
    context.moveTo(left + 23, bottom + 1);
    context.lineTo(left - 1, bottom + 1);
    context.lineTo(left - 1, bottom - 23);

    // NW
    context.moveTo(left - 1, top + 23);
    context.lineTo(left - 1, top - 1);
    context.lineTo(left + 23, top - 1);
  }

  // Draw all the handles at once
  context.stroke();

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

    context.beginPath();
    context.arc(cx, cy, 25, 0, 2 * Math.PI);
    context.fillStyle = 'rgba(255,255,255,.5)';
    context.lineWidth = 1;
    context.fill();
  }
};

// Called when the first pan event comes in on the crop canvas
ImageEditor.prototype.cropStart = function(ev) {
  var self = this;
  var region = this.cropRegion;
  var dest = this.dest;
  var rect = this.previewCanvas.getBoundingClientRect();
  var x0 = ev.detail.position.screenX - rect.left - dest.x;
  var y0 = ev.detail.position.screenY - rect.top - dest.y;
  var left = region.left;
  var top = region.top;
  var right = region.right;
  var bottom = region.bottom;
  var aspectRatio = this.cropAspectWidth ?
    this.cropAspectWidth / this.cropAspectHeight :
    0;
  var centerX = (region.left + region.right) / 2;
  var centerY = (region.top + region.bottom) / 2;

  // Return true if (x0,y0) is within 25 pixels of (x,y)
  function hit(x, y) {
    return (x0 > x - 25 && x0 < x + 25 &&
            y0 > y - 25 && y0 < y + 25);
  }

  if (hit((left + right) / 2, top))
    drag('n');
  else if (hit(right, (top + bottom) / 2))
    drag('e');
  else if (hit((left + right) / 2, bottom))
    drag('s');
  else if (hit(left, (top + bottom) / 2))
    drag('w');
  else if (!aspectRatio) {
    if (hit(right, top))
      drag('ne');
    else if (hit(right, bottom))
      drag('se');
    else if (hit(left, bottom))
      drag('sw');
    else if (hit(left, top))
      drag('nw');
    else
      drag(); // with no argument, do a pan instead of a drag
  }
  else
    drag(); // pan

  function drag(handle) {
    window.addEventListener('pan', move, true);
    window.addEventListener('swipe', up, true);

    self.drawCropControls(handle); // highlight drag handle

    function move(e) {
      var dx = e.detail.absolute.dx;
      var dy = e.detail.absolute.dy;

      var newleft = region.left;
      var newright = region.right;
      var newtop = region.top;
      var newbottom = region.bottom;

      if (!handle) {
        pan(dx, dy);
        return;
      }

      switch (handle) {
      case 'n':
        newtop = top + dy;
        break;
      case 'ne':
        newright = right + dx;
        newtop = top + dy;
        break;
      case 'e':
        newright = right + dx;
        break;
      case 'se':
        newright = right + dx;
        newbottom = bottom + dy;
        break;
      case 's':
        newbottom = bottom + dy;
        break;
      case 'sw':
        newleft = left + dx;
        newbottom = bottom + dy;
        break;
      case 'w':
        newleft = left + dx;
        break;
      case 'nw':
        newleft = left + dx;
        newtop = top + dy;
        break;
      }

      // If there is an aspect ratio, make sure we maintain it.
      // Note that if there is an aspect ratio we won't display
      // the corner drag handles, so we don't have to handle those.
      if (aspectRatio) {
        var width, height;
        switch (handle) {
        case 'n':
        case 's':
          // change width to match the new height, keeping the center still
          height = newbottom - newtop;
          width = height * aspectRatio;
          newleft = Math.floor(centerX - Math.floor(width / 2));
          newright = Math.ceil(centerX + Math.ceil(width / 2));
          break;
        case 'e':
        case 'w':
          // Change height to match new width, keeping center still
          width = newright - newleft;
          height = width / aspectRatio;
          newtop = Math.floor(centerY - Math.floor(height / 2));
          newbottom = Math.ceil(centerY + Math.ceil(height / 2));
          break;
        }
      }

      // Now if the new region is out of bounds then bail out without
      // changing the region at all and ignore this move event
      if (newtop < 0 || newleft < 0 ||
          newright > dest.w || newbottom > dest.h)
        return;

      // Don't let the crop region become smaller than 100x100. If it does
      // then the sensitive regions of the crop handles start to intersect.
      // If there is a cropping aspect ratio, then the minimum size in
      // one dimension will be 100 and will be larger in the other.
      var minWidth = 100, minHeight = 100;
      if (aspectRatio) {
        if (aspectRatio > 1)
          minWidth = Math.round(minWidth * aspectRatio);
        else if (aspectRatio < 1)
          minHeight = Math.round(minHeight / aspectRatio);
      }

      // if the width is less than the minimum allowed (due to orientation
      // change), only allow the crop region to get bigger
      var newWidth = newright - newleft;
      if ((newWidth < (region.right - region.left)) && (newWidth < minWidth))
        return;
      var newHeight = newbottom - newtop;
      if ((newHeight < (region.bottom - region.top)) && (newHeight < minHeight))
        return;

      // Otherwise, all is well, so update the crop region and redraw
      region.left = newleft;
      region.right = newright;
      region.top = newtop;
      region.bottom = newbottom;

      self.drawCropControls(handle);
    }

    function pan(dx, dy) {
      if (dx > 0)
        dx = Math.min(dx, dest.w - right);
      if (dx < 0)
        dx = Math.max(dx, -left);
      if (dy > 0)
        dy = Math.min(dy, dest.h - bottom);
      if (dy < 0)
        dy = Math.max(dy, -top);

      region.left = left + dx;
      region.right = right + dx;
      region.top = top + dy;
      region.bottom = bottom + dy;

      self.drawCropControls();
    }

    function up(e) {
      window.removeEventListener('pan', move, true);
      window.removeEventListener('swipe', up, true);
      self.drawCropControls(); // erase drag handle highlight

      e.preventDefault();
    }
  }

};

// If the crop overlay is displayed, use the current position of the
// overlaid crop region to actually set the crop region of the original image
ImageEditor.prototype.cropImage = function(callback) {
  if (!this.isCropOverlayShown()) {
    if (callback) {
      callback();
    }
    return;
  }

  var region = this.cropRegion;
  var dest = this.dest;

  // Convert the preview crop region to fractions
  var left = region.left / dest.w;
  var right = region.right / dest.w;
  var top = region.top / dest.h;
  var bottom = region.bottom / dest.h;

  // Now convert those fractions to pixels in the original image
  // Note that the original image may have already been cropped, so we
  // multiply by the size of the crop region, not the full size
  left = Math.floor(left * this.source.w);
  right = Math.ceil(right * this.source.w);
  top = Math.floor(top * this.source.h);
  bottom = Math.floor(bottom * this.source.h);

  // XXX: tweak these to make sure we still have the right aspect ratio
  // after rounding to pixels
  console.error('Maintain aspect ratio precisely!!!');

  // And update the real crop region
  this.source.x += left;
  this.source.y += top;
  this.source.w = right - left;
  this.source.h = bottom - top;

  this.resetPreview();
  // Adjust the image
  var self = this;
  this.edit(function() {
    // Hide and reshow the crop overlay to reset it to match the new image size
    self.hideCropOverlay();
    self.showCropOverlay();
    if (callback) {
      callback();
    }
  });
};

// Restore the image to its full original size
ImageEditor.prototype.undoCrop = function() {
  this.resetCropRegion();
  this.resetPreview();
  var self = this;
  this.edit(function() {
    // Hide and reshow the crop overlay to reset it to match the new image size
    self.hideCropOverlay();
    self.showCropOverlay();
  });
};

// Pass no arguments for freeform 1,1 for square,
// 2,3 for portrait, 3,2 for landscape.
ImageEditor.prototype.setCropAspectRatio = function(ratioWidth, ratioHeight) {
  var region = this.cropRegion;
  var dest = this.dest;

  this.cropAspectWidth = ratioWidth || 0;
  this.cropAspectHeight = ratioHeight || 0;

  if (ratioWidth && ratioHeight) {
    // Constrained cropping, centered on image
    var centerX = dest.w / 2;
    var centerY = dest.h / 2;

    var scaleX = dest.w / ratioWidth;
    var scaleY = dest.h / ratioHeight;
    var scale = Math.min(scaleX, scaleY);

    var width = Math.floor(scale * ratioWidth);
    var height = Math.floor(scale * ratioHeight);

    region.left = centerX - width / 2;
    region.right = centerX + width / 2;
    region.top = centerY - height / 2;
    region.bottom = centerY + height / 2;
  }
  else {
    // Freeform cropping
    region.left = 0;
    region.top = 0;
    region.right = dest.w;
    region.bottom = dest.h;
  }
  this.drawCropControls();
};

// Get the pixels of the selected crop region, and resize them if width
// and height are specifed, encode them as an image file of the specified
// type and pass that file as a blob to the specified callback
ImageEditor.prototype.getCroppedRegionBlob = function(type,
                                                      width, height,
                                                      callback)
{
  // This is similar to the code in cropImage() and getFullSizeBlob
  // but since we're doing only cropping and no pixel manipulation I
  // don't need to create an ImageProcessor object.

  // If we're only doing cropping and no editing, then we haven't
  // decoded the original image yet, so we have to do that now.
  var self = this;
  if (this.croponly) {
    this.original = new Image();
    this.original.src = this.imageURL;
    this.original.onload = function() {
      self.source.x = 0;
      self.source.y = 0;
      self.source.w = self.original.width;
      self.source.h = self.original.height;
      finish();
    };
  }
  else {
    finish();
  }

  function finish() {
    // Compute the rectangle of the original image that the user selected
    var region = self.cropRegion;
    var dest = self.dest;

    // Convert the preview crop region to fractions
    var left = region.left / dest.w;
    var right = region.right / dest.w;
    var top = region.top / dest.h;
    var bottom = region.bottom / dest.h;

    // Now convert those fractions to pixels in the original image
    // Note that the original image may have already been cropped, so we
    // multiply by the size of the crop region, not the full size
    left = Math.floor(left * self.source.w);
    right = Math.ceil(right * self.source.w);
    top = Math.floor(top * self.source.h);
    bottom = Math.floor(bottom * self.source.h);

    // If no destination size was specified, use the source size
    if (!width || !height) {
      width = right - left;
      height = bottom - top;
    }

    // Create a canvas of the desired size
    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    var context = canvas.getContext('2d');

    // Copy that rectangle to our canvas
    context.drawImage(self.original,
                      left, top, right - left, bottom - top,
                      0, 0, width, height);

    canvas.toBlob(callback, type);
  }
};

//
// Create a new ImageProcessor object for the specified canvas to do
// webgl transformations on an image.  Expects its shader programs to be in
// <script> elements with ids 'edit-vertex-shader' and 'edit-fragment-shader'.
//
function ImageProcessor(canvas) {
  // WebGL context for the canvas
  this.canvas = canvas;
  var options = { depth: false, stencil: false, antialias: false };
  var gl = this.context =
    canvas.getContext('webgl', options) ||
    canvas.getContext('experimental-webgl', options);

  // Define our shader programs
  var vshader = this.vshader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vshader, ImageProcessor.vertexShader);
  gl.compileShader(vshader);
  if (!gl.getShaderParameter(vshader, gl.COMPILE_STATUS)) {
    var error = new Error('Error compiling vertex shader:' +
                          gl.getShaderInfoLog(vshader));
    gl.deleteShader(vshader);
    throw error;
  }

  var fshader = this.fshader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fshader, ImageProcessor.fragmentShader);
  gl.compileShader(fshader);
  if (!gl.getShaderParameter(fshader, gl.COMPILE_STATUS)) {
    var error = new Error('Error compiling fragment shader:' +
                          gl.getShaderInfoLog(fshader));
    gl.deleteShader(fshader);
    throw error;
  }

  var program = this.program = gl.createProgram();
  gl.attachShader(program, vshader);
  gl.attachShader(program, fshader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    var error = new Error('Error linking GLSL program:' +
                          gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    throw error;
  }
  gl.useProgram(program);

  // Create a texture to hold the source image once we have one
  this.sourceTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  // Create buffers to hold the input and output rectangles
  this.sourceRectangle = gl.createBuffer();
  this.destinationRectangle = gl.createBuffer();

  // Look up the addresses of the program's input variables
  this.srcPixelAddress = gl.getAttribLocation(program, 'src_pixel');
  this.destPixelAddress = gl.getAttribLocation(program, 'dest_pixel');
  this.canvasSizeAddress = gl.getUniformLocation(program, 'canvas_size');
  this.imageSizeAddress = gl.getUniformLocation(program, 'image_size');
  this.destSizeAddress = gl.getUniformLocation(program, 'dest_size');
  this.destOriginAddress = gl.getUniformLocation(program, 'dest_origin');
  this.matrixAddress = gl.getUniformLocation(program, 'matrix');
  this.gammaAddress = gl.getUniformLocation(program, 'gamma');

  this.borderLeftWidthAddress =
    gl.getUniformLocation(program, 'border_left_width');
  this.borderRightWidthAddress =
    gl.getUniformLocation(program, 'border_right_width');
  this.borderTopWidthAddress =
    gl.getUniformLocation(program, 'border_top_width');
  this.borderBottomWidthAddress =
    gl.getUniformLocation(program, 'border_bottom_width');
  this.borderColorAddress = gl.getUniformLocation(program, 'border_color');
}

// Destroy all the stuff we allocated
ImageProcessor.prototype.destroy = function() {
  var gl = this.context;
  this.context = null; // Don't retain a reference to it
  gl.deleteShader(this.vshader);
  gl.deleteShader(this.fshader);
  gl.deleteProgram(this.program);
  gl.deleteTexture(this.sourceTexture);
  gl.deleteBuffer(this.sourceRectangle);
  gl.deleteBuffer(this.destinationRectangle);
  gl.viewport(0, 0, 0, 0);
};

ImageProcessor.prototype.draw = function(image,
                                         sx, sy, sw, sh,
                                         dx, dy, dw, dh,
                                         options)
{
  var gl = this.context;
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

  // Set the canvas size and image size
  gl.uniform2f(this.canvasSizeAddress, this.canvas.width, this.canvas.height);
  gl.uniform2f(this.imageSizeAddress, image.width, image.height);
  gl.uniform2f(this.destOriginAddress, dx, dy);
  gl.uniform2f(this.destSizeAddress, dw, dh);

  // Set the gamma correction
  var gammaArray;
  if (options.gamma)
    gl.uniform4f(this.gammaAddress,
                 options.gamma, options.gamma, options.gamma, options.gamma);
  else
    gl.uniform4f(this.gammaAddress, 1, 1, 1, 1);

  // Set the color transformation
  gl.uniformMatrix4fv(this.matrixAddress, false,
                      options.matrix || ImageProcessor.IDENTITY_MATRIX);

  // Set border size and color
  gl.uniform1f(this.borderLeftWidthAddress, options.borderLeftWidth || 0);
  gl.uniform1f(this.borderRightWidthAddress, options.borderRightWidth || 0);
  gl.uniform1f(this.borderTopWidthAddress, options.borderTopWidth || 0);
  gl.uniform1f(this.borderBottomWidthAddress, options.borderBottomWidth || 0);

  gl.uniform4fv(this.borderColorAddress, options.borderColor || [0, 0, 0, 0]);

  // Define the source rectangle
  makeRectangle(this.sourceRectangle, sx, sy, sw, sh);
  gl.enableVertexAttribArray(this.srcPixelAddress);
  gl.vertexAttribPointer(this.srcPixelAddress, 2, gl.FLOAT, false, 0, 0);

  // Load the image into the texture
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

  // Define the destination rectangle we're copying the image into
  makeRectangle(this.destinationRectangle, dx, dy, dw, dh);
  gl.enableVertexAttribArray(this.destPixelAddress);
  gl.vertexAttribPointer(this.destPixelAddress, 2, gl.FLOAT, false, 0, 0);

  // And draw it all
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  // Define a rectangle as two triangles
  function makeRectangle(b, x, y, w, h) {
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      x, y, x + w, y, x, y + h,         // one triangle
      x, y + h, x + w, y, x + w, y + h  // another triangle
    ]), gl.STATIC_DRAW);
  }
};

ImageProcessor.vertexShader =
  'attribute vec2 src_pixel;\n' +  // pixel position in the image
  'attribute vec2 dest_pixel;\n' + // pixel position on the canvas
  'uniform vec2 canvas_size;\n' +  // size of destination canvas in pixels
  'uniform vec2 image_size;\n' +   // size of source image in pixels
  'varying vec2 src_position;\n' + // pass image position to the fragment shader
  'void main() {\n' +
  '  gl_Position = vec4(((dest_pixel/canvas_size)*2.0-1.0)*vec2(1,-1),0,1);\n' +
  '  src_position = src_pixel / image_size;\n' +
  '}';

ImageProcessor.fragmentShader =
  'precision mediump float;\n' +
  'uniform sampler2D image;\n' +
  'uniform float border_left_width;\n' +
  'uniform float border_right_width;\n' +
  'uniform float border_top_width;\n' +
  'uniform float border_bottom_width;\n' +
  'uniform vec4 border_color;\n' +
  'uniform vec2 dest_size;\n' +    // size of the destination rectangle
  'uniform vec2 dest_origin;\n' +  // upper-left corner of destination rectangle
  'uniform vec4 gamma;\n' +
  'uniform mat4 matrix;\n' +
  'varying vec2 src_position;\n' + // from the vertex shader
  'void main() {\n' +
  // Use border color if we're over the border
  '  if (gl_FragCoord.x < dest_origin.x + border_left_width ||\n' +
  '      gl_FragCoord.y < dest_origin.y + border_bottom_width ||\n' +
  '      gl_FragCoord.x > dest_origin.x + dest_size.x-border_right_width ||\n' +
  '      gl_FragCoord.y > dest_origin.y + dest_size.y - border_top_width) {\n' +
  '    gl_FragColor = border_color;\n' +
  '    return;\n' +
  '  }\n' +
  // Otherwise take the image color, apply gamma correction and
  // the color manipulation matrix.
  '  vec4 color = texture2D(image, src_position);\n' +
  '  gl_FragColor = pow(color, gamma) * matrix;\n' +
  '}';

ImageProcessor.IDENTITY_MATRIX = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1
];

ImageProcessor.none_matrix = ImageProcessor.IDENTITY_MATRIX;

ImageProcessor.sepia_matrix = [
  0.393, 0.769, 0.189, 0,
  0.349, 0.686, 0.168, 0,
  0.272, 0.534, 0.131, 0,
  0, 0, 0, 1
];

ImageProcessor.bw_matrix = [
  .65, .25, .10, 0,
  .65, .25, .10, 0,
  .65, .25, .10, 0,
  0, 0, 0, 1
];

ImageProcessor.bluesteel_matrix = [
  1, .25, .65, 0,
  .1, 1, .65, 0,
  .1, .25, 1, .1,
  0, 0, 0, 1
];

ImageProcessor.faded_matrix = [
  1, .2, .2, .03,
  .2, .7, .2, .05,
  .1, 0, .8, 0,
  0, 0, 0, 1
];
