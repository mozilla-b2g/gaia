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

//-----------------------------------------------------------------------------
// XXX: share this with homescreen.  Paginated panning is a gap.
//
function createPhysicsFor(iconGrid) {
  return new DefaultPhysics(iconGrid);
}

function DefaultPhysics(iconGrid) {
  this.iconGrid = iconGrid;
  this.moved = false;
  this.touchState = { active: false, startX: 0, startY: 0 };
}

DefaultPhysics.prototype = {
  onTouchStart: function(e) {
    var touchState = this.touchState;
    this.moved = false;
    touchState.active = true;
    touchState.startX = e.pageX;
    touchState.startY = e.pageY;
    touchState.startTime = e.timeStamp;
  },
  onTouchMove: function(e) {
    var iconGrid = this.iconGrid;
    var touchState = this.touchState;
    if (touchState.active) {
      var dx = touchState.startX - e.pageX;
      if (dx !== 0) {
        iconGrid.pan(-dx);
        this.moved = true;
      }
      e.stopPropagation();
    }
  },
  onTouchEnd: function(e) {
    var touchState = this.touchState;
    if (!touchState.active)
      return;
    touchState.active = false;

    var startX = touchState.startX;
    var endX = e.pageX;
    var diffX = endX - startX;
    var dir = (diffX > 0) ? -1 : 1;

    var quick = (e.timeStamp - touchState.startTime < 200);

    var small = Math.abs(diffX) < 20;

    var flick = quick && !small;
    var tap = small;
    var drag = !quick;

    var iconGrid = this.iconGrid;
    var currentPage = iconGrid.currentPage;
    if (tap) {
      iconGrid.tap();
      return;
    } else if (flick) {
      iconGrid.setPage(currentPage + dir, 0.2);
    } else {
      if (Math.abs(diffX) < window.innerWidth / 2)
        iconGrid.setPage(currentPage, 0.2);
      else
        iconGrid.setPage(currentPage + dir, 0.2);
    }
    e.stopPropagation();
  }
};

var Mouse2Touch = {
  'mousedown': 'touchstart',
  'mousemove': 'touchmove',
  'mouseup': 'touchend'
};

var Touch2Mouse = {
  'touchstart': 'mousedown',
  'touchmove': 'mousemove',
  'touchend': 'mouseup'
};

var ForceOnWindow = {
  'touchmove': true,
  'touchend': true,
  'sleep': true
}

function AddEventHandlers(target, listener, eventNames) {
  for (var n = 0; n < eventNames.length; ++n) {
    var name = eventNames[n];
    target = ForceOnWindow[name] ? window : target;
    name = Touch2Mouse[name] || name;
    target.addEventListener(name, {
      handleEvent: function(e) {
        if (Mouse2Touch[e.type]) {
          var original = e;
          e = {
            type: Mouse2Touch[original.type],
            target: original.target,
            touches: [original],
            preventDefault: function() {
              original.preventDefault();
            }
          };
          e.changedTouches = e.touches;
        }
        return listener.handleEvent(e);
      }
    }, true);
  }
}

function RemoveEventHandlers(target, listener, eventNames) {
  for (var n = 0; n < eventNames.length; ++n) {
    var name = eventNames[n];
    target = ForceOnWindow[name] ? window : target;
    name = Touch2Mouse[name] || name;
    target.removeEventListener(name, listener);
  }
}

//-----------------------------------------------------------------------------

var Gallery = {

  currentPage: 0,
  photoTranslation: 0,          // pixels
  physics: null,
  slideshowTimer: null,
  SLIDE_INTERVAL: 3000,   // 3 seconds on each slides
  SLIDE_TRANSITION: 500,  // 1/2 second transition between slides

  get header() {
    delete this.header;
    return this.header = document.getElementById('header');
  },

  get thumbnails() {
    delete this.thumbnails;
    return this.thumbnails = document.getElementById('thumbnails');
  },

  get photos() {
    delete this.photos;
    return this.photos = document.getElementById('photos');
  },

  get playerControls() {
    delete this.playerControls;
    return this.playerControls = document.getElementById('player-controls');
  },

  get backButton() {
    delete this.backButton;
    return this.backButton = document.getElementById('back-button');
  },

  get slideshowButton() {
    delete this.slideshowButton;
    return this.slideshowButton = document.getElementById('play-button');
  },

  init: function galleryInit() {
    this.thumbnails.addEventListener('click', (function thumbnailsClick(evt) {
      var target = evt.target;
      if (!target || !target.classList.contains('thumbnailHolder'))
        return;

      this.showPhotos(target.dataset);
    }).bind(this));

    this.physics = createPhysicsFor(this);
    AddEventHandlers(this.photos, this, ['touchstart', 'touchmove', 'touchend']);

    this.backButton.addEventListener('click', (function backButtonClick(evt) {
      this.stopSlideshow();
      this.showThumbnails();
    }).bind(this));

    this.slideshowButton.addEventListener('click', (function slideshowClick() {
      if (this.slideshowTimer)
        this.stopSlideshow();
      else
        this.startSlideshow();
    }).bind(this));

    window.addEventListener('keyup', (function keyPressHandler(evt) {
      if (this.focusedPhoto && evt.keyCode == evt.DOM_VK_ESCAPE) {
        this.stopSlideshow();
        this.showThumbnails();
        evt.preventDefault();
      }
    }).bind(this), true);


    // Create the <img> elements for sample thumbnails and photos
    var self = this;
    SAMPLE_FILENAMES.forEach(function(filename) {
      var thumbnailURL = SAMPLE_THUMBNAILS_DIR + filename;
      var photoURL = SAMPLE_PHOTOS_DIR + filename;

      var li = document.createElement('li');
      li.dataset.filename = photoURL;
      li.dataset.index = self.thumbnails.childNodes.length;
      li.classList.add('thumbnailHolder');

      var img = document.createElement('img');
      img.src = thumbnailURL;
      img.classList.add('thumbnail');
      li.appendChild(img);

      self.thumbnails.appendChild(li);

      var div = document.createElement('div');
      div.id = filename;

      var img = document.createElement('img');
      img.src = photoURL;
      img.classList.add('photo');
      div.appendChild(img);

      self.photos.appendChild(div);
    });
  },

  showThumbnails: function galleryShowThumbnails() {
    this.thumbnails.classList.remove('hidden');
    this.photos.classList.add('hidden');
    this.playerControls.classList.add('hidden');
    this.header.classList.remove('hidden');

    this.focusedPhoto = null;
    this.photoTransform = '';
  },

  showPhotos: function galleryShowPhotos(focusedPhoto) {
    this.thumbnails.classList.add('hidden');
    this.header.classList.add('hidden');
    this.photos.classList.remove('hidden');
    this.playerControls.classList.remove('hidden');
    this.focusedPhoto = true;
    this.currentPage = parseInt(focusedPhoto.index);

    this.pan(0);
  },

  toggleControls: function galleryToggleControls() {
    this.playerControls.classList.toggle('hidden');
  },

  // Touch handling
  pan: function galleryPan(x, duration) {
    var db = this.db;

    var pages = this.photos.childNodes;
    var thumbnails = this.thumbnails.childNodes;
    var currentPage = this.currentPage;
    for (var p = 0; p < pages.length; ++p) {
      var page = pages[p];
      var style = page.style;
      // -1 because the pages are positioned offscreen to the right,
      // by the width of a page right
      var pageOffset = (p - currentPage) - 1;
      style.MozTransform = 'translate(-moz-calc('+ pageOffset +'00% + '+ x +'px))';
      style.MozTransition = duration ? ('all '+ duration + 's ease') : '';
    }
  },

  setPage: function(number, duration) {
    var pages = this.photos.childNodes;
    if (number < 0)
      number = 0;
    else if (number >= pages.length)
      number = pages.length - 1;
    this.currentPage = number;
    this.pan(0, duration);
  },

  tap: function() {
    this.toggleControls();
  },

  handleEvent: function(e) {
    var physics = this.physics;
    switch (e.type) {
    case 'touchstart':
      physics.onTouchStart(e.touches[0]);
      break;
    case 'touchmove':
      physics.onTouchMove(e.touches[0]);
      break;
    case 'touchend':
      document.releaseCapture();
      physics.onTouchEnd(e.changedTouches[0]);
      break;
    default:
      return;
    }
    e.preventDefault();
  },

  startSlideshow: function() {
    // If we're already displaying the last slide, then move to the first
    var lastPage = this.photos.childNodes.length - 1;
    var currentPage = this.currentPage;
    if (currentPage === lastPage)
      this.setPage(0, this.SLIDE_TRANSITION/1000);
      
    // Now schedule the next slide
    var self = this;
    this.slideshowTimer = setTimeout(function() { self.nextSlide(); },
                                     this.SLIDE_INTERVAL);
    this.slideshowButton.classList.add('playing');
  },

  stopSlideshow: function() {
    if (this.slideshowTimer) {
      clearTimeout(this.slideshowTimer);
      this.slideshowTimer = null;
    }
    this.slideshowButton.classList.remove('playing');
  },

  nextSlide: function() {
    var lastPage = this.photos.childNodes.length - 1;
    var currentPage = this.currentPage;

    // Move to the next slide if we're not already on the last one
    if (currentPage < lastPage) {
      this.setPage(++currentPage, this.SLIDE_TRANSITION/1000);
    }

    // If we're still not on the last one, then schedule another slide
    // Otherwise, stop the slideshow
    if (currentPage < lastPage) {
      var self = this;
      this.slideshowTimer = setTimeout(function() { self.nextSlide(); },
                                       this.SLIDE_INTERVAL);
    }
    else {
      this.slideshowTimer = null;
      this.stopSlideshow();
    }
  }
};

window.addEventListener('DOMContentLoaded', function GalleryInit() {
  Gallery.init();
  window.parent.postMessage('appready', '*');
});
