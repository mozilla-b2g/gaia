'use strict';

// XXX: with the new gestures, I can't use a mouse or trackpad.
// So add to GestureDetector to support those before pushing this.

/*
 * This app displays photos that are stored on the phone.
 *
 * Its starts with a thumbnail view in which small versions of all photos
 * are displayed.  Tapping on a thumbnail shows the full-size image.
 *
 * When a full-size image is displayed, swiping left or right moves to
 * the next or previous image (this depends on the writing direction of
 * the locale).  The app can also perform a slideshow, transitioning
 * between photos automatically.
 *
 * The app supports two-finger "pinch" gestures to zoom in and out on an
 * image.  When zoomed, a one finger swipe gesture pans within the zoomed
 * image, and only moves to the next or previous image once you reach the
 * edge of the currently displayed image.
 *
 * To make transitions between photos smooth, the app preloads the next
 * and previous images and positions them off-screen to the right and
 * left (or opposite for RTL locales) of the currently displayed image.
 *
 * Images are displayed with <img> elements inside <div> elements. These
 * <div> elements are called "frames", and the three global variables
 * currentPhotoFrame, previousPhotoFrame and nextPhotoFrame refer to the
 * three frame divs.  The next and previous frames are positioned by
 * setting a CSS class, which sets the CSS left property to position them
 * offscreen (the classes are defined differently for RTL and LTR
 * languages).  When the user pans left or right (and when the current
 * image isn't zoomed in) the app uses -moz-tranform to translate all
 * three frames left or right so that the user sees one photo moving off
 * screen and the other one moving on. When the user lifts their finger,
 * the app uses a CSS transition to slide the current photo back into
 * place (if the pan wasn't far enough) or to complete the transition to
 * the next or previous photo.
 *
 * The transitions are performed by changing the CSS classes on the three
 * frame <divs> and cycling them. To transition to the next photo, for
 * example, nextPhotoFrame becomes currentPhotoFrame, currentPhotoFrame
 * becomes previousPhotoFrame, and previousPhotoFrame cycles around to
 * become the new nextPhotoFrame (and loads a new image). At the same
 * time, the css classes on these frames are changed to reposition them
 * and CSS handles the transition animation for us, animating both the
 * change in the left property caused by the class change, and the change
 * in the -moz-transform property which is set back to the empty string.
 *
 * The trickiest code has to do with handling zooms and pans while the
 * photo is zoomed in.  If the photo isn't zoomed in, then any pan ends
 * with a transition to a new photo or back to the original photo.  But
 * when we're zoomed, then pans can just be moving around within the
 * zoomed photo. Panning and zooming a photo is implemented by setting
 * the CSS top, left, width and height photos of the img tag. (The img is
 * display:relative, and the frame is overflow:none.) So this is a
 * completely different positioning mechanism than the one used for
 * swiping and transitioning photos sideways.
 *
 * Notice that a single pan gesture can cause two different things to
 * happen: it moves the zoomed in image within its frame and then, when
 * edge of the photo is reached, it starts to transition from that photo
 * to the next or previous one. Also, when we do zooms, we want to zoom
 * in or out around the midpoint between the user's fingers, and zooming
 * around a point requires us to pan the photo. The code for handling the
 * zoom and pan computations is separated out into a separate PhotoState
 * class.  I'm not entirely convinced that this is the best abstraction,
 * but it does simplify things somewhat.
 *
 * Pan gestures are made with a single finger and are implemented with a
 * mousedown handler (so it works with a mouse on the desktop as well as
 * with a finger on a phone) that registers temporary capturing mousemove
 * and mouseup listeners.
 *
 * Zoom gestures are two finger gestures so they only work on
 * touch-sensitive devices and can't be tested on the desktop.  They're
 * implemented on top of basic touch events in the separate file gestures.js.
 *
 *
 * TODO:
 *   we need a way to get photos from the camera and to store them on the device
 *   the ability to download photos from the web might be nice, too.
 *   we need to be able to determine the size of a photo, I think.
 *   do we need to read metadata?
 *   need to be able to deal with photos of different sizes and orientations
 *     can't just size them to 100%,100%.
 *   need to handle resize/orientationchange events because I'm guessing
 *     that image sizes will have to change.
 *   we should probably have a way to organize photos into albums
 *   How do we localize the slideshow Play button for RTL languages?
 *   Do we want users to be able to rotate photos to tell the
 *     gallery app how to display them?
 *   Do we want borders around the photos?
 *   Do we want to be able to send photos by email and sms?
 */

//
// Tuneable parameters
// 

// Pan this % of width to transition from one photo to the next
const TRANSITION_FRACTION = 0.25; 

// This is the speed of our default transitions in pixels/ms.
// Swipe faster than this to transition faster. But we'll 
// never go slower (except slide show transitions).
const TRANSITION_SPEED = 1.8;

// Slide show constants
const SLIDE_INTERVAL = 3000;      // 3 seconds on each slides
const SLIDE_TRANSITION = 500;     // 1/2 second transition between slides

//
// Right now the set of photos is just hardcoded in the sample_photos directory
//
// We need to use the media storage API here or something similar.
//
const SAMPLE_PHOTOS_DIR = 'sample_photos/';
const SAMPLE_THUMBNAILS_DIR = 'sample_photos/thumbnails/';
const SAMPLE_FILENAMES = ['DSC_1677.jpg', 'DSC_1701.jpg', 'DSC_1727.jpg',
'DSC_1729.jpg', 'DSC_1759.jpg', 'DSC_4236.jpg', 'DSC_4767.jpg', 'DSC_4858.jpg',
'DSC_4861.jpg', 'DSC_4903.jpg', 'DSC_6842.jpg', 'DSC_6859.jpg', 'DSC_6883.jpg',
'IMG_0546.jpg', 'IMG_0554.jpg', 'IMG_0592.jpg', 'IMG_0610.jpg', 'IMG_0668.jpg',
'IMG_0676.jpg', 'IMG_1132.jpg', 'IMG_1307.jpg', 'IMG_1706.jpg',
'IMG_7928.jpg', 'IMG_7990.jpg', 'IMG_8085.jpg', 'IMG_8164.jpg', 'IMG_8631.jpg',
'IMG_8638.jpg', 'IMG_8648.jpg', 'IMG_8652.jpg', '_MG_0053.jpg', 'P1000115.jpg',
'P1000404.jpg', 'P1000469.jpg', 'P1000486.jpg',
'3548856279_a215152cd5_o.jpg', '3549661880_0c5565a518_o.jpg',
'3549662882_8e41d11d28_o.jpg', '3551599565_db282cf840_o.jpg',
'6839255446_2f245d8f0c.jpg', '6985376089_db00e0d18c_o.jpg'];

const SAMPLE_SIZES = [
  [480,726], [480,726], [480,726], [480,726], [480,726], [480,726], [480,726],
  [480,726], [480,726], [480,726], [480,800], [480,800], [480,800], [480,800],
  [480,800], [480,800], [480,800], [480,800], [480,800], [480,800], [480,800],
  [480,800], [480,800], [480,800], [480,800], [480,800], [480,800], [480,800],
  [480,800], [480,800], [480,800], [480,800], [480,800], [480,800], [480,800],
  [1024, 704], [1024, 1010], [1018, 826], [817, 1019], [328, 500], [2169, 1613]
];

const NUM_PHOTOS = SAMPLE_FILENAMES.length;

function photoURL(n) {
  if (n < 0 || n >= NUM_PHOTOS)
    return null;
  return SAMPLE_PHOTOS_DIR + SAMPLE_FILENAMES[n];
}

function thumbnailURL(n) {
  if (n < 0 || n >= NUM_PHOTOS)
    return null;
  return SAMPLE_THUMBNAILS_DIR + SAMPLE_FILENAMES[n];
}

var currentPhotoIndex = 0;       // What photo is currently displayed
var thumbnailsDisplayed = true;  // Or is the thumbnail view showing
var slideshowTimer = null;       // Non-null if we're doing a slide show

// UI elements
var header = document.getElementById('header');
var thumbnails = document.getElementById('thumbnails');
var photos = document.getElementById('photos');
var playerControls = document.getElementById('player-controls');
var backButton = document.getElementById('back-button');
var slideshowButton = document.getElementById('play-button');

// These three divs hold the previous, current and next photos
// The divs get swapped around and reused when we pan to the
// next or previous photo: next becomes current, current becomes previous
// etc.  See nextPhoto() and previousPhoto().
var previousPhotoFrame = photos.querySelector('div.previousPhoto');
var currentPhotoFrame = photos.querySelector('div.currentPhoto');
var nextPhotoFrame = photos.querySelector('div.nextPhoto');

// The currently displayed <img> element.
// This changes as photos are panned, but showPhoto(), nextPhoto() and
// previousPhoto() keep its value current.
var currentPhoto;

// This will hold a PhotoState object that encapsulates the zoom and pan
// calculations and holds the current size and position of the photo and
// also the amount of sideways swiping of the photo frames.
var photoState;

// When this variable is set to true, we ignore any user gestures
// so we don't try to pan or zoom during a photo transition.
var transitioning = false;

// This will be set to "ltr" or "rtl" when we get our localized event
var languageDirection;

//
// Create the <img> elements for the thumbnails
//
for (var i = 0; i < NUM_PHOTOS; i++) {
  var li = document.createElement('li');
  li.dataset.index = i;
  li.classList.add('thumbnailHolder');

  var img = document.createElement('img');
  img.src = thumbnailURL(i);
  img.classList.add('thumbnail');
  li.appendChild(img);

  thumbnails.appendChild(li);
}


//
// Event handlers
//

// Wait for the "localized" event before displaying the document content
window.addEventListener('localized', function showBody() {
  // Set the 'lang' and 'dir' attributes to <html> when the page is translated
  var html = document.documentElement;
  var lang = document.mozL10n.language;
  html.setAttribute('lang', lang.code);
  html.setAttribute('dir', lang.direction);
  languageDirection = lang.direction;

  // <body> children are hidden until the UI is translated
  document.body.classList.remove('hidden');
});

// Each of the photoFrame <div> elements may be subject to animated
// transitions. So give them transitionend event handlers that
// remove the -moz-transition style property when the transition ends.
// This helps prevent unexpected transitions.
function removeTransition(event) {
  event.target.style.MozTransition = '';
}
previousPhotoFrame.addEventListener('transitionend', removeTransition);
currentPhotoFrame.addEventListener('transitionend', removeTransition);
nextPhotoFrame.addEventListener('transitionend', removeTransition);

// Use the GestureDetector.js library to handle gestures.
// This will generate tap, pan, swipe and transform events
new GestureDetector(photos).startDetecting();

// Clicking on a thumbnail displays the photo
// FIXME: add a transition here
thumbnails.addEventListener('click', function thumbnailsClick(evt) {
  var target = evt.target;
  if (!target || !target.classList.contains('thumbnailHolder'))
    return;
  showPhoto(parseInt(target.dataset.index));
});

// Clicking on the back button goes back to the thumbnail view
backButton.addEventListener('click', function backButtonClick(evt) {
  showThumbnails();
});

// Clicking on the "play/pause" button starts or stops the slideshow
slideshowButton.addEventListener('click', function slideshowClick() {
  if (slideshowTimer)
    stopSlideshow();
  else
    startSlideshow();
});

// If a photo is displayed, then the back button goes back to
// the thumbnail view.
window.addEventListener('keyup', function keyPressHandler(evt) {
  if (!thumbnailsDisplayed && evt.keyCode == evt.DOM_VK_ESCAPE) {
    showThumbnails();
    evt.preventDefault();
  }
});


// On a tap just show or hide the back and play buttons.
photos.addEventListener('tap', function(event) {
  playerControls.classList.toggle('hidden');
});

// Pan the photos sideways when the user moves their finger across the screen
photos.addEventListener('pan', function(event) {
  if (transitioning)
    return;

  photoState.pan(event.detail.relative.dx,
                 event.detail.relative.dy);
  photoState.setPhotoStyles(currentPhoto);
  photoState.setFrameStyles(currentPhotoFrame,
                            previousPhotoFrame,
                            nextPhotoFrame);
});

// When the user lifts their finger after panning we get this event
photos.addEventListener('swipe', function(event) {
  // How far past the edge of the photo have we panned?
  var pastEdge = photoState.swipe;
  var direction;

  if (pastEdge < 0)
    direction = 1;    // next photo
  else if (pastEdge > 0)
    direction = -1;   // previous photo

  // If we're in a right-to-left locale, reverse those directions
  if (languageDirection === 'rtl')
    direction *= -1;

  // Did we pan far enough or swipe fast enough to transition to
  // a different photo?
  var farenough = (Math.abs(pastEdge) > window.innerWidth*TRANSITION_FRACTION);
  var velocity = event.detail.vx;
  var fastenough = Math.abs(velocity) > TRANSITION_SPEED; 

  // Make sure that that the speed and pan amount are in the same direction
  var samedirection = velocity === 0 || pastEdge/velocity >= 0;

  // Is there a next or previous photo to transition to?
  var photoexists =
    (direction === 1 && currentPhotoIndex + 1 < NUM_PHOTOS) ||
    (direction === -1 && currentPhotoIndex > 0);

  // If all of these conditions hold, then we'll transition to the
  // next photo or the previous photo
  if (direction !== 0 && (farenough || fastenough) &&
      samedirection && photoexists) {

    // Compute how long the transition should take based on the velocity
    var speed = Math.max(Math.abs(velocity), TRANSITION_SPEED);
    var time = (window.innerWidth - Math.abs(pastEdge)) / speed;

    // Transition photos in the appropriate direction
    if (direction === 1)
      nextPhoto(time);
    else
      previousPhoto(time);

    // If a slideshow is in progress then restart the slide timer.
    if (slideshowTimer)
      continueSlideshow();
  }
  else if (pastEdge !== 0) {
    // Otherwise, just restore the current photo by undoing
    // the translations we added during panning
    var time = Math.abs(pastEdge)/TRANSITION_SPEED;
    var transition = 'all ' + time + 'ms linear';
    previousPhotoFrame.style.MozTransition = transition;
    currentPhotoFrame.style.MozTransition = transition;
    nextPhotoFrame.style.MozTransition = transition;

    photoState.swipe = 0;
    photoState.setFrameStyles(currentPhotoFrame,
                              previousPhotoFrame,
                              nextPhotoFrame);

    // Ignore  pan and zoom gestures while the transition happens
    transitioning = true;
    setTimeout(function() { transitioning = false; }, time);
  }
});

// Quick zoom in and out with dbltap events
photos.addEventListener('dbltap', function(e) {
  var scale;
  if (photoState.scale > 1)      // If already zoomed in, 
    scale = 1/photoState.scale;  // zoom out to starting scale
  else                           // Otherwise
    scale = 2;                   // Zoom in by a factor of 2

  photoState.zoom(scale, e.detail.clientX, e.detail.clientY);
  currentPhoto.style.MozTransition = 'all 100ms linear';
  currentPhoto.addEventListener('transitionend', function handler() {
    currentPhoto.style.MozTransition = '';
    currentPhoto.removeEventListener('transitionend', handler);
  });
  photoState.setPhotoStyles(currentPhoto);
});

// We also support pinch-to-zoom
photos.addEventListener('transform', function(e) {
  if (transitioning)
    return;

  photoState.zoom(e.detail.relative.scale,
                  e.detail.midpoint.clientX,
                  e.detail.midpoint.clientY);
  photoState.setPhotoStyles(currentPhoto);
});

// Switch from single-picture view to thumbnail view
function showThumbnails() {
  stopSlideshow();

  thumbnails.classList.remove('hidden');
  header.classList.remove('hidden');
  photos.classList.add('hidden');
  playerControls.classList.add('hidden');
  thumbnailsDisplayed = true;
}

// A utility function to insert an <img src="url"> tag into an element
// URL should be the image to display. Frame should be previousPhotoFrame,
// currentPhotoFrame or nextPhotoFrame.  Used in showPhoto(), nextPhoto()
// and previousPhoto()
function displayImageInFrame(n, frame) {
  // Remove anything in the frame
  while (frame.firstChild)
    frame.removeChild(frame.firstChild);

  // Get the url of photo n.  If n is out of range, just return now
  var url = photoURL(n);
  if (!url)
    return;

  // Create the img element
  var img = document.createElement('img');
  img.src = url;

  // Figure out the size and position of the image
  // FIXME: this code is duplicated in the PhotoState class. Merge?
  var size = SAMPLE_SIZES[n];
  var photoWidth = size[0], photoHeight = size[1];
  var viewportWidth = photos.offsetWidth, viewportHeight = photos.offsetHeight;
  var scalex = viewportWidth / photoWidth;
  var scaley = viewportHeight / photoHeight;
  var scale = Math.min(Math.min(scalex, scaley), 1);

  // Set the image size and position
  var width = Math.floor(photoWidth * scale);
  var height = Math.floor(photoHeight * scale);
  var style = img.style;
  style.width = width + 'px';
  style.height = height + 'px';
  style.left = Math.floor((viewportWidth - width) / 2) + 'px';
  style.top = Math.floor((viewportHeight - height) / 2) + 'px';

  frame.appendChild(img);
}

// Switch from thumbnail list view to single-picture view
// and display the specified photo.
function showPhoto(n) {
  if (thumbnailsDisplayed) {
    thumbnails.classList.add('hidden');
    header.classList.add('hidden');
    photos.classList.remove('hidden');
    playerControls.classList.remove('hidden');
    thumbnailsDisplayed = false;
  }

  displayImageInFrame(n - 1, previousPhotoFrame);
  displayImageInFrame(n, currentPhotoFrame);
  displayImageInFrame(n + 1, nextPhotoFrame);
  currentPhotoIndex = n;
  currentPhoto = currentPhotoFrame.firstElementChild;

  // Create the PhotoState object that stores the photo pan/zoom state
  // And use it to apply CSS styles to the photo and photo frames.
  // FIXME: these sizes are hardcoded right now.
  photoState = new PhotoState(SAMPLE_SIZES[n][0], SAMPLE_SIZES[n][1]);
  photoState.setPhotoStyles(currentPhoto);
  photoState.setFrameStyles(currentPhotoFrame,
                            previousPhotoFrame,
                            nextPhotoFrame);
}

// Transition to the next photo, animating it over the specified time (ms).
// This is used when the user pans and also for the slideshow.
function nextPhoto(time) {
  // If already displaying the last one, do nothing.
  if (currentPhotoIndex === NUM_PHOTOS - 1)
    return;

  // Set a flag to ignore pan and zoom gestures during the transition.
  transitioning = true;
  setTimeout(function() { transitioning = false; }, time);

  // Set transitions for the visible photos
  var transition = 'left ' + time + 'ms linear, ' +
    '-moz-transform ' + time + 'ms linear';
  previousPhotoFrame.style.MozTransition = '';  // Not visible
  currentPhotoFrame.style.MozTransition = transition;
  nextPhotoFrame.style.MozTransition = transition;

  // Remove the classes
  previousPhotoFrame.classList.remove('previousPhoto');
  currentPhotoFrame.classList.remove('currentPhoto');
  nextPhotoFrame.classList.remove('nextPhoto');

  // Cycle the three frames so next becomes current,
  // current becomes previous, and previous becomes next.
  var tmp = previousPhotoFrame;
  previousPhotoFrame = currentPhotoFrame;
  currentPhotoFrame = nextPhotoFrame;
  nextPhotoFrame = tmp;
  currentPhotoIndex++;

  // And add appropriate classes to the newly cycled frames
  previousPhotoFrame.classList.add('previousPhoto');
  currentPhotoFrame.classList.add('currentPhoto');
  nextPhotoFrame.classList.add('nextPhoto');

  // Remember the new current <img> element.
  currentPhoto = currentPhotoFrame.firstElementChild;

  // Remember the old photoState object
  var previousPhotoState = photoState;

  // Start with default pan and zoom state for the new photo
  // And also reset the translation caused by swiping the photos
  // FIXME: use the real size of the photo
  var size = SAMPLE_SIZES[currentPhotoIndex];
  photoState = new PhotoState(size[0], size[1]);
  photoState.setPhotoStyles(currentPhoto);
  photoState.setFrameStyles(currentPhotoFrame,
                            previousPhotoFrame,
                            nextPhotoFrame);

  // Update the image for the new next photo
  displayImageInFrame(currentPhotoIndex + 1, nextPhotoFrame);

  // When the transition is done, restore the previous photo state
  previousPhotoFrame.addEventListener('transitionend', function done(e) {
    // Recompute and reposition the photo that just transitioned off the screen
    previousPhotoState.reset();
    previousPhotoState.setPhotoStyles(previousPhotoFrame.firstElementChild);

    // FIXME: I want a jquery-style once() utility for auto removal
    previousPhotoFrame.removeEventListener('transitionend', done);
  });
}

// Just like nextPhoto() but in the other direction
function previousPhoto(time) {
  // If already displaying the first one, do nothing.
  if (currentPhotoIndex === 0)
    return;

  // Set a flag to ignore pan and zoom gestures during the transition.
  transitioning = true;
  setTimeout(function() { transitioning = false; }, time);

  // Transition the two visible photos
  var transition = 'left ' + time + 'ms linear, ' +
    '-moz-transform ' + time + 'ms linear';
  previousPhotoFrame.style.MozTransition = transition;
  currentPhotoFrame.style.MozTransition = transition;
  nextPhotoFrame.style.MozTransition = ''; // Not visible

  // Remove the frame classes since we're about to cycle the frames
  previousPhotoFrame.classList.remove('previousPhoto');
  currentPhotoFrame.classList.remove('currentPhoto');
  nextPhotoFrame.classList.remove('nextPhoto');

  // Transition to the previous photo: previous becomes current, current
  // becomes next, etc.
  var tmp = nextPhotoFrame;
  nextPhotoFrame = currentPhotoFrame;
  currentPhotoFrame = previousPhotoFrame;
  previousPhotoFrame = tmp;
  currentPhotoIndex--;

  // And add the frame classes to the newly cycled frame divs.
  previousPhotoFrame.classList.add('previousPhoto');
  currentPhotoFrame.classList.add('currentPhoto');
  nextPhotoFrame.classList.add('nextPhoto');

  // Get the new current photo
  currentPhoto = currentPhotoFrame.firstElementChild;

  // Remember the old PhotoState object
  var nextPhotoState = photoState;

  // Create a new photo state
  var size = SAMPLE_SIZES[currentPhotoIndex];
  photoState = new PhotoState(size[0], size[1]);
  photoState.setPhotoStyles(currentPhoto);
  photoState.setFrameStyles(currentPhotoFrame,
                            previousPhotoFrame,
                            nextPhotoFrame);

  // Preload the new previous photo
  displayImageInFrame(currentPhotoIndex - 1, previousPhotoFrame);

  // When the transition is done, restore the previous photo state
  nextPhotoFrame.addEventListener('transitionend', function done(e) {
    // Recompute and reposition the photo that just transitioned off the screen
    nextPhotoState.reset();
    nextPhotoState.setPhotoStyles(nextPhotoFrame.firstElementChild);

    // FIXME: I want a jquery-style once() utility for auto removal
    nextPhotoFrame.removeEventListener('transitionend', done);
  });
}

function startSlideshow() {
  // If we're already displaying the last slide, then move to the first
  if (currentPhotoIndex === NUM_PHOTOS - 1)
    showPhoto(0);

  // Now schedule the next slide
  slideshowTimer = setTimeout(nextSlide, SLIDE_INTERVAL);
  slideshowButton.classList.add('playing');
}

function stopSlideshow() {
  if (slideshowTimer) {
    clearTimeout(slideshowTimer);
    slideshowTimer = null;
  }
  slideshowButton.classList.remove('playing');
}

// Transition to the next photo as part of a slideshow.
// Note that this is different than nextPhoto().
function nextSlide() {
  // Move to the next slide if we're not already on the last one
  if (currentPhotoIndex + 1 < NUM_PHOTOS) {
    nextPhoto(SLIDE_TRANSITION);
  }

  // And schedule the next slide transition
  slideshowTimer = null;
  continueSlideshow();
}

// Clear any existing slideshow timer, and if there are more slides to
// show, start a new timer to show the next one. We use this after each
// slide is shown, and also in the panning code so that if you manually pan
// during a slide show, the timer resets and you get the full time to
// view each slide.
function continueSlideshow() {
  if (slideshowTimer)
    clearInterval(slideshowTimer);

  // If we're still not on the last one, then schedule another slide.
  if (currentPhotoIndex + 1 < NUM_PHOTOS) {
    slideshowTimer = setTimeout(nextSlide, SLIDE_INTERVAL);
  }
  // Otherwise, stop the slideshow
  else {
    slideshowTimer = null;
    stopSlideshow();
  }
}

/**
 * This class encapsulates the zooming and panning functionality for
 * the gallery app and maintains the current size and position of the
 * currently displayed photo as well as the transition state (if any)
 * between photos.
 */
function PhotoState(width,height) {
  // Remember the actual size of the photograph
  this.photoWidth = width;
  this.photoHeight = height;

  // Do all the calculations
  this.reset();
}

// Compute the default size and position of the photo
PhotoState.prototype.reset = function() {
  // Store the display space we have for photos
  // call reset() when we get a resize or orientationchange event
  this.viewportWidth = photos.offsetWidth;
  this.viewportHeight = photos.offsetHeight;

  // Figure out the scale to make the photo fit in the window
  var scalex = this.viewportWidth / this.photoWidth;
  var scaley = this.viewportHeight / this.photoHeight;
  this.baseScale = Math.min(Math.min(scalex, scaley), 1);
  this.scale = 1;

  // Compute photo size and position at that scale
  this.width = Math.floor(this.photoWidth * this.baseScale);
  this.height = Math.floor(this.photoHeight * this.baseScale);
  this.left = (this.viewportWidth - this.width) / 2;
  this.top = (this.viewportHeight - this.height) / 2;

  // We start off with no swipe from left to right
  this.swipe = 0;
};

// Zoom in by the specified factor, adjusting the pan amount so that
// the image pixels at (centerX, centerY) remain at that position.
// Assume that zoom gestures can't be done in the middle of swipes, so
// if we're calling zoom, then the swipe property will be 0.
PhotoState.prototype.zoom = function(scale, centerX, centerY) {
  // Never zoom in farther than 2x the native resolution of the image
  if (this.baseScale * this.scale * scale > 2) {
    scale = 2 / (this.baseScale * this.scale);
  }
  // And never zoom out to make the image smaller than it would normally be
  else if (this.scale * scale < 1) {
    scale = 1 / this.scale;
  }

  this.scale = this.scale * scale;

  // Change the size of the photo
  this.width = Math.floor(this.photoWidth * this.baseScale * this.scale);
  this.height = Math.floor(this.photoHeight * this.baseScale * this.scale);

  // centerX and centerY are in viewport coordinates.
  // These are the photo coordinates displayed at that point in the viewport
  var photoX = centerX - this.left;
  var photoY = centerY - this.top;

  // After zooming, these are the new photo coordinates.
  // Note we just use the relative scale amount here, not this.scale
  var photoX = Math.floor(photoX * scale);
  var photoY = Math.floor(photoY * scale);

  // To keep that point still, here are the new left and top values we need
  this.left = centerX - photoX;
  this.top = centerY - photoY;

  // Now make sure we didn't pan too much: If the image fits on the
  // screen, center it. If the image is bigger than the screen, then
  // make sure we haven't gone past any edges
  if (this.width <= this.viewportWidth) {
    this.left = (this.viewportWidth - this.width) / 2;
  }
  else {
    // Don't let the left of the photo be past the left edge of the screen
    if (this.left > 0)
      this.left = 0;

    // Right of photo shouldn't be to the left of the right edge
    if (this.left + this.width < this.viewportWidth) {
      this.left = this.viewportWidth - this.width;
    }
  }

  if (this.height <= this.viewportHeight) {
    this.top = (this.viewportHeight - this.height) / 2;
  }
  else {
    // Don't let the top of the photo be below the top of the screen
    if (this.top > 0)
      this.top = 0;

    // bottom of photo shouldn't be above the bottom of screen
    if (this.top + this.height < this.viewportHeight) {
      this.top = this.viewportHeight - this.height;
    }
  }
};

PhotoState.prototype.pan = function(dx, dy) {
  // Handle panning in the y direction first, since it is easier.
  // Don't pan in the y direction if we already fit on the screen
  if (this.height > this.viewportHeight) {
    this.top += dy;

    // Don't let the top of the photo be below the top of the screen
    if (this.top > 0)
      this.top = 0;

    // bottom of photo shouldn't be above the bottom of screen
    if (this.top + this.height < this.viewportHeight)
      this.top = this.viewportHeight - this.height;
  }

  // Now handle the X dimension. In this case, we have to handle panning within
  // a zoomed image, and swiping to transition from one photo to the next
  // or previous.
  if (this.width <= this.viewportWidth) {
    // In this case, the photo isn't zoomed in, so we're just doing swiping
    this.swipe += dx;
  }
  else {
    if (this.swipe === 0) {
      this.left += dx;

      // If this would take the left edge of the photo past the
      // left edge of the screen, then we've got to do a swipe
      if (this.left > 0) {
        this.swipe += this.left;
        this.left = 0;
      }

      // Or, if this would take the right edge of the photo past the
      // right edge of the screen, then we've got to swipe the other way
      if (this.left + this.width < this.viewportWidth) {
        this.swipe += this.left + this.width - this.viewportWidth;
        this.left = this.viewportWidth - this.width;
      }
    }
    else if (this.swipe > 0) {
      this.swipe += dx;
      if (this.swipe < 0) {
        this.left += this.swipe;
        this.swipe = 0;
      }
    }
    else if (this.swipe < 0) {
      this.swipe += dx;
      if (this.swipe > 0) {
        this.left += this.swipe;
        this.swipe = 0;
      }
    }
  }
};

PhotoState.prototype.setPhotoStyles = function(img) {
  img.style.width = this.width + 'px';
  img.style.height = this.height + 'px';
  img.style.top = this.top + 'px';
  img.style.left = this.left + 'px';
};

PhotoState.prototype.setFrameStyles = function(/*frames...*/) {
  var translate = 'translate(' + this.swipe + 'px)';
  for (var i = 0; i < arguments.length; i++)
    arguments[i].style.MozTransform = translate;
};
