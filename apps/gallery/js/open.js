window.onload = function() {
  navigator.mozSetMessageHandler('activity', handleOpenActivity);
};

function handleOpenActivity(request) {
  var blob = request.source.data.blob;
  var frame = new MediaFrame(document.getElementById('open-frame'), false);
  var backButton = document.getElementById('open-back-button');
  var toolbar = document.getElementById('open-toolbar');
  var cameraButton = document.getElementById('open-camera-button');
  var deleteButton = document.getElementById('open-delete-button');
  var gestureDetector = new GestureDetector(frame.container);
  var photoState;

  // If the request is from the camera, show the toolbar with the camera
  // and delete buttons on it. Otherwise, leave it hidden
  if (request.source.data.show_delete_button) {
    toolbar.style.display = 'block';
  }

  // display the image
  frame.displayImage(blob);

  // Set up events
  backButton.addEventListener('click', handleBackButton);
  if (request.source.data.show_delete_button) {
    cameraButton.addEventListener('click', handleCameraButton);
    deleteButton.addEventListener('click', handleDeleteButton);
  }

  gestureDetector.startDetecting();
  frame.container.addEventListener('dbltap', handleDoubleTap);
  frame.container.addEventListener('transform', handleTransform);
  frame.container.addEventListener('pan', handlePan);
  frame.container.addEventListener('swipe', handleSwipe);

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
    if (frame.fit.scale > frame.fit.baseScale)
      scale = frame.fit.baseScale / frame.fit.scale;
    else
      scale = 2;

    frame.zoom(scale, e.detail.clientX, e.detail.clientY, 200);
  }

  function handleTransform(e) {
    frame.zoom(e.detail.relative.scale,
               e.detail.midpoint.clientX,
               e.detail.midpoint.clientY);
  }

  function handlePan(e) {
    frame.pan(e.detail.relative.dx, e.detail.relative.dy);
  }

  function handleSwipe(e) {
    var direction = e.detail.direction;
    var velocity = e.detail.vy;
    if (direction === 'down' && velocity > 2)
      done();
  }
}
