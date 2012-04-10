'use strict';

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

const SLIDE_INTERVAL = 3000;   // 3 seconds on each slides
const SLIDE_TRANSITION = 500;  // 1/2 second transition between slides

const PAN_THRESHOLD = 50; // How many pixels before one-finger pan

var numPhotos = SAMPLE_FILENAMES.length;
var photoURL = function(n) { return SAMPLE_PHOTOS_DIR + SAMPLE_FILENAMES[n]; }

var currentPhotoIndex = 0;
var slideshowTimer = null;
var thumbnailsDisplayed = true;

// UI elements
var header = document.getElementById('header');
var thumbnails = document.getElementById('thumbnails');
var photos = document.getElementById('photos');
var playerControls = document.getElementById('player-controls');
var backButton = document.getElementById('back-button');
var slideshowButton = document.getElementById('play-button');

// These three divs hold the previous, current and next photos
var previousPhotoFrame, currentPhotoFrame, nextPhotoFrame;

thumbnails.addEventListener('click', function thumbnailsClick(evt) {
  var target = evt.target;
  if (!target || !target.classList.contains('thumbnailHolder'))
    return;
  showPhoto(parseInt(target.dataset.index));
});

backButton.addEventListener('click', function backButtonClick(evt) {
  stopSlideshow();
  showThumbnails();
});

slideshowButton.addEventListener('click', function slideshowClick() {
  if (slideshowTimer)
    stopSlideshow();
  else
    startSlideshow();
});

window.addEventListener('keyup', function keyPressHandler(evt) {
  if (!thumbnailsDisplayed && evt.keyCode == evt.DOM_VK_ESCAPE) {
    stopSlideshow();
    showThumbnails();
    evt.preventDefault();
  }
});

// Handle clicks and drags on the photos
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
      toggleControls();
      return;
    }
    
    // Transition the photos
    panning = false;
    var dx = event.screenX - startX;
    
    // XXX
    // Ideally, the transition time would be velocity sensitive
    // Can I combine code from the lock screen and here to make that happen?
    transition(dx);
  }
  
  // Capture all subsequent mouse move and mouse up events
  document.body.addEventListener('mousemove', move, true);
  document.body.addEventListener('mouseup', up, true);
});


// Create the <img> elements for the thumbnails
SAMPLE_FILENAMES.forEach(function(filename) {
  var thumbnailURL = SAMPLE_THUMBNAILS_DIR + filename;
  
  var li = document.createElement('li');
  li.dataset.index = self.thumbnails.childNodes.length;
  li.classList.add('thumbnailHolder');
  
  var img = document.createElement('img');
  img.src = thumbnailURL;
  img.classList.add('thumbnail');
  li.appendChild(img);
  
  thumbnails.appendChild(li);
});

function showThumbnails() {
  thumbnails.classList.remove('hidden');
  header.classList.remove('hidden');
  photos.classList.add('hidden');
  playerControls.classList.add('hidden');

  thumbnailsDisplayed = true;
}

function hideThumbnails() {
  thumbnails.classList.add('hidden');
  header.classList.add('hidden');
  photos.classList.remove('hidden');
  playerControls.classList.remove('hidden');

  thumbnailsDisplayed = false;
}

// Display the specified photo
function showPhoto(n) {
  if (thumbnailsDisplayed)
    hideThumbnails();

  var photo;
  
  previousPhotoFrame = document.createElement('div');
  previousPhotoFrame.className = 'photoFrame previousPhoto';
  if (n > 0) {
    photo = document.createElement('img');
    photo.src = photoURL(n-1);
    previousPhotoFrame.appendChild(photo);
  }

  currentPhotoFrame = document.createElement('div');
  currentPhotoFrame.className = 'photoFrame currentPhoto';
  photo = document.createElement('img');
  photo.src = photoURL(n);
  currentPhotoFrame.appendChild(photo);
  
  nextPhotoFrame = document.createElement('div');
  nextPhotoFrame.className = 'photoFrame nextPhoto';
  if (n+1 < numPhotos) {
    photo = document.createElement('img');
    photo.src = photoURL(n+1);
    nextPhotoFrame.appendChild(photo);
  }

  // Each of the new <div> elements may be subject to animated 
  // transitions. So give them transitionend event handlers that 
  // remove the -moz-transition style property when the transition ends
  function removeTransition(event) {
    event.target.style.MozTransition = '';
  }
  previousPhotoFrame.addEventListener('transitionend', removeTransition);
  currentPhotoFrame.addEventListener('transitionend', removeTransition);
  nextPhotoFrame.addEventListener('transitionend', removeTransition);

  // Add these new elements to the photos element, replacing existing content
  photos.textContent = '';
  photos.appendChild(previousPhotoFrame);
  photos.appendChild(currentPhotoFrame);
  photos.appendChild(nextPhotoFrame);

  currentPhotoIndex = n;
}

function nextPhoto(time) {
  // If already displaying the last one, do nothing.
  if (currentPhotoIndex === numPhotos - 1) 
    return;

  previousPhotoFrame.style.MozTransition = '';  // Not visible
  currentPhotoFrame.style.MozTransition = 'all ' + time + 'ms linear';
  nextPhotoFrame.style.MozTransition = 'all ' + time + 'ms linear';
  previousPhotoFrame.style.MozTransform = '';
  currentPhotoFrame.style.MozTransform = '';
  nextPhotoFrame.style.MozTransform = '';
  
  previousPhotoFrame.classList.remove('previousPhoto');
  currentPhotoFrame.classList.remove('currentPhoto');
  nextPhotoFrame.classList.remove('nextPhoto');

  var tmp = previousPhotoFrame;
  previousPhotoFrame = currentPhotoFrame;
  currentPhotoFrame = nextPhotoFrame;
  nextPhotoFrame = tmp;
  currentPhotoIndex++;

  var img = '';
  if (currentPhotoIndex + 1 < numPhotos)
    img = '<img src="' + photoURL(currentPhotoIndex+1) + '"/>';
  
  nextPhotoFrame.innerHTML = img;

  previousPhotoFrame.classList.add('previousPhoto');
  currentPhotoFrame.classList.add('currentPhoto');
  nextPhotoFrame.classList.add('nextPhoto');
}

function previousPhoto(time) {
  // If already displaying the first one, do nothing.
  if (currentPhotoIndex === 0) 
    return;

  previousPhotoFrame.style.MozTransition = 'all ' + time + 'ms linear';
  currentPhotoFrame.style.MozTransition = 'all ' + time + 'ms linear';
  nextPhotoFrame.style.MozTransition = ''; // Not visible
  previousPhotoFrame.style.MozTransform = '';
  currentPhotoFrame.style.MozTransform = '';
  nextPhotoFrame.style.MozTransform = '';
  
  previousPhotoFrame.classList.remove('previousPhoto');
  currentPhotoFrame.classList.remove('currentPhoto');
  nextPhotoFrame.classList.remove('nextPhoto');

  // transition to the previous photo
  var tmp = nextPhotoFrame;
  nextPhotoFrame = currentPhotoFrame;
  currentPhotoFrame = previousPhotoFrame;
  previousPhotoFrame = tmp;
  currentPhotoIndex--;

  var img = '';
  if (currentPhotoIndex > 0)
    img = '<img src="' + photoURL(currentPhotoIndex-1) + '"/>';
  previousPhotoFrame.innerHTML = img;

  previousPhotoFrame.classList.add('previousPhoto');
  currentPhotoFrame.classList.add('currentPhoto');
  nextPhotoFrame.classList.add('nextPhoto');
}


// Move to the next or previous photo, or just restore the current one
// based on the, the amount of panning.  This is called by one of the
// event handlers above.
function transition(dx) {
  // Did we drag far enough to go on to the previous or next photo?
  if (Math.abs(dx) > window.innerWidth/4) {
    // XXX: update this to do the right thing for RTL languages
    if (dx < 0)
      nextPhoto(200);      // Make the time velocity-dependent
    else
      previousPhoto(200);  // Make the time velocity-dependent

    return;
  }

  // Otherwise, just restore the current photo by undoing
  // the translations we added during panning
  previousPhotoFrame.style.MozTransition = 'all 200ms linear';
  currentPhotoFrame.style.MozTransition = 'all 200ms linear';
  nextPhotoFrame.style.MozTransition = 'all 200ms linear';
  previousPhotoFrame.style.MozTransform = '';
  currentPhotoFrame.style.MozTransform = '';
  nextPhotoFrame.style.MozTransform = '';
}

function toggleControls() {
  playerControls.classList.toggle('hidden');
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

function nextSlide() {
  // Move to the next slide if we're not already on the last one
  if (currentPhotoIndex+1 < numPhotos) {
    nextPhoto(SLIDE_TRANSITION);
  }

  // If we're still not on the last one, then schedule another slide
  // Otherwise, stop the slideshow
  if (currentPhotoIndex+1 < numPhotos) {
    slideshowTimer = setTimeout(nextSlide, SLIDE_INTERVAL);
  }
  else {
    slideshowTimer = null;
    stopSlideshow();
  }
}

window.addEventListener('localized', function showBody() {
  // Set the 'lang' and 'dir' attributes to <html> when the page is translated
  var html = document.documentElement;
  var lang = document.mozL10n.language;
  html.setAttribute('lang', lang.code);
  html.setAttribute('dir', lang.direction);

  // XXX: we used to call Gallery.init() here to defer the setup 
  // of the thumbnails, but since those don't actually get localized, 
  // I don't think that matters.

  // <body> children are hidden until the UI is translated
  document.body.classList.remove('hidden');
});
