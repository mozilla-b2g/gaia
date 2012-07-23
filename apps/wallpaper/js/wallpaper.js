'use strict';

var Wallpaper = {
  images: [],

  getAllElements: function md_getAllElements() {
    var elementsID = ['thumbnails', 'thumbnail-vist-view',
        'photo-view', 'photo-filmstrip', 'photo-frame', 'current-frame'];

    var toCamelCase = function toCamelCase(str) {
      return str.replace(/\-(.)/g, function replacer(str, p1) {
        return p1.toUpperCase();
      });
    };

    // Loop and add element with camel style name to Modal Dialog attribute.
    elementsID.forEach(function createElementRef(name) {
      this.elements[toCamelCase(name)] =
        document.getElementById(this.prefix + name);
    }, this);

    this.screen = document.getElementById('screen');
  },

  init: function wp_init() {
    this.createThumbnailList();
    //this.activityListener();
    this.getAllElements();

    console.log(this.thumbnails,'=====');
    this.thumbnails.addEventListener('click', this);

    window.addEventListener('mozvisibilitychange', this);
    window.addEventListener('resize', this);
  },

  handleEvent: function wp_handleEvent(evt) {
    switch(evt.type) {
      case 'mozvisibilitychange':
        this.cancelPick();
        break;
      case 'click':
        var target = evt.target;
        console.warn('======', target.dataset.index);
        if (!target || !target.classList.contains('thumbnail'))
          return;
        this.showPhoto(parseInt(target.dataset.index));
        break;
    }
  },

  activityListener: function wp_activityListener() {
    if(!navigator.mozSetMessageHandler || false)
      return;

    navigator.mozSetMessageHandler('activity', function(activityRequest) {
      if (this.pendingPick)
        this.cancelPick();
      
      var activityName = activityRequest.source.name;
      
      switch (activityName) {
        case 'pick':
          this.startPick(activityRequest);
          break;
      }
    });
  },

  startPick: function wp_startPick(activityRequest) {
    this.pendingPick = activityRequest;
    this.setView(this.pickView);
  },

  finishPick: function wp_finishPick(filename) {
    this.pendingPick.postResult({
      type: 'image/jpeg',
      filename: filename
    });
    this.pendingPick = null;
    this.setView(this.thumbnailListView);
  },

  cancelPick: function wp_cancelPick() {
    this.pendingPick.postError('pick cancelled');
    this.pendingPick = null;
    this.setView(this.thumbnailListView);
  },
  
  // Switch from thumbnail list view to single-picture view
  // and display the specified photo.
  showPhoto: function wp_showPhoto(n) {
    this.setView(this.photoView); // Switch to photo view mode if not already there
    this.displayImageInFrame(n);
  },
  
  displayImageInFrame: function wp_displayImageInFrame(n) {
    // Make sure n is in range
    if (n < 0 || n >= this.images.length)
      return;

    var img = this.currentFrame.firstChild;
    img.src = images.src;

    // Figure out the size and position of the image
    var fit = fitImage(this.images[n].width,
                             this.images[n].height);
    var style = img.style;
    style.width = fit.width + 'px';
    style.height = fit.height + 'px';
    style.left = fit.left + 'px';
    style.top = fit.top + 'px';
  },
  
  crop: function wp_crop(url) {
  },

  setView: function wp_setView(view) {
    if (this.currentView === view)
      return;

    // Show the specified view, and hide the others
    for (var i = 0; i < views.length; i++) {
      if (views[i] === view)
        views[i].classList.remove('hidden');
      else
        views[i].classList.add('hidden');
    }

    // Now do setup for the view we're entering
    // In particular, we've got to move the thumbnails list into each view
    switch (view) {
      case this.thumbnailListView:
        view.appendChild(this.thumbnails);
        this.thumbnails.style.width = '';
        break;
      case this.photoView:
        // photoView is a special case because we need to insert
        // the thumbnails into the filmstrip container and set its width
        this.photosFilmstrip.appendChild(this.thumbnails);
        // In order to get a working scrollbar, we apparently have to specify
        // an explict width for list of thumbnails.
        // XXX: we need to update this when images are added or deleted.
        // XXX: avoid using hardcoded 50px per image?
        this.thumbnails.style.width = (this.images.length * 50) + 'px';
        break;
    }
    // Remember the current view
    this.currentView = view;
  },
  
  createThumbnailList: function wp_createThumbnailList() {
    var self = this;
    var defaultWallpapers = document.querySelectorAll('#thumbnails li');
    console.log(defaultWallpapers.length,'=====');
    for (var i = 0; i < defaultWallpapers.length; i++) {
      var src = defaultWallpapers[i].style.backgroundImage;
      src = src.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
      console.log('=====',src);
      var img = new Image();
      img.onload = function getWH() {
        self.images.push({ src: src, width: img.width, height: img.height });
        console.log('====={ src: '+src+', width: '+img.width+', height: '+img.height+'}');
      };
      img.src = src;
    }
  },

  // figure out the size and position of an image based on its size
  // and the screen size.
  fitImage: function wp_fitImage(photoWidth, photoHeight, viewportWidth, viewportHeight) {
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
      scale: scale
    };
  }
}

Wallpaper.init();
