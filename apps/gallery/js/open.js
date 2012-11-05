window.onload = function() {
  navigator.mozSetMessageHandler('activity', handleOpenActivity);
};

function handleOpenActivity(request) {
  var blob = request.source.data.blob;
  var frame = document.getElementById('open-frame');
  var image = document.getElementById('open-image');
  var backButton = document.getElementById('open-back-button');
  var toolbar = document.getElementById('open-toolbar');
  var cameraButton = document.getElementById('open-camera-button');
  var deleteButton = document.getElementById('open-delete-button');
  var gestureDetector = new GestureDetector(frame);
  var photoState;

  // If the request is from the camera, show the toolbar with the camera
  // and delete buttons on it. Otherwise, leave it hidden
  if (request.source.data.show_delete_button) {
    toolbar.style.display = 'block';
  }

  // display the image
  var url = URL.createObjectURL(blob);
  image.src = url;
  image.onload = function() {
    URL.revokeObjectURL(url);
    var fit = PhotoState.fitImage(image.naturalWidth,
                                  image.naturalHeight,
                                  frame.offsetWidth,
                                  frame.offsetHeight);
    PhotoState.positionImage(image, fit);

    photoState = new PhotoState(image, image.naturalWidth, image.naturalHeight);

    // Set up events
    gestureDetector.startDetecting();
    backButton.addEventListener('click', handleBackButton);
    cameraButton.addEventListener('click', handleCameraButton);
    deleteButton.addEventListener('click', handleDeleteButton);
    //  deleteButton.addEventListener('click', handleDeleteButton);
    frame.addEventListener('dbltap', handleDoubleTap);
    frame.addEventListener('transform', handleTransform);
    frame.addEventListener('pan', handlePan);
    frame.addEventListener('swipe', handleSwipe);
  };

  function done(result) {
    if (request) {
      request.postResult(result || {});
      request = null;
    }
  }

  function handleBackButton() {
    done();
  }
  function handleCameraButton() {
    done({'delete': false});
  }
  function handleDeleteButton() {
    done({'delete': true});
  }

  function handleDoubleTap(e) {
    var scale;
    if (photoState.fit.scale > photoState.fit.baseScale)
      scale = photoState.fit.baseScale / photoState.fit.scale;
    else
      scale = 2;

    photoState.zoom(scale, e.detail.clientX, e.detail.clientY, 200);
  }

  function handleTransform(e) {
    photoState.zoom(e.detail.relative.scale,
                    e.detail.midpoint.clientX,
                    e.detail.midpoint.clientY);
  }

  function handlePan(e) {
    photoState.pan(e.detail.relative.dx, e.detail.relative.dy);
  }

  function handleSwipe(e) {
    var direction = e.detail.direction;
    var velocity = e.detail.vy;
    if (direction === 'down' && velocity > 2)
      done();
  }
}
