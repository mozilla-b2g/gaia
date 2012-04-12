'use strict';

//
// TODO:
//   we need a way to get photos from the camera and to store them on the device
//   the ability to download photos from the web might be nice, too.
//   we need to be able to determine the size of a photo, I think.
//   do we need to read metadata?
//   need to be able to deal with photos of different sizes and orientations
//     can't just size them to 100%,100%.
//   need to handle resize/orientationchange events because I'm guessing
//     that image sizes will have to change.
//   we should probably have a way to organize photos into albums
//   How do we localize the slideshow Play button for RTL languages?
//   Do we want users to be able to rotate photos to tell the
//     gallery app how to display them?
//   Do we want borders around the photos?
//

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
'DSC_7150.jpg', 'IMG_0139.jpg', 'IMG_0160.jpg', 'IMG_0211.jpg', 'IMG_0225.jpg',
'IMG_0251.jpg', 'IMG_0281.jpg', 'IMG_0476.jpg', 'IMG_0498.jpg', 'IMG_0506.jpg',
'IMG_0546.jpg', 'IMG_0554.jpg', 'IMG_0592.jpg', 'IMG_0610.jpg', 'IMG_0668.jpg',
'IMG_0676.jpg', 'IMG_1132.jpg', 'IMG_1307.jpg', 'IMG_1706.jpg', 'IMG_1974.jpg',
'IMG_7928.jpg', 'IMG_7990.jpg', 'IMG_8085.jpg', 'IMG_8164.jpg', 'IMG_8631.jpg',
'IMG_8638.jpg', 'IMG_8648.jpg', 'IMG_8652.jpg', '_MG_0053.jpg', 'P1000115.jpg',
'P1000404.jpg', 'P1000469.jpg', 'P1000486.jpg'];

const numPhotos = SAMPLE_FILENAMES.length;

function photoURL(n) {
  if (n < 0 || n >= numPhotos)
    return null;
  return SAMPLE_PHOTOS_DIR + SAMPLE_FILENAMES[n];
}

function thumbnailURL(n) {
  if (n < 0 || n >= numPhotos)
    return null;
  return SAMPLE_THUMBNAILS_DIR + SAMPLE_FILENAMES[n];
}

const SLIDE_INTERVAL = 3000;   // 3 seconds on each slides
const SLIDE_TRANSITION = 500;  // 1/2 second transition between slides
const PAN_THRESHOLD = 50;      // How many pixels before one-finger pan

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

// This will be set to "ltr" or "rtl" when we get our localized event
var languageDirection;

//
// Create the <img> elements for the thumbnails
//
for (var i = 0; i < numPhotos; i++) {
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
  stopSlideshow();
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
    stopSlideshow();
    showThumbnails();
    evt.preventDefault();
  }
});

// This is the event handler for single-finger taps and swipes.
// On a tap just show or hide the back and play buttons.
// On a swipe, move to the next or previous photos.
photos.addEventListener('mousedown', function(event) {
  var startX = event.screenX;
  var panning = false;

  function move(event) {
    var dx = event.screenX - startX;

    if (!panning && Math.abs(dx) > PAN_THRESHOLD)
      panning = true;

    if (panning) {
      var pan = 'translate(' + dx + 'px)';
      previousPhotoFrame.style.MozTransform = pan;
      currentPhotoFrame.style.MozTransform = pan;
      nextPhotoFrame.style.MozTransform = pan;
    }
  }

  function up(event) {
    // Remove the capturing event handlers
    document.body.removeEventListener('mousemove', move, true);
    document.body.removeEventListener('mouseup', up, true);

    if (!panning) {  // this was just a tap
      // hide or show the close and play buttons
      playerControls.classList.toggle('hidden');
      return;
    }
    else
      panning = false;

    // Transition the photos:
    // Move to the next or previous photo, or just restore the current one
    // based on the amount of panning.
    var dx = event.screenX - startX;

    var direction;
    if (dx < 0)
      direction = 1;    // next photo
    else
      direction = -1;   // previous photo

    // If we're in a right-to-left locale, reverse those directions
    if (languageDirection === 'rtl')
      direction *= -1;

    // Did we drag far enough to go on to the previous or next photo?
    // And is there a previous or next photo to display?
    // FIXME: Is it possible to do a 1-handed swipe?
    // See the lockscreen swipe code
    if ((Math.abs(dx) > window.innerWidth / 4) &&
        ((direction === 1 && currentPhotoIndex + 1 < numPhotos) ||
         (direction === -1 && currentPhotoIndex > 0)))
    {
      // FIXME: Ideally, the transition time would be velocity sensitive
      if (direction === 1)
        nextPhoto(200);      // Make the time velocity-dependent
      else
        previousPhoto(200);  // Make the time velocity-dependent

      // If a slideshow is in progress then reset the slide timer
      // after panning to a new one.
      if (slideshowTimer)
        continueSlideshow();
    }
    else {
      // Otherwise, just restore the current photo by undoing
      // the translations we added during panning
      previousPhotoFrame.style.MozTransition = 'all 200ms linear';
      currentPhotoFrame.style.MozTransition = 'all 200ms linear';
      nextPhotoFrame.style.MozTransition = 'all 200ms linear';
      previousPhotoFrame.style.MozTransform = '';
      currentPhotoFrame.style.MozTransform = '';
      nextPhotoFrame.style.MozTransform = '';
    }
  }

  // Capture all subsequent mouse move and mouse up events
  document.body.addEventListener('mousemove', move, true);
  document.body.addEventListener('mouseup', up, true);
});

// Switch from single-picture view to thumbnail view
function showThumbnails() {
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
function displayImageInFrame(url, frame) {
  frame.innerHTML = url ? '<img src="' + url + '"/>' : '';
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

  displayImageInFrame(photoURL(n - 1), previousPhotoFrame);
  displayImageInFrame(photoURL(n), currentPhotoFrame);
  displayImageInFrame(photoURL(n + 1), nextPhotoFrame);
  currentPhotoIndex = n;
}

// Transition to the next photo, animating it over the specified time (ms).
// This is used when the user pans and also for the slideshow.
function nextPhoto(time) {
  // If already displaying the last one, do nothing.
  if (currentPhotoIndex === numPhotos - 1)
    return;

  // Set transitions for the visible photos
  previousPhotoFrame.style.MozTransition = '';  // Not visible
  currentPhotoFrame.style.MozTransition = 'all ' + time + 'ms linear';
  nextPhotoFrame.style.MozTransition = 'all ' + time + 'ms linear';

  // Undo any transforms added from the panning code
  previousPhotoFrame.style.MozTransform = '';
  currentPhotoFrame.style.MozTransform = '';
  nextPhotoFrame.style.MozTransform = '';

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

  // Update the image for the new next photo
  displayImageInFrame(photoURL(currentPhotoIndex + 1), nextPhotoFrame);

  // And add appropriate classes to the newly cycled frames
  previousPhotoFrame.classList.add('previousPhoto');
  currentPhotoFrame.classList.add('currentPhoto');
  nextPhotoFrame.classList.add('nextPhoto');
}

// Just like nextPhoto() but in the other direction
function previousPhoto(time) {
  // If already displaying the first one, do nothing.
  if (currentPhotoIndex === 0)
    return;

  // Transition the two visible photos
  previousPhotoFrame.style.MozTransition = 'all ' + time + 'ms linear';
  currentPhotoFrame.style.MozTransition = 'all ' + time + 'ms linear';
  nextPhotoFrame.style.MozTransition = ''; // Not visible

  // Undo any previously transformations added by panning
  previousPhotoFrame.style.MozTransform = '';
  currentPhotoFrame.style.MozTransform = '';
  nextPhotoFrame.style.MozTransform = '';

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

  // Preload the new previous photo
  displayImageInFrame(photoURL(currentPhotoIndex - 1), previousPhotoFrame);

  // And add the frame classes to the newly cycled frame divs.
  previousPhotoFrame.classList.add('previousPhoto');
  currentPhotoFrame.classList.add('currentPhoto');
  nextPhotoFrame.classList.add('nextPhoto');
}

function startSlideshow() {
  // If we're already displaying the last slide, then move to the first
  if (currentPhotoIndex === numPhotos - 1)
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
  if (currentPhotoIndex + 1 < numPhotos) {
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
  if (currentPhotoIndex + 1 < numPhotos) {
    slideshowTimer = setTimeout(nextSlide, SLIDE_INTERVAL);
  }
  // Otherwise, stop the slideshow
  else {
    slideshowTimer = null;
    stopSlideshow();
  }
}
