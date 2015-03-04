// This file contains Gallery code for editing images
'use strict';

var editedPhotoURL; // The blob URL of the photo we're currently editing
var editSettings; // Settings object to perform edits and initialize the UI
var imageEditor;
var currentEditTool;
var savedEditSettings; // Object to save editSettings before entering edit tool

var editOptionButtons =
  Array.slice($('edit-options').querySelectorAll('a.radio.button'), 0);

var editBgImageButtons =
  Array.slice($('edit-options').querySelectorAll('a.bgimage.button'), 0);

// Edit mode event handlers
$('edit-exposure-button').onclick = setEditTool.bind(null, 'exposure');
$('edit-crop-button').onclick = setEditTool.bind(null, 'crop');
$('edit-effect-button').onclick = setEditTool.bind(null, 'effect');
$('edit-enhance-button').onclick = setEditTool.bind(null, 'enhance');
$('edit-crop-none').onclick = undoCropHandler;
$('edit-header').addEventListener('action', onCancelButton);
$('edit-tool-apply-button').onclick = applyEditTool;
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

function localizeHandler() {
  // If the locale changes while user is using exposure edit option,
  // then we need to re-position slider thumb for respective locale.
  exposureSlider.forceSetExposure(exposureSlider.getExposure());
}

function editPhoto(n) {
  editedPhotoIndex = n;
  var metadata = files[n].metadata;

  editSettings = {
    crop: {
      x: 0, y: 0, w: metadata.width, h: metadata.height,
      cropModeId: 'edit-crop-aspect-free' // selected crop mode element Id
    },
    exposure: {
      sliderThumbPos: 0, // Slider thumb position
      gamma: 1
    },
    effect: {
      effectId: 'edit-effect-none', // selected effect mode element id
      matrix: ImageProcessor.IDENTITY_MATRIX
    },
    enhance: {
      rgbMinMaxValues: ImageProcessor.default_enhancement
    },
    isImageEdited: false // flag to store if first edit has occurred
  };

  // Start looking up the image file
  photodb.getFile(files[n].name, gotFile);

  function gotFile(file) {
    // The image editor does not handle EXIF rotation, so if the image has
    // EXIF orientation flags, we alter the image in place before starting
    // to edit it. Similarly, if the image is too big for us to decode at
    // full size we need to create a downsampled version that is editable.
    // For low-memory devices like Tarako, CONFIG_MAX_EDIT_PIXEL_SIZE will
    // be set to a non-zero value, and this may cause us to downsample the
    // image even further than we would otherwise.
    var imagesize = metadata.width * metadata.height;
    var maxsize = CONFIG_MAX_EDIT_PIXEL_SIZE || CONFIG_MAX_IMAGE_PIXEL_SIZE;

    if (metadata.rotation || metadata.mirrored || imagesize > maxsize) {
      Spinner.show();
      cropResizeRotate(file, null, maxsize || null,
                       null, metadata,
                       function(error, rotatedBlob) {
                         Spinner.hide();
                         if (error) {
                           console.error('Error while rotating image:', error);
                           rotatedBlob = file;
                         }
                         startEdit(rotatedBlob);
                       });
    }
    else {
      startEdit(file);
    }
  }

  // This will be called with the file the user is editing or with a rotated
  // version of that file
  function startEdit(blob) {
    // Create the image editor object
    // This has to come after setView or the canvas size is wrong.
    imageEditor = new ImageEditor(blob,
                                  $('edit-preview-area'),
                                  editSettings);
    // Show editor screen and hide edit tool screen
    hideEditToolView();
    currentEditTool = null;

    // Set auto enhance icon to default off state
    var editEnhanceButton = $('edit-enhance-button');
    editEnhanceButton.setAttribute('aria-pressed', false);
    editEnhanceButton.classList.remove('on');
    // Set edit screen header title
    $('edit-title').setAttribute('data-l10n-id', 'edit');
    // Disable save and edit tool apply button until an edit is applied
    $('edit-save-button').disabled = true;
    $('edit-tool-apply-button').disabled = true;

    window.addEventListener('resize', resizeHandler);
    window.addEventListener('localized', localizeHandler);

    // Set the background for all of the image buttons
    editedPhotoURL = URL.createObjectURL(blob);

    // Use #-moz-samplesize media fragment to downsample images
    // so the resulting images are smaller and fits 5 image buttons
    // Here we assume image buttons are 50px high
    var scale = window.innerWidth / 5 * window.devicePixelRatio *
                window.devicePixelRatio * 50 /
                (metadata.width * metadata.height);
    var sampleSize = Downsample.areaNoMoreThan(scale);

    var backgroundImage = 'url(' + editedPhotoURL + sampleSize + ')';
    editBgImageButtons.forEach(function(b) {
      b.style.backgroundImage = backgroundImage;
    });
  }

  // Display the edit screen
  setView(LAYOUT_MODE.edit);

  // Set the default option buttons to correspond to those edits
  editOptionButtons.forEach(function(b) { selectEditOption(b, false); });
  selectEditOption($('edit-crop-aspect-free'), true);
  selectEditOption($('edit-effect-none'), true);
}

function selectEditOption(radio, selected) {
  radio.classList.toggle('selected', selected);
  radio.setAttribute('aria-checked', selected);
}

// Crop and Effect buttons call this
function editOptionsHandler() {
  // First, unhighlight all buttons in this group and then
  // highlight the button that has just been chosen. These
  // buttons have radio behavior
  var parent = this.parentNode;
  var buttons = parent.querySelectorAll('a.radio.button');
  Array.forEach(buttons, function(b) { selectEditOption(b, false); });
  selectEditOption(this, true);

  // Set selected effect or cropMode elementId in editSettings object
  // to initialize UI on re-enter of an editMode
  if (this.dataset.effect) {
    editSettings.effect.effectId =
      $('edit-effect-options').getElementsByClassName('selected')[0].id;
  } else {
    editSettings.crop.cropModeId =
      $('edit-crop-options').getElementsByClassName('selected')[0].id;
  }

  if (this === $('edit-crop-aspect-free'))
    imageEditor.setCropAspectRatio();
  else if (this === $('edit-crop-aspect-portrait'))
    imageEditor.setCropAspectRatio(2, 3);
  else if (this === $('edit-crop-aspect-landscape'))
    imageEditor.setCropAspectRatio(3, 2);
  else if (this === $('edit-crop-aspect-square'))
    imageEditor.setCropAspectRatio(1, 1);
  else if (this.dataset.effect) {
    editSettings.effect.matrix =
      ImageProcessor[this.dataset.effect + '_matrix'];
    imageEditor.edit();
  }
  enableSaveAndApplyButtons();
}

/*
 * This is the exposure slider component for edit tool.  This ought to be
 * converted into a reusable slider module, but for now this is a
 * custom version that hardcodes things like the -3 to +3 range of values.
 */
var exposureSlider = (function() {
  var slider = document.getElementById('exposure-slider');
  var bar = document.getElementById('sliderline');
  var thumb = document.getElementById('sliderthumb');
  var currentExposure = 0;
  var dragStart = null;
  // prepare gesture detector for slider
  var gestureDetector = new GestureDetector(thumb);
  gestureDetector.startDetecting();

  thumb.addEventListener('pan', function(e) {
    // Handle delta so that slider moves correct way
    // when user drags it for RTL locales
    var delta = navigator.mozL10n.language.direction === 'ltr' ?
                e.detail.absolute.dx : - e.detail.absolute.dx;

    var exposureDelta = delta / parseInt(bar.clientWidth, 10) * 6;
    // For the firt time of pan event triggered
    // set start value to current value.
    if (!dragStart)
      dragStart = currentExposure;

    setExposure(dragStart + exposureDelta);
    e.preventDefault();
  });
  thumb.addEventListener('swipe', function(e) {
    // when stopping we init the dragStart to be null
    // this way we avoid a 'panstart' event
    dragStart = null;
    e.preventDefault();
  });
  thumb.addEventListener('touchstart', function(e) {
    thumb.classList.add('active');
  });
  thumb.addEventListener('touchend', function(e) {
    thumb.classList.remove('active');
  });
  slider.addEventListener('keypress', function(e) {
    // screen reader sends key arrow up/down events for adjusting the slider.
    if (e.keyCode == KeyEvent.DOM_VK_DOWN) {
      setExposure(currentExposure - 0.25);
    } else if (e.keyCode == KeyEvent.DOM_VK_UP) {
      setExposure(currentExposure + 0.25);
    }
  });

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

    // Round to the closest sixteenth
    exposure = Math.round(exposure * 16) / 16;

    if (exposure === currentExposure)
      return;

    forceSetExposure(exposure);
  }

  function forceSetExposure(exposure) {
    // Remove left/right 4 pixels of margin
    var barWidth = parseInt(bar.clientWidth, 10) - 4 * 2;
    var thumbWidth = parseInt(thumb.clientWidth, 10);
    var offset = bar.offsetLeft + 4;

    // Convert exposure value to a unit coefficient position of thumb center
    var unitCoef = (exposure + 3) / 6;

    // Convert unitCoef to pixel position of thumb center
    var pixel = offset + barWidth * unitCoef;

    // Compute pixel position of left edge of thumb
    pixel -= thumbWidth / 2;

    // Move the thumb to that position
    thumb.style.MozMarginStart = pixel + 'px';

    // Display exposure value in thumb
    thumb.textContent = exposure;

    // Don't need to update the currentExposure and dispatch the event if they
    // are the same.
    if (currentExposure === exposure) {
      return;
    }
    // Remember the new exposure value
    currentExposure = exposure;

    // Set value for ARIA widget
    slider.setAttribute('aria-valuenow', exposure);

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

// Handle changes on the slider and turn them into calls to edit the image
(function() {
  var requestId = null;

  $('exposure-slider').onchange = function() {
    if (!imageEditor)  // If it has not been created yet
      return;

    // If there is already a pending request, it will take care of this change
    // and we don't have to request a new one.
    if (requestId !== null)
      return;

    requestId = requestAnimationFrame(function() {
      requestId = null;
      var stops = exposureSlider.getExposure();

      // Convert the exposure compensation stops gamma correction value.
      var factor = -1;  // Adjust this factor to get something reasonable.
      var gamma = Math.pow(2, stops * factor);
      editSettings.exposure.gamma = gamma;
      editSettings.exposure.sliderThumbPos = stops;
      enableSaveAndApplyButtons();
      imageEditor.edit();
    });
  };
}());

// Set editTool to respective edit modes on click
// of crop, exposure, effect, enhance.
function setEditTool(editTool) {
  // Hide all options
  var options = $('edit-options').querySelectorAll('div.edit-options-bar');
  Array.forEach(options, function(o) { o.classList.add('hidden'); });

  // Hide auto enhance message banner before entering
  // an edit tool or cancel of edit screens.
  $('edit-enhance-banner').hidden = true;

  // Make a copy of editSettings when you enter edit tool
  savedEditSettings = clone(editSettings);

  // Now select and show the correct UI based on editTool
  switch (editTool) {
    case 'exposure':
      // Show exposure EditTool and hide main edit screen
      showEditToolView();
      $('exposure-slider').classList.remove('hidden');
      $('edit-title').setAttribute('data-l10n-id', 'exposure');
      // Set exposure slider thumb position
      exposureSlider.forceSetExposure(editSettings.exposure.sliderThumbPos);
      break;
    case 'crop':
      showEditToolView();
      $('edit-crop-options').classList.remove('hidden');
      $('edit-title').setAttribute('data-l10n-id', 'crop');
      // Show crop overlay on entering crop edit tool
      imageEditor.edit(function() {
        imageEditor.showCropOverlay();
      });
      break;
    case 'effect':
      showEditToolView();
      $('edit-effect-options').classList.remove('hidden');
      $('edit-title').setAttribute('data-l10n-id', 'filters');
      break;
    case 'enhance':
      imageEditor.autoEnhancement(setAutoEnhanceState);
      enableSaveAndApplyButtons();
      break;
  }
  // Remember the new edit mode
  currentEditTool = editTool;
}

function cancelEditTool() {
    // Do any necessary cleanup of the currentEditTool view we're exiting.
  switch (currentEditTool) {
    case 'exposure':
      // On cancel in exposure EditTool restore exposure state
      // inside editsettings object.
      editSettings.exposure = savedEditSettings.exposure;
      break;
    case 'crop':
      // On cancel in Crop Edit Tool, restore crop state in editSettings object
      // and revert selected option node.
      selectEditOption($(editSettings.crop.cropModeId), false);
      selectEditOption($(savedEditSettings.crop.cropModeId), true);

      editSettings.crop = savedEditSettings.crop;

      // In crop edit tool, click of back to original button is different
      // from other aspect ratio buttons. Click of back to original -
      // (undoCropHandler) set source rectangle crop region to original image
      // size and generates new preview. If user cancels after clicking back
      // to original, we need to explicitly reset preview and set source
      // rectangle crop region to saved values from editSettings.
      var isCropped = imageEditor.hasBeenCropped();
      if (!isCropped) {
        // if crop region is same as original image size,
        // cancel out by discarding original preview image.
        imageEditor.resetPreview();
        // Set source rectangle crop region from editSettings
        // to go back to previous cropped size preview.
        imageEditor.forceSetCropRegion();
      }

      break;
    case 'effect':
      // On cancel in Effect Edit Tool, restore effect state
      // in editSettings object and revert selected option node.
      selectEditOption($(editSettings.effect.effectId), false);
      selectEditOption($(savedEditSettings.effect.effectId), true);
      editSettings.effect = savedEditSettings.effect;
      break;
  }
  // Revert to main edit screen on edit tool cancel
  // Update preview image with editSettings object
  imageEditor.edit(function() {
    imageEditor.hideCropOverlay();
  });
  $('edit-title').setAttribute('data-l10n-id', 'edit');
  // Hide Edit Tool and show main edit screen
  hideEditToolView();
  currentEditTool = null;
}

// Apply changes made in crop edit tool and go back to edit screen
// Other edit tools - exposure, effects, enhance apply their edits
// as the user interacts with the buttons or slider
function applyEditTool() {
  switch (currentEditTool) {
    case 'crop':
     imageEditor.cropImage(function() {
       imageEditor.hideCropOverlay();
     });
     break;
  }
  $('edit-title').setAttribute('data-l10n-id', 'edit');
  // Hide Edit tool screen
  hideEditToolView();
  // Reset current edit tool and editSettings saved state to null
  currentEditTool = null;
  savedEditSettings = null;
}

function onCancelButton() {
  // Check for currentEditTool to find if user is cancelling out
  // from edit tool screen or main edit screen
  if (currentEditTool === null) {
    // Exit main edit screen withot saving edited image
    exitEdit(false);
  } else {
    // Cancel edit tool and go back to main edit screen
    cancelEditTool();
  }
}

function enableSaveAndApplyButtons() {
  // Enable Apply and Save buttons if it's first edit and isImageEdited
  // is false. For subesquent edits apply and save button stays enabled.
  if (!editSettings || editSettings.isImageEdited) {
    return;
  }
  if (imageEditor.hasBeenCropped() ||
      editSettings.effect.matrix !==
        ImageProcessor.IDENTITY_MATRIX ||
      editSettings.enhance.rgbMinMaxValues !==
       ImageProcessor.default_enhancement ||
      editSettings.exposure.gamma !== 1) {
    editSettings.isImageEdited = true;
    $('edit-tool-apply-button').disabled = false;
    $('edit-save-button').disabled = false;
  }
}

// Create deep copy of an object
function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Toggle the auto enhancement on/off.
function setAutoEnhanceState(isEnhanced) {
  var statusLabel = $('edit-enhance-status');
  var enhanceButton = $('edit-enhance-button');
  var banner = $('edit-enhance-banner');
  enhanceButton.setAttribute('aria-pressed', isEnhanced);
  if (isEnhanced) {
    showStatus('enhance-on');
    enhanceButton.classList.add('on');
  } else {
    showStatus('enhance-off');
    enhanceButton.classList.remove('on');
  }

  function showStatus(msgId) {
    navigator.mozL10n.setAttributes(statusLabel, msgId);
    banner.hidden = false;
    setTimeout(function() {
      banner.hidden = true;
    }, 3000);
  }
}

// Handle show and hide of edit tool screen
function showEditToolView() {
  // Hide Editor toolbar and save button
  $('edit-toolbar').classList.add('hidden');
  $('edit-save-button').hidden = true;

  // Show Edit Tool options and apply button
  $('edit-options').classList.remove('hidden');
  $('edit-tool-apply-button').hidden = false;
}

function hideEditToolView() {
  // Show Editor toolbar and save button
  $('edit-toolbar').classList.remove('hidden');
  $('edit-save-button').hidden = false;

  // Hide Edit Tool options and apply button
  $('edit-options').classList.add('hidden');
  $('edit-tool-apply-button').hidden = true;
}

function undoCropHandler() {
  // Switch to free-form cropping
  Array.forEach($('edit-crop-options').querySelectorAll('a.radio.button'),
                function(b) { selectEditOption(b, false); });
  selectEditOption($('edit-crop-aspect-free'), true);
  imageEditor.setCropAspectRatio(); // freeform
  // And revert to full-size image
  imageEditor.undoCrop();
  // Update selected cropModeId to default inside settings object
  editSettings.crop.cropModeId = 'edit-crop-aspect-free';
}

function exitEdit(saved) {
  // Revoke the blob URL we've been using
  URL.revokeObjectURL(editedPhotoURL);
  editedPhotoURL = null;

  // Check for imageEditor and close the editor object
  if (imageEditor) {
    imageEditor.destroy();
    imageEditor = null;
  }
  savedEditSettings = null;
  editSettings = null;

  window.removeEventListener('resize', resizeHandler);
  window.removeEventListener('localized', localizeHandler);

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
    // After we sucessfully save a picture, we need to make sure that the
    // current file will point to it. We need a flag for fileCreated(),
    // so that the currentFileIndex will stay at 0 which is the newest one.
    justSavedEditedImage = true;
    // After insert sucessfully, db will call file created and setFile to
    // latest file, then we go to fullscreen mode to see the edited picture.
    setView(LAYOUT_MODE.fullscreen);
  } else {
    setView(LAYOUT_MODE.fullscreen);
    showFile(currentFileIndex);
  }
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

  // Check for imageEditor before continuing with save
  if (!imageEditor) {
    return;
  }

  // If we are in crop mode, perform the crop before saving
  if ($('edit-crop-button').classList.contains('selected'))
    imageEditor.cropImage();

  var progressBar = $('save-progress');
  // Show progressbar when start to save.
  progressBar.classList.remove('hidden');
  progressBar.value = 0;
  progressBar.max = 110; // Allow an extra 10% time for conversion to blob

  imageEditor.getFullSizeBlob('image/jpeg', gotBlob, onProgress);

  function onProgress(p, error) {
    // If error occurs, reset the save button for user.
    if (error) {
      $('edit-save-button').disabled = false;
      progressBar.value = 0;
      return;
    }

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
    exitEdit(true);
    progressBar.value = 0;
  }
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
 */
function ImageEditor(imageBlob, container, edits, ready, croponly) {
  this.imageBlob = imageBlob;
  this.imageURL = URL.createObjectURL(imageBlob);
  this.container = container;
  this.edits = edits || {};
  this.croponly = !!croponly;

  // The source rectangle (crop region) of the image. Image pixels.
  this.source = {};
  // The destination (preview) rectangle of canvas. Device pixels.
  this.dest = {};
  // Region displayed in crop overlay during drags. CSS pixels.
  this.cropRegion = {};

  // The canvas that displays the preview
  this.previewCanvas = document.createElement('canvas');
  this.previewCanvas.id = 'edit-preview-canvas'; // for stylesheet
  this.previewCanvas.setAttribute('data-l10n-id', 'editImagePreview');
  this.previewCanvas.setAttribute('role', 'img');
  this.container.appendChild(this.previewCanvas);

  // Make sure the canvas is size for device pixels, not css pixels
  var dpr = window.devicePixelRatio;
  this.previewCanvas.width = Math.ceil(this.previewCanvas.clientWidth * dpr);
  this.previewCanvas.height = Math.ceil(this.previewCanvas.clientHeight * dpr);

  // prepare gesture detector for ImageEditor
  this.gestureDetector = new GestureDetector(container, { panThreshold: 3 });
  this.gestureDetector.startDetecting();

  // preset the scale to something useful in case resize() gets called
  // before generateNewPreview()
  this.scale = 1.0;

  // Once a preview image is created, we have to "upload" it to WebGL.
  // But we only want to do this once. This flag is true if the preview
  // has not been uploaded. We set it each time we create a new preview image.
  // And clear it each time we call the ImageProcessor's draw() method.
  // We pass the flag to draw() to tell it whether it needs to upload
  // before drawing. See bug 934787.
  this.needsUpload = true;

  var self = this;
  if (this.croponly) {
    this.original = null;
    this.preview = new Image();
    this.preview.src = this.imageURL;
    this.preview.onload = function() {
      self.displayCropOnlyPreview();
      if (ready)
        ready();
    };
  }
  else {
    // Start loading the image into a full-size offscreen image
    this.original = new Image();
    this.original.src = this.imageURL;
    this.preview = new Image();
    this.preview.src = null;

    var contextRestoreCallback = function() {
      self.needsUpload = true;
      self.edit();
    };

    this.processor = new ImageProcessor(this.previewCanvas, null,
                                        contextRestoreCallback);

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
  this.dest.width = previewWidth;
  this.dest.height = previewHeight;
};

ImageEditor.prototype.generateNewPreview = function(callback) {
  var self = this;

  // infer the previewHeight such that the aspect ratio stays the same
  var scalex = this.previewCanvas.width / this.source.width;
  var scaley = this.previewCanvas.height / this.source.height;
  this.scale = Math.min(Math.min(scalex, scaley), 1);

  var previewWidth = Math.floor(this.source.width * this.scale);
  var previewHeight = Math.floor(this.source.height * this.scale);

  // Update edits with new dimensions
  this.edits.crop.x = this.source.x;
  this.edits.crop.y = this.source.y;
  this.edits.crop.w = this.source.width;
  this.edits.crop.h = this.source.height;

  // Update the destination rectangle with the new dimensions, too
  this.dest.x = Math.floor((this.previewCanvas.width - previewWidth) / 2);
  this.dest.y = Math.floor((this.previewCanvas.height - previewHeight) / 2);
  this.dest.width = previewWidth;
  this.dest.height = previewHeight;

  // Create a preview image
  var canvas = document.createElement('canvas');
  canvas.width = previewWidth;
  canvas.height = previewHeight;
  // In this case, we only need graphic 2d to do the scaling. The
  // willReadFrequently option makes canvas use software graphic 2d. This can
  // skip a bug of GPU version, bug 960276.
  var context = canvas.getContext('2d', { willReadFrequently: true });

  // Draw that region of the image into the canvas, scaling it down
  context.drawImage(this.original, this.source.x, this.source.y,
                    this.source.width, this.source.height,
                    0, 0, previewWidth, previewHeight);

  // Feed the thumbnail's pixel data as input to the image enhancement worker.
  if (imageEditor) {
    var imageData = context.getImageData(0, 0, previewWidth, previewHeight);
    imageEditor.prepareAutoEnhancement(imageData.data);
  }

  canvas.toBlob(thumbnailReady, 'image/jpeg');

  function thumbnailReady(thumbnail) {
    self.preview.src = URL.createObjectURL(thumbnail);
    self.preview.onload = function() {
      // Set a flag to tell the ImageProcessor to upload the image again
      self.needsUpload = true;
      callback();
    };
  };
};

ImageEditor.prototype.resetPreview = function() {
  if (this.preview.src) {
    URL.revokeObjectURL(this.preview.src);
    this.preview.removeAttribute('src');
    $('edit-enhance-button').classList.add('disabled');
  }
};

ImageEditor.prototype.resize = function() {
  var canvas = this.previewCanvas;
  var dpr = window.devicePixelRatio;
  canvas.width = Math.ceil(canvas.clientWidth * dpr);
  canvas.height = Math.ceil(canvas.clientHeight * dpr);

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
  }
  else {
    this.resetPreview();
    this.edit();
  }

  // Restore the crop region to what it was before the resize
  if (hadCropOverlay) {
    // showCropOverlay normally resets cropRegion to the full extent,
    // so we need to pass in a new crop region to use
    var newRegion = {};
    newRegion.left = Math.floor(savedCropRegion.left * this.scale);
    newRegion.top = Math.floor(savedCropRegion.top * this.scale);
    newRegion.right = Math.floor(savedCropRegion.right * this.scale);
    newRegion.bottom = Math.floor(savedCropRegion.bottom * this.scale);
    this.showCropOverlay(newRegion);
  }
};

ImageEditor.prototype.destroy = function() {
  if (this.processor) {
    this.processor.destroy();
    this.processor = null;
  }

  if (this.original) {
    this.original.src = '';
    this.original = null;
  }

  if (this.preview) {
    if (this.preview.src !== this.imageURL) {
      URL.revokeObjectURL(this.preview.src);
    }
    this.preview.src = '';
    this.preview = null;
  }

  URL.revokeObjectURL(this.imageURL);

  if (this.previewCanvas) {
    this.container.removeChild(this.previewCanvas);
    // Setting the canvas size to 0 causes a WebGL error so we don't do it
    // this.previewCanvas.width = 0;
    this.previewCanvas = null;
  }
  this.hideCropOverlay();
  this.gestureDetector.stopDetecting();
  this.gestureDetector = null;
};

// Preview the image with the specified edits applied. If edit is omitted,
// displays the original image. Clients should call this function when the
// desired edits change or when the size of the container changes (on
// orientation change events, for example)
ImageEditor.prototype.edit = function(callback) {
  if (!this.preview.src) {
    var self = this;
    this.generateNewPreview(function() {
      self.finishEdit(callback);
    });
  } else {
    this.finishEdit(callback);
  }
};

ImageEditor.prototype.finishEdit = function(callback) {
  var canvas = this.previewCanvas;
  this.processor.draw(this.preview, this.needsUpload,
                      0, 0, this.preview.width, this.preview.height,
                      this.dest.x, this.dest.y, this.dest.width,
                      this.dest.height, this.edits);
  this.needsUpload = false;

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
  const TILE_SIZE = 512;
  var self = this;

  // Create an offscreen canvas and copy the image into it
  var canvas = document.createElement('canvas');
  canvas.width = this.source.width; // "full size" is cropped image size
  canvas.height = this.source.height;
  var context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(this.original,
                    this.source.x, this.source.y,
                    this.source.width, this.source.height,
                    0, 0, this.source.width, this.source.height);

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
  var rectangles = makeTileList(this.source.width, this.source.height,
                                tile.width, tile.height);

  processNextTile();

  // Process one tile of the original image, copy the processed tile
  // to the full-size canvas, and then return to the event queue.
  function processNextTile() {
    var rect = rectangles.shift();

    // Get the input pixels for this tile
    var pixels = context.getImageData(rect.x, rect.y, rect.w, rect.h);

    var centerX = Math.floor((tile.width - rect.w) / 2);
    var centerY = Math.floor((tile.height - rect.h) / 2);

    // Edit the pixels and draw them to the tile
    processor.draw(pixels, true,
                   0, 0, rect.w, rect.h,
                   centerX, centerY, rect.w, rect.h,
                   self.edits);

    // Copy the edited pixels from the tile back to the canvas
    context.drawImage(tile,
                      centerX, centerY, rect.w, rect.h,
                      rect.x, rect.y, rect.w, rect.h);

    if (processor.isContextLost()) {
      processor.destroy();
      processor = null;
      context = null;
      canvas.width = canvas.height = 0;
      canvas = null;

      if (progress) {
        // Reload the original image.
        self.original.src = self.imageURL;
        self.original.onload = function() {
          // Send the error to reset processing state.
          progress(0, true);
        };
      }
      return;
    }

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
      processor = null;

      // Now get the canvas contents as a file and pass to the callback
      canvas.toBlob(function(blobData) {
        // Now that we've got the blob, we don't need the canvas anymore
        context = null;
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
  var dpr = window.devicePixelRatio;
  return (this.cropRegion.left !== 0 ||
          this.cropRegion.top !== 0 ||
          this.cropRegion.right < Math.floor(this.dest.width / dpr) ||
          this.cropRegion.bottom < Math.floor(this.dest.height / dpr));
};

// Display cropping controls
// XXX: have to handle rotate/resize
ImageEditor.prototype.showCropOverlay = function showCropOverlay(newRegion) {
  var self = this;

  // Create a canvas to display the crop overlay.
  // Ignore the device pixel ratio and use CSS pixels for this canvas.
  var canvas = this.cropCanvas = document.createElement('canvas');
  canvas.id = 'edit-crop-canvas'; // for stylesheet
  this.container.appendChild(canvas);
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  var context = this.cropContext = canvas.getContext('2d');

  // Crop handle styles
  context.translate(25, 15);
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
    var dpr = window.devicePixelRatio;
    region.left = 0;
    region.top = 0;
    region.right = Math.floor(this.dest.width / dpr);
    region.bottom = Math.floor(this.dest.height / dpr);
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

// Force set image to crop sizes in edit settings
ImageEditor.prototype.forceSetCropRegion = function forceSetCropRegion() {
  this.source.x = this.edits.crop.x;
  this.source.y = this.edits.crop.y;
  this.source.width = this.edits.crop.w;
  this.source.height = this.edits.crop.h;

};

// Reset image to full original size
ImageEditor.prototype.resetCropRegion = function resetCropRegion() {
  this.source.x = 0;
  this.source.y = 0;
  this.source.width = this.original.width;
  this.source.height = this.original.height;

};

ImageEditor.prototype.drawCropControls = function(handle) {
  var canvas = this.cropCanvas;
  var context = this.cropContext;
  var region = this.cropRegion;
  var dpr = window.devicePixelRatio;
  var dest = {
    x: Math.floor(this.dest.x / dpr),
    y: Math.floor(this.dest.y / dpr),
    width: Math.floor(this.dest.width / dpr),
    height: Math.floor(this.dest.height / dpr)
  };
  var left = region.left + dest.x;
  var top = region.top + dest.y;
  var right = region.right + dest.x;
  var bottom = region.bottom + dest.y;
  var centerX = (left + right) / 2;
  var centerY = (top + bottom) / 2;
  var width = right - left;
  var height = bottom - top;

  // Erase everything
  context.clearRect(-25, -15, canvas.width, canvas.height);

  // Overlay the preview canvas with translucent gray
  context.fillStyle = 'rgba(0, 0, 0, .5)';
  context.fillRect(dest.x, dest.y, dest.width, dest.height);

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
  var dpr = window.devicePixelRatio;
  var dest = {
    x: Math.floor(this.dest.x / dpr),
    y: Math.floor(this.dest.y / dpr),
    width: Math.floor(this.dest.width / dpr),
    height: Math.floor(this.dest.height / dpr)
  };
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
          newright > dest.width || newbottom > dest.height)
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
        dx = Math.min(dx, dest.width - right);
      if (dx < 0)
        dx = Math.max(dx, -left);
      if (dy > 0)
        dy = Math.min(dy, dest.height - bottom);
      if (dy < 0)
        dy = Math.max(dy, -top);

      region.left = left + dx;
      region.right = right + dx;
      region.top = top + dy;
      region.bottom = bottom + dy;

      self.drawCropControls();
    }

    function up(e) {
      // Enable Apply and Save button if it's first edit.
      if (enableSaveAndApplyButtons) {
        enableSaveAndApplyButtons();
      }
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
  var dpr = window.devicePixelRatio;
  var dest = {
    x: Math.floor(this.dest.x / dpr),
    y: Math.floor(this.dest.y / dpr),
    width: Math.floor(this.dest.width / dpr),
    height: Math.floor(this.dest.height / dpr)
  };

  // Convert the preview crop region to fractions
  var left = Math.min(region.left / dest.width, 1.0);
  var right = Math.min(region.right / dest.width, 1.0);
  var top = Math.min(region.top / dest.height, 1.0);
  var bottom = Math.min(region.bottom / dest.height, 1.0);

  // Now convert those fractions to pixels in the original image
  // Note that the original image may have already been cropped, so we
  // multiply by the size of the crop region, not the full size
  left = Math.floor(left * this.source.width);
  right = Math.ceil(right * this.source.width);
  top = Math.floor(top * this.source.height);
  bottom = Math.ceil(bottom * this.source.height);

  // XXX: tweak these to make sure we still have the right aspect ratio
  // after rounding to pixels
  console.error('Maintain aspect ratio precisely!!!');

  // And update the real crop region
  this.source.x += left;
  this.source.y += top;
  this.source.width = right - left;
  this.source.height = bottom - top;

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
  var dpr = window.devicePixelRatio;
  var dest = {
    x: Math.floor(this.dest.x / dpr),
    y: Math.floor(this.dest.y / dpr),
    width: Math.floor(this.dest.width / dpr),
    height: Math.floor(this.dest.height / dpr)
  };

  this.cropAspectWidth = ratioWidth || 0;
  this.cropAspectHeight = ratioHeight || 0;

  if (ratioWidth && ratioHeight) {
    // Constrained cropping, centered on image
    var centerX = dest.width / 2;
    var centerY = dest.height / 2;

    var scaleX = dest.width / ratioWidth;
    var scaleY = dest.height / ratioHeight;
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
    region.right = dest.width;
    region.bottom = dest.height;
  }
  this.drawCropControls();
};

// Return the crop region as an object with left, top, width and height
// properties. The values of these properties are numbers between 0 and 1
// representing fractions of the full image width and height.
ImageEditor.prototype.getCropRegion = function() {
  var region = this.cropRegion;
  var previewRect = this.dest;
  var dpr = window.devicePixelRatio;

  // Convert the preview crop region to fractions
  var left = dpr * region.left / previewRect.width;
  var right = dpr * region.right / previewRect.width;
  var top = dpr * region.top / previewRect.height;
  var bottom = dpr * region.bottom / previewRect.height;

  return {
    left: left,
    top: top,
    width: Math.min(right - left, 1.0),
    height: Math.min(bottom - top, 1.0)
  };
};

ImageEditor.prototype.autoEnhancement = function(callback) {
  var enhanced = false;
  if (this.edits.enhance.rgbMinMaxValues ==
      ImageProcessor.default_enhancement) {
    if (this.autoEnhanceValues) {
      enhanced = true;
      this.edits.enhance.rgbMinMaxValues = this.autoEnhanceValues;
    }
  } else {
    enhanced = false;
    this.edits.enhance.rgbMinMaxValues = ImageProcessor.default_enhancement;
  }
  //Apply the effect or restore the preview without it.
  this.edit();
  if (callback) {
    callback(enhanced);
  }
};

ImageEditor.prototype.prepareAutoEnhancement = function(pixel) {

  // Calculate the color histogram in the background and store the computed
  // values so they can be used as input for the shader.
  var self = this;
  var worker = new Worker('js/auto_enhancement_worker.js');
  worker.addEventListener('message', function(message) {
      self.autoEnhanceValues = message.data;
      $('edit-enhance-button').classList.remove('disabled');
  });

  worker.postMessage(pixel);
};

// WebGL context helper class for handling context lost/restore event
// and resource management.
function WebGLCanvasHelper(canvas, lostCallback, restoreCallback, needRestore) {
  var self = this;

  this.canvas = canvas;
  // We might just want to listen the lost event but do not need to restore
  // the context
  this.needRestore = needRestore;

  this.lostHandler = function(event) {
    if (self.needRestore) {
      // We should call preventDefault to prevent the webgl default behavior:
      // do not restore the context
      event.preventDefault();
    }

    if (lostCallback) {
      lostCallback();
    }
  };
  this.restoreHandler = function(event) {
    if (restoreCallback) {
      restoreCallback();
    }
  };

  canvas.addEventListener('webglcontextlost', this.lostHandler, false);
  canvas.addEventListener('webglcontextrestored', this.restoreHandler, false);

  var options = { depth: false, stencil: false, antialias: false };
  this.context = canvas.getContext('webgl', options) ||
                 canvas.getContext('experimental-webgl', options);

  this.loseContextExt = this.context.getExtension('WEBGL_lose_context');
}

// Destroy the webgl canvas and context
WebGLCanvasHelper.prototype.destroy = function() {
  // Remove the context lost/restore handler to prevent the restore event
  if (this.lostHandler) {
    this.canvas.removeEventListener('webglcontextlost',
                                    this.lostHandler,
                                    false);
  }
  if (this.restoreHandler) {
    this.canvas.removeEventListener('webglcontextrestored',
                                    this.restoreHandler,
                                    false);
  }

  this.context = null;
  this.canvas.width = this.canvas.height = 0;
  this.canvas = null;

  // Destroy webgl context explicitly. No need to wait for GC cleaning up.
  // http://www.khronos.org/registry/webgl/extensions/WEBGL_lose_context/
  // We use loseContext() to let the context lost.
  // It will release the buffer here.
  if (this.loseContextExt) {
    // The extension 'WEBGL_lose_context' is still valid even if the context
    // lost. If we have this extension, we can just call it.
    this.loseContextExt.loseContext();
  }
};

//
// Create a new ImageProcessor object for the specified canvas to do
// webgl transformations on an image.  Expects its shader programs to be in
// <script> elements with ids 'edit-vertex-shader' and 'edit-fragment-shader'.
//
// Webgl context will restore if we have lostCallback or restoreCallback.
function ImageProcessor(canvas, lostCallback, restoreCallback) {
  var self = this;

  if (lostCallback || restoreCallback) {
    this.webglHelper = new WebGLCanvasHelper(canvas, lostCallback, function() {
        self.initWebGL();

        if (restoreCallback) {
          restoreCallback();
        }
    }, true);
  }
  else {
    this.webglHelper = new WebGLCanvasHelper(canvas);
  }

  this.initWebGL();
}

// Init all webgl resource
ImageProcessor.prototype.initWebGL = function() {
  var gl = this.webglHelper.context;

  // Define our shader programs
  var vshader = this.vshader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vshader, ImageProcessor.vertexShader);
  gl.compileShader(vshader);
  if (!gl.getShaderParameter(vshader, gl.COMPILE_STATUS) &&
                             !gl.isContextLost()) {
    var error = new Error('Error compiling vertex shader:' +
                          gl.getShaderInfoLog(vshader));
    gl.deleteShader(vshader);
    throw error;
  }

  var fshader = this.fshader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fshader, ImageProcessor.fragmentShader);
  gl.compileShader(fshader);
  if (!gl.getShaderParameter(fshader, gl.COMPILE_STATUS) &&
                             !gl.isContextLost()) {
    var error = new Error('Error compiling fragment shader:' +
                          gl.getShaderInfoLog(fshader));
    gl.deleteShader(fshader);
    throw error;
  }

  var program = this.program = gl.createProgram();
  gl.attachShader(program, vshader);
  gl.attachShader(program, fshader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS) &&
                              !gl.isContextLost()) {
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
  this.rectangleBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.rectangleBuffer);
  gl.disable(gl.CULL_FACE);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    0, 0,
    1, 0,
    0, 1,
    1, 1
  ]), gl.STATIC_DRAW);

  // Look up the addresses of the program's input variables
  this.rectangleVertexAddress = gl.getAttribLocation(program, 'rect_vertex');
  this.srcRectangleAddress = gl.getUniformLocation(program, 'src_rect');
  this.dstRectangleAddress = gl.getUniformLocation(program, 'dst_rect');
  this.canvasSizeAddress = gl.getUniformLocation(program, 'canvas_size');
  this.imageSizeAddress = gl.getUniformLocation(program, 'image_size');
  this.destSizeAddress = gl.getUniformLocation(program, 'dest_size');
  this.destOriginAddress = gl.getUniformLocation(program, 'dest_origin');
  this.matrixAddress = gl.getUniformLocation(program, 'matrix');
  this.gammaAddress = gl.getUniformLocation(program, 'gamma');
  this.rgbMinAddress = gl.getUniformLocation(program, 'rgb_min');
  this.rgbMaxAddress = gl.getUniformLocation(program, 'rgb_max');
  this.rgbOneOverMaxMinusMinAddress =
    gl.getUniformLocation(program, 'rgb_one_over_max_minus_min');
};

// Destroy all the stuff we allocated
ImageProcessor.prototype.destroy = function() {
  var gl = this.webglHelper.context;
  gl.deleteShader(this.vshader);
  gl.deleteShader(this.fshader);
  gl.deleteProgram(this.program);
  gl.deleteTexture(this.sourceTexture);
  gl.deleteBuffer(this.rectangleBuffer);
  gl.viewport(0, 0, 0, 0);

  this.webglHelper.destroy();
  this.webglHelper = null;
};

ImageProcessor.prototype.draw = function(image, needsUpload,
                                         sx, sy, sw, sh,
                                         dx, dy, dw, dh,
                                         options)
{
  var gl = this.webglHelper.context;
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

  // Set the canvas size and image size
  gl.uniform2f(this.canvasSizeAddress, this.webglHelper.canvas.width,
               this.webglHelper.canvas.height);
  gl.uniform2f(this.imageSizeAddress, image.width, image.height);
  gl.uniform2f(this.destOriginAddress, dx, dy);
  gl.uniform2f(this.destSizeAddress, dw, dh);

  // Set the gamma correction
  var gammaArray;
  if (options.exposure.gamma)
    gl.uniform4f(this.gammaAddress,
                 options.exposure.gamma, options.exposure.gamma,
                 options.exposure.gamma, options.exposure.gamma);
  else
    gl.uniform4f(this.gammaAddress, 1, 1, 1, 1);

  // Set the color transformation
  gl.uniformMatrix4fv(this.matrixAddress, false,
                      options.effect.matrix || ImageProcessor.IDENTITY_MATRIX);

  // set rgb max/min values for auto Enhancing
  var minMaxValuesMatrix = options.enhance.rgbMinMaxValues ||
                           ImageProcessor.default_enhancement;
  gl.uniform3f(this.rgbMinAddress,
               minMaxValuesMatrix[0],
               minMaxValuesMatrix[1],
               minMaxValuesMatrix[2]);
  gl.uniform3f(this.rgbMaxAddress,
               minMaxValuesMatrix[3],
               minMaxValuesMatrix[4],
               minMaxValuesMatrix[5]);
  gl.uniform3f(this.rgbOneOverMaxMinusMinAddress,
               1 / (minMaxValuesMatrix[3] - minMaxValuesMatrix[0]),
               1 / (minMaxValuesMatrix[4] - minMaxValuesMatrix[1]),
               1 / (minMaxValuesMatrix[5] - minMaxValuesMatrix[2]));

  gl.bindBuffer(gl.ARRAY_BUFFER, this.rectangleBuffer);
  gl.enableVertexAttribArray(this.rectangleVertexAddress);
  gl.vertexAttribPointer(this.rectangleVertexAddress, 2, gl.FLOAT, false, 0, 0);

  gl.uniform4f(this.srcRectangleAddress, sx, sy, sw, sh);
  gl.uniform4f(this.dstRectangleAddress, dx, dy, dw, dh);

  // Load the image into the texture if we need to do that
  if (needsUpload) {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  }

  // And draw it all
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  return !this.isContextLost();
};

ImageProcessor.prototype.isContextLost = function() {
  return this.webglHelper.context.isContextLost();
};

ImageProcessor.vertexShader =
  'uniform vec4 src_rect;\n' + // source rectangle (x, y, width, height)
  'uniform vec4 dst_rect;\n' + // destination rectangle (x, y, width, height)
  'attribute vec2 rect_vertex;\n' + // vertex in standard (0, 0, 1, 1) rectangle
  'uniform vec2 canvas_size;\n' +   // size of destination canvas in pixels
  'uniform vec2 image_size;\n' +    // size of source image in pixels
  'varying vec2 src_position;\n' +  // pass image pos to the fragment shader
  'void main() {\n' +
  '  vec2 src_pixel = src_rect.xy + rect_vertex * src_rect.zw;\n' +
  '  vec2 dst_pixel = dst_rect.xy + rect_vertex * dst_rect.zw;\n' +
  '  gl_Position = vec4(((dst_pixel/canvas_size)*2.0-1.0)*vec2(1,-1),0,1);\n' +
  '  src_position = src_pixel / image_size;\n' +
  '}';

ImageProcessor.fragmentShader =
  'precision mediump float;\n' +
  'uniform sampler2D image;\n' +
  'uniform vec2 dest_size;\n' +    // size of the destination rectangle
  'uniform vec2 dest_origin;\n' +  // upper-left corner of destination rectangle
  'uniform vec4 gamma;\n' +
  'uniform mat4 matrix;\n' +
  'uniform vec3 rgb_min;\n' +
  'uniform vec3 rgb_max;\n' +
  'uniform vec3 rgb_one_over_max_minus_min;\n' +
  'varying vec2 src_position;\n' + // from the vertex shader
  'void main() {\n' +
  // Otherwise take the image color, apply color and gamma correction and
  // the color manipulation matrix.
  '  vec4 original_color = texture2D(image, src_position);\n' +
  '  vec3 clamped_color = clamp(original_color.xyz, rgb_min, rgb_max);\n' +
  '  vec4 corrected_color = \n' +
  '    vec4((clamped_color.xyz - rgb_min) * rgb_one_over_max_minus_min, \n' +
  '         original_color.a);\n' +
  '  gl_FragColor = pow(corrected_color, gamma) * matrix;\n' +
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

ImageProcessor.default_enhancement = [
  0, 0, 0,
  1, 1, 1,
  0, 0, 0
];
