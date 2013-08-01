/*
 * When the Camera app is invoked by a "pick" activity, it uses this module
 * to allow the user to preview the photo they just took or the video they
 * just recorded. The user is given the choice to select (i.e. pick) the
 * photo or video or to reject and retake it.
 *
 * This module uses shared/js/media/media_frame.js, so the user should
 * have the ability to zoom and pan the photo and play the video before
 * making their decision.
 */
var ConfirmDialog = (function() {

  // These are the document elements we need
  var confirm = document.getElementById('confirm');
  var mediaFrame = document.getElementById('confirm-media-frame');
  var retakeButton = document.getElementById('retake-button');
  var selectButton = document.getElementById('select-button');

  // Create the MediaFrame for confirmations
  var frame = new MediaFrame(mediaFrame);

  // Enable panning and zooming for images
  addPanAndZoomHandlers(frame);

  // confirmImage() and confirmVideo() store the callback functions
  // in these variables so that the button callbacks can invoke them
  var retakecb, selectcb;

  // Event handlers for the two buttons
  retakeButton.onclick = function() {
    confirm.hidden = true;
    retakecb();
  };
  selectButton.onclick = function() {
    confirm.hidden = true;
    selectcb();
  };

  function confirmImage(blob, selectCallback, retakeCallback) {
    selectcb = selectCallback;
    retakecb = retakeCallback;

    parseJPEGMetadata(blob, function(metadata) {
      // Show the confirm pane
      confirm.hidden = false;
      frame.displayImage(blob, metadata.width, metadata.height,
                         metadata.preview);
    });
  }

  function confirmVideo(blob, posterBlob, width, height, rotation,
                        selectCallback, retakeCallback)
  {
    selectcb = selectCallback;
    retakecb = retakeCallback;
    // Show the dialog and then display the video in it.
    // We have to do it in this order, or the video won't display correctly.
    confirm.hidden = false;
    frame.displayVideo(blob, posterBlob, width, height, rotation);
  }

  // Export the public functions of this module
  return {
    confirmImage: confirmImage,
    confirmVideo: confirmVideo
  };
})();
