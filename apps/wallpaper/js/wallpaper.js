
var Wallpaper = {
  init: function wp_init() {
    this.activityListener();
    window.addEventListener('click', this);
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
        if (!target || !target.classList.contains('thumbnail'))
          return;
        this.showPhoto(parseInt(target.dataset.index));
        break;
    }
  },
  activityListener: function wp_activityListener() {
    if(!navigator.mozSetMessageHandler)
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
    this.setView(pickView);
  },
  finishPick: function wp_finishPick(filename) {
    this.pendingPick.postResult({
      type: 'image/jpeg',
      filename: filename
    });
    this.pendingPick = null;
    this.setView(thumbnailListView);
  },
  cancelPick: function wp_cancelPick() {
    this.pendingPick.postError('pick cancelled');
    this.pendingPick = null;
    this.setView(thumbnailListView);
  },
  // Switch from thumbnail list view to single-picture view
  // and display the specified photo.
  showPhoto: function wp_showPhoto(n) {
    this.setView(photoView); // Switch to photo view mode if not already there
    this.displayImageInFrame(n, currentPhotoFrame);
  },
  displayImageInFrame: function wp_displayImageInFrame(n, frame) {
    // Make sure n is in range
    if (n < 0 || n >= this.images.length)
      return;

    var img = frame.firstChild;

    // Asynchronously set the image url
    var imagedata = images[n];
    photodb.getFile(imagedata.name, function(file) {
      var url = URL.createObjectURL(file);
      img.src = url;
      img.onload = function() { URL.revokeObjectURL(url); };
    });

    // Figure out the size and position of the image
    var fit = fitImageToScreen(images[n].metadata.width,
                             images[n].metadata.height);
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
      case thumbnailListView:
        view.appendChild(thumbnails);
        thumbnails.style.width = '';
        break;
      case photoView:
        // photoView is a special case because we need to insert
        // the thumbnails into the filmstrip container and set its width
        $('photos-filmstrip').appendChild(thumbnails);
        // In order to get a working scrollbar, we apparently have to specify
        // an explict width for list of thumbnails.
        // XXX: we need to update this when images are added or deleted.
        // XXX: avoid using hardcoded 50px per image?
        thumbnails.style.width = (images.length * 50) + 'px';
        break;
    }
    // Remember the current view
    this.currentView = view;
  }
}

function destroyUI() {
  images = [];
};

Wallpaper.init();
