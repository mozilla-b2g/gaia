'use strict';

//
// This file defines a single metadataParsers object. The two
// properties of this object are metadata parsing functions for image
// files and video files, intended for use with the MediaDB class.
//
// This file depends on JPEGMetadataParser.js and blobview.js
//
var metadataParsers = (function() {
  // If we generate our own thumbnails, aim for this size
  var THUMBNAIL_WIDTH = 120;
  var THUMBNAIL_HEIGHT = 120;

  // Don't try to decode image files bigger than this
  var MAX_IMAGE_FILE_SIZE = 3 * 1024 * 1024;  // 3 megabytes

  // Don't try to open images with more pixels than this
  var MAX_IMAGE_PIXEL_SIZE = 5 * 1024 * 1024; // 5 megapixels

  // <img> and <video> elements for loading images and videos
  var offscreenImage = new Image();
  var offscreenVideo = document.createElement('video');

  // Create a thumbnail size canvas, copy the <img> or <video> into it
  // cropping the edges as needed to make it fit, and then extract the
  // thumbnail image as a blob and pass it to the callback.
  // This utility function is used by both the image and video metadata parsers
  function createThumbnailFromElement(elt, video, rotation, callback) {
    // Create a thumbnail image
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    canvas.width = THUMBNAIL_WIDTH;
    canvas.height = THUMBNAIL_HEIGHT;
    var eltwidth = video ? elt.videoWidth : elt.width;
    var eltheight = video ? elt.videoHeight : elt.height;
    var scalex = canvas.width / eltwidth;
    var scaley = canvas.height / eltheight;

    // Take the larger of the two scales: we crop the image to the thumbnail
    var scale = Math.max(scalex, scaley);

    // Calculate the region of the image that will be copied to the
    // canvas to create the thumbnail
    var w = Math.round(THUMBNAIL_WIDTH / scale);
    var h = Math.round(THUMBNAIL_HEIGHT / scale);
    var x = Math.round((eltwidth - w) / 2);
    var y = Math.round((eltheight - h) / 2);

    // If a rotation is specified, rotate the canvas context
    if (rotation) {
      context.save();
      switch (rotation) {
      case 90:
        context.translate(THUMBNAIL_WIDTH, 0);
        context.rotate(Math.PI / 2);
        break;
      case 180:
        context.translate(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
        context.rotate(Math.PI);
        break;
      case 270:
        context.translate(0, THUMBNAIL_HEIGHT);
        context.rotate(-Math.PI / 2);
        break;
      }
    }

    // Draw that region of the image into the canvas, scaling it down
    context.drawImage(elt, x, y, w, h,
                      0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);

    // Restore the default rotation so the play arrow comes out correctly
    if (rotation) {
      context.restore();
    }

    // If this is a video, superimpose a translucent play button over
    // the captured video frame to distinguish it from a still photo thumbnail
    if (video) {
      // First draw a transparent gray circle
      context.fillStyle = 'rgba(0, 0, 0, .2)';
      context.beginPath();
      context.arc(THUMBNAIL_WIDTH / 2, THUMBNAIL_HEIGHT / 2,
                  THUMBNAIL_HEIGHT / 5, 0, 2 * Math.PI, false);
      context.fill();

      // Now outline the circle in white
      context.strokeStyle = 'rgba(255,255,255,.6)';
      context.lineWidth = 2;
      context.stroke();

      // And add a white play arrow.
      context.beginPath();
      context.fillStyle = 'rgba(255,255,255,.6)';
      // The height of an equilateral triangle is sqrt(3)/2 times the side
      var side = THUMBNAIL_HEIGHT / 5;
      var triangle_height = side * Math.sqrt(3) / 2;
      context.moveTo(THUMBNAIL_WIDTH / 2 + triangle_height * 2 / 3,
                     THUMBNAIL_HEIGHT / 2);
      context.lineTo(THUMBNAIL_WIDTH / 2 - triangle_height / 3,
                     THUMBNAIL_HEIGHT / 2 - side / 2);
      context.lineTo(THUMBNAIL_WIDTH / 2 - triangle_height / 3,
                     THUMBNAIL_HEIGHT / 2 + side / 2);
      context.closePath();
      context.fill();
    }

    canvas.toBlob(function(blob) {
      // This setTimeout is here in the hopes that it gives gecko a bit
      // of time to release the memory that holds the decoded image before
      // we start creating the next thumbnail.
      setTimeout(function() {
        callback(blob);
      });
    }, 'image/jpeg');
  }

  function imageMetadataParser(file, metadataCallback, metadataError) {
    if (file.type !== 'image/jpeg') {
      // For any kind of image other than JPEG, we just have to get
      // our metadata with an <img> tag
      getImageSizeAndThumbnail(file, metadataCallback, metadataError);
      return;
    }
    else { // This is the jpeg case
      parseJPEGMetadata(file, function(metadata) {

        // If the image is too big, reject it now so we don't have
        // memory trouble later.
        if (metadata.width * metadata.height > MAX_IMAGE_PIXEL_SIZE) {
          metadataError('Ignoring high-resolution image ' + file.name);
          return;
        }

        // If the file included a preview image, use that to
        // create a thumbnail. Otherwise, get the size and thumbnail
        // from an offscreen image
        if (metadata.preview) {
          // Create a blob that is just the preview image
          var previewblob = file.slice(metadata.preview.start,
                                       metadata.preview.end,
                                       'image/jpeg');
          getImageSizeAndThumbnail(previewblob,
                                   function(m) {
                                     metadata.preview.width = m.width;
                                     metadata.preview.height = m.height;
                                     metadata.thumbnail = m.thumbnail;
                                     metadataCallback(metadata);
                                   },
                                   function(errmsg) {
                                     // If something went wrong with the
                                     // preview blob, then fall back on
                                     // the full-size image
                                     console.warn('Error creating thumbnail' +
                                                  ' from preview:', errmsg);
                                     getImageSizeAndThumbnail(file,
                                                              metadataCallback,
                                                              metadataError);
                                   });

        }
        else {
          // If there wasn't a preview image, then generate one from
          // the full size image.
          getImageSizeAndThumbnail(file, metadataCallback, metadataError);
        }
      }, function(errmsg) {
        // If we couldn't parse the JPEG file, then try again with
        // an <img> element. This will probably fail, too.
        console.warn('In parseJPEGMetadata:', errmsg);
        getImageSizeAndThumbnail(file, metadataCallback, metadataError);
      });
    }
  }

  // Load an image from a file into an <img> tag, and then use that
  // to get its dimensions and create a thumbnail.  Store these values in
  // an metadata object, and pass the object to the callback function.
  // If anything goes wrong, pass an error message to the error function.
  function getImageSizeAndThumbnail(file, callback, error) {
    // If the file size is too big it might not actually be an image file
    // or it might be too big for us to process without memory problems.
    // So we're not even going to try.
    if (file.size > MAX_IMAGE_FILE_SIZE) {
      error('Ignoring large file ' + file.name);
      return;
    }

    var metadata = {};
    var url = URL.createObjectURL(file);
    offscreenImage.src = url;

    offscreenImage.onerror = function() {
      URL.revokeObjectURL(url);
      offscreenImage.removeAttribute('src');
      error('getImageSizeAndThumbnail: Image failed to load');
    };

    offscreenImage.onload = function() {
      URL.revokeObjectURL(url);
      metadata.width = offscreenImage.width;
      metadata.height = offscreenImage.height;

      // If the image was already thumbnail size, it is its own thumbnail
      if (metadata.width <= THUMBNAIL_WIDTH &&
          metadata.height <= THUMBNAIL_HEIGHT) {
        offscreenImage.removeAttribute('src');
        //
        // XXX
        // Because of a gecko bug, we can't just store the image file itself
        // we've got to create an equivalent but distinct blob.
        // When https://bugzilla.mozilla.org/show_bug.cgi?id=794619 is fixed
        // the line below can change to just assign file.
        //
        metadata.thumbnail = file.slice(0, file.size, file.type);
        callback(metadata);
      }
      else {
        createThumbnailFromElement(offscreenImage, false, 0,
                                   function(thumbnail) {
                                     metadata.thumbnail = thumbnail;
                                     offscreenImage.removeAttribute('src');
                                     callback(metadata);
                                   });
      }
    }
  }

  function videoMetadataParser(file, metadataCallback, errorCallback) {
    try {
      if (file.type && !offscreenVideo.canPlayType(file.type)) {
        errorCallback("can't play video file type: " + file.type);
        return;
      }

      var url = URL.createObjectURL(file);

      offscreenVideo.preload = 'metadata';
      offscreenVideo.style.width = THUMBNAIL_WIDTH + 'px';
      offscreenVideo.style.height = THUMBNAIL_HEIGHT + 'px';
      offscreenVideo.src = url;

      offscreenVideo.onerror = function() {
        URL.revokeObjectURL(url);
        offscreenVideo.onerror = null;
        offscreenVideo.src = null;
        errorCallback('not a video file');
      }

      offscreenVideo.onloadedmetadata = function() {
        var metadata = {};
        metadata.video = true;
        metadata.duration = offscreenVideo.duration;
        metadata.width = offscreenVideo.videoWidth;
        metadata.height = offscreenVideo.videoHeight;
        metadata.rotation = 0;

        // If this is a .3gp video file, look for its rotation matrix and
        // then create the thumbnail. Otherwise set rotation to 0 and
        // create the thumbnail.
        // getVideoRotation is defined in shared/js/media/get_video_rotation.js
        if (file.name.substring(file.name.lastIndexOf('.') + 1) === '3gp') {
          getVideoRotation(file, function(rotation) {
            if (typeof rotation === 'number')
              metadata.rotation = rotation;
            else if (typeof rotation === 'string')
              console.warn('Video rotation:', rotation);
            createThumbnail();
          });
        }
        else {
          createThumbnail();
        }

        function createThumbnail() {
          offscreenVideo.currentTime = 1; // read 1 second into video
          offscreenVideo.onseeked = function onseeked() {
            createThumbnailFromElement(offscreenVideo, true, metadata.rotation,
                                       function(thumbnail) {
                                         URL.revokeObjectURL(url);
                                         offscreenVideo.onerror = null;
                                         offscreenVideo.onseeked = null;
                                         offscreenVideo.removeAttribute('src');
                                         offscreenVideo.load();
                                         metadata.thumbnail = thumbnail;
                                         metadataCallback(metadata);
                                       });
          };
        }
      };
    }
    catch (e) {
      console.error('Exception in videoMetadataParser', e, e.stack);
      errorCallback('Exception in videoMetadataParser');
    }
  }

  return {
    imageMetadataParser: imageMetadataParser,
    videoMetadataParser: videoMetadataParser
  };
}());
