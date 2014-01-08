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
      // If we found an EXIF preview, and can determine its size, then
      // we can display it instead of the big image and save memory and time.
      if (metadata.preview) {
        parseJPEGMetadata(blob.slice(metadata.preview.start,
                                     metadata.preview.end,
                                     'image/jpeg'),
                          function success(previewmetadata) {
                            // If we parsed the preview image, add its
                            // dimensions to the metdata.preview
                            // object, and then let the MediaFrame
                            // object display the preview instead of
                            // the full-size image.
                            metadata.preview.width = previewmetadata.width;
                            metadata.preview.height = previewmetadata.height;
                            display();
                          },
                          function error() {
                            // If we couldn't parse the preview image,
                            // just display full-size.
                            display();
                          });
      }
      else {
        display();
      }

      function display() {
        // Show the confirm pane
        confirm.hidden = false;

        frame.displayImage(blob, metadata.width, metadata.height,
                           metadata.preview, metadata.rotation,
                           metadata.mirrored);
      }
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

  function isShowing() {
    return !confirm.hidden;
  }

  // Export the public functions of this module
  return {
    confirmImage: confirmImage,
    confirmVideo: confirmVideo,
    isShowing: isShowing
  };
})();
