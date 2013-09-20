/*
 * This is an implementation of the OMA Download specification:
 * http://technical.openmobilealliance.org/Technical/release_program/docs/Download/V1_0-20040625-A/OMA-Download-OTA-V1_0-20040625-A.pdf
 *
 * It downloads and installs locked wallpaper, ringtones and songs
 * roughly following these steps:
 *
 * 1) Download a download descriptor from the specified URL
 *   - onerror: display a message to the user and abort the activity
 *
 * 2) Validate and parse the download descriptor
 *   - extract all the required and optional tags from the descriptor document
 *   - if it doesn't contain the tags we expect, display an error message
 *     and abort the activity.
 *   - if the version number is wrong, display an error, report the failure,
 *     and abort the activity.
 *
 * 3) Check types
 *   - If we can't handle any of the types specified in the descriptor,
 *     report a failure to the server, display an error to the user and abort.
 *   - For audio files, ask the user if they want to use them as a ringtone
 *     or as a song
 *
 * 4) Confirm download and use of media
 *   - Display name, vendor, type, size, etc. to the user, remind them
 *     that the content will be locked (and that they may be charged for
 *     it) and ask them to confirm that they want to download.
 *   - If the user cancels, report that to the server and abort the activity.
 *
 * 5) Download content
 *   - Display a progress meter and cancel button
 *   - If the user clicks cancel, report to server and abort the activity.
 *
 * 6) Extract the content, if necessary
 *   - If the content type is a DRM message, then it is in multi-part
 *     MIME format and we have to extract the first part, using the boundary
 *     string from the response headers.
 *   - If extracting the content fails, notify the server and user and abort
 *
 * 7) Allow the user to preview the downloaded files
 *   - if the file cannot be loaded or played, abort with an error
 *   - otherwise, show a small image, or play part of the audio
 *     to the user and allow them to click Cancel or Install.
 *
 * 8) Install the content
 *   - For wallpapers and ringtones, save to the database
 *   - For music, encrypt the file and save to device storage
 *   - If this fails, report errors and abort
 *   - Report success to the server
 *   - For ringtones and wallpaper, set them as the default
 */

// Wait until we're loaded, localized, and get an activity request
window.addEventListener('load', function() {
  navigator.mozL10n.ready(function() {
    navigator.mozSetMessageHandler('activity', view);
  });
});


//
// This function is invoked with a view activity for MIME type
// application/vnd.oma.dd+xml and activity.source.data.url set to the
// url of the download descriptor ".dd" file.
//
function view(activity) {
  debug('view() invoked for activity', activity.source.name,
        'with data', JSON.stringify(activity.source.data));

  var descriptor = {};  // The parsed form of the download descriptor
  var mimeType;         // Set by checkType() to the primary media type
  var isImage = false;  // These are also set by checkType()
  var isAudio = false;
  var installType;      // Wallpaper, ringtone or song.

  function reportError(type, errorID, downloadStatus, details) {
    // Report to the console
    console.error(type, errorID, downloadStatus, details);

    // Report to the server, if necessary
    if (downloadStatus) {
      sendStatus(downloadStatus);
    }

    details = '[' + (details ? errorID + ': ' + details : errorID) + ']';

    // Display error to the user
    showDialog({
      title: _(type) || type,
      message: _(errorID),
      details: details,
      okCallback: function() {
        // Cancel the activity after the user has seen the error message.
        activity.postError(errorID);
      }
    });
  }

  function reportSuccess(successID) {
    // This is a "well-intentioned attempt" to send the success code.
    sendStatus(OMADownloadStatus.success);

    showDialog({
      message: _(successID) || successID,
      okCallback: function() {
        // Return from the activity after the user has seen the error message.
        activity.postResult({ success: true });
      }
    });
  }

  function sendStatus(status, callback) {
    // If the descriptor contained an installNotifyURI, then we need to
    // report errors by posting to that URL
    if (descriptor.installNotifyURI) {
      var xhr = new XMLHttpRequest(systemXHR);
      xhr.open('POST', descriptor.installNotifyURI);
      xhr.timeout = 1000; // wait up to a second for a response
      xhr.send(status);
      // If there is a callback, call it on success, error or timeout
      if (callback) {
        xhr.onloadend = function() { callback(); };
      }
    }
    else if (callback) {
      callback();
    }
  }

  // We start by downloading the url passed with the activity request
  downloadDescriptor(activity.source.data.url);

  // Step 1: download the download descriptor
  function downloadDescriptor(descriptorURL) {
    debug('Step 1: downloading descriptor from', descriptorURL);
    var xhr = new XMLHttpRequest(systemXHR);
    xhr.open('GET', descriptorURL);
    xhr.responseType = 'document';     // Parse it as an XML document
    xhr.send();

    xhr.onerror = function(e) {
      reportError(DOWNLOAD_ERROR, ERR_DESCRIPTOR_DOWNLOAD_FAILED, null,
                  xhr.status + ' ' + xhr.statusText);
    };

    xhr.onload = function() {
      // When we get the descriptor, go to step 2
      // The setTimeout() may not be necessary here. The intent is to ensure
      // that this XHR is complete before we begin downloading the .dm file.
      setTimeout(function() {
        parse(xhr.response);
      });
    };
  }

  // Step 2: Parse and validate the download descriptor document
  //
  // The format of the download descriptor is defined in
  //   http://technical.openmobilealliance.org/Technical/release_program/docs/
  //        Download/V1_0-20040625-A/OMA-Download-OTA-V1_0-20040625-A.pdf
  //
  function parse(document) {

    // Get all the types listed for this content
    var types = document.getElementsByTagName('type');
    if (types) {
      descriptor.types = [];
      for (var i = 0; i < types.length; i++) {
        descriptor.types.push(types[i].textContent.trim());
      }
    }

    // A utility function for parsing the rest of the descriptor
    function get(tag) {
      var elts = document.getElementsByTagName(tag);
      if (elts && elts.length)
        descriptor[tag] = elts[0].textContent.trim();
    }

    // Get the other properties, ignoring nextURL, infoURL, iconURI,
    // and installParam (which are all optional)
    get('size');
    get('objectURI');
    get('installNotifyURI');
    get('DDVersion');
    get('name');
    get('description');
    get('vendor');

    debug('Step 2: parse descriptor:', JSON.stringify(descriptor));

    // If any of the required attributes are missing, then report an error
    if (!descriptor.types || descriptor.types.length === 0 ||
        !descriptor.size || !descriptor.objectURI)
    {
      reportError(DOWNLOAD_ERROR, ERR_BAD_DESCRIPTOR,
                  OMADownloadStatus.INVALID_DESCRIPTOR);
      return;
    }

    // If the size is too big, just abort now so we don't run out of
    // memory when we download the .dm file later
    if (descriptor.size > MAX_DOWNLOAD_SIZE) {
      reportError(DOWNLOAD_ERROR, ERR_TOO_BIG,
                  OMADownloadStatus.INSUFFICIENT_MEMORY,
                  MediaUtils.formatSize(descriptor.size));
      return;
    }

    // If the descriptor did not include a name, derive one from the URL
    if (!descriptor.name) {
      descriptor.name = descriptor.objectURI.split('/').pop();
      if (descriptor.name.endsWith('.dm'))  // Slice off the .dm suffix
        descriptor.name = descriptor.name.slice(0, -3);
    }

    // If the version number is too large, abort
    if (descriptor.DDVersion && parseInt(descriptor.DDVersion) > 1) {
      reportError(DOWNLOAD_ERROR, ERR_BAD_DESCRIPTOR,
                  OMADownloadStatus.INVALID_DDVERSION);
      return;
    }

    // Otherwise, move on to step 3
    checkTypes();
  }

  // Step 3: check that we can handle the types listed in the download
  // descriptor and abort with an error if we can't
  function checkTypes() {
    debug('Step 3: check types');
    var types = descriptor.types;

    for (var i = 0; i < types.length; i++) {
      var type = types[i];

      if (type === 'application/vnd.oma.drm.message') {
        // This type just indicates that the download will be a multi-part
        // MIME message body rather than the content directly.
        // We support it.
        continue;
      }

      if (type in SupportedImageTypes) {
        mimeType = type;
        isImage = true;
        continue;
      }

      if (type in SupportedAudioTypes) {
        mimeType = type;
        isAudio = true;
        continue;
      }

      reportError(DOWNLOAD_ERROR, ERR_UNSUPPORTED_TYPE,
                  OMADownloadStatus.NON_ACCEPTABLE_CONTENT,
                  type);
      return;
    }

    // We expect one media type plus one option DRM message ".dm" MIME
    // type.  If we didn't see a media type at all, that is an
    // error. And if we had more than two types, then the content is
    // some kind of composite thing that we don't know how to handle.
    if (types.length < 1 || types.length > 2 ||  // wrong number of types
        (isAudio && isImage) ||                  // both audio and image
        (!isAudio && !isImage)) {                // neither audio nor image
      reportError(DOWNLOAD_ERROR, ERR_BAD_TYPE,
                  OMADownloadStatus.NON_ACCEPTABLE_CONTENT);
      return;
    }

    // If this is an image, then we know we're downloading wallpaper
    // and can move on to the confirmation screen. For audio, we need
    // to ask the user if they want a ringtone or a song
    if (isImage) {
      installType = WALLPAPER;
      confirmDownload();
    }
    else {
      showDialog({
        message: _('ringtone-or-song-query'),
        okText: _('ringtone-response'),
        cancelText: _('song-response'),
        okCallback: function() {
          installType = RINGTONE;
          confirmDownload();
        },
        cancelCallback: function() {
          installType = SONG;
          confirmDownload();
        }
      });
    }
  }

  // Step 4: Let the user confirm or cancel the download
  function confirmDownload() {
    debug('Step 4: confirm download');

    // Customize the dialog title based on the installType
    var titleElement = $('download-confirmation-title');
    titleElement.textContent = _('download-confirmation-title-' + installType);

    // Display details from the descriptor
    $('download-confirmation-name').textContent = descriptor.name;
    $('download-confirmation-type').textContent = mimeType;
    $('download-confirmation-size').textContent =
      MediaUtils.formatSize(descriptor.size);
    // XXX: this might be too big to fit on the screen.
    $('download-confirmation-description').textContent = descriptor.description;

    // Display the Locked Content Advisory
    var lca;
    if (descriptor.vendor) {
      lca = _('locked-content-advisory', {
        vendor: descriptor.vendor
      });
    } else {
      lca = _('locked-content-advisory-generic');
    }
    $('locked-content-advisory-text').textContent = lca;

    // Hook up the Download button: if the user clicks it, go on to step 5
    $('download-confirm').onclick = function(e) {
      e.target.disabled = true; // Don't let the user click twice
      displayDownloadProgress();
    };

    // Hook up the Cancel button: if the user clicks it, report this to
    // the server and abort without displaying an error message to the user.
    $('download-cancel').onclick = function(e) {
      debug('download cancelled');
      $('download-confirmation').hidden = true;
      sendStatus(OMADownloadStatus.USER_CANCELLED, function() {
        activity.postError('cancelled');
      });
    };

    // Finally, make the confirmation screen visible
    $('download-confirmation').hidden = false;
  }

  // Step 5: download the content and display progress
  function displayDownloadProgress() {
    debug('Step 5: download content and display progress');

    // Change the dialog title from Download? to Downloading...
    var titleElement = $('download-confirmation-title');
    titleElement.textContent = _('downloading-' + installType);

    // Set the progress parameters and show the bar
    var bar = $('download-progress');
    bar.style.visibility = 'visible';
    bar.value = 0;
    bar.max = descriptor.size;

    debug('starting download for', descriptor.objectURI);


    var download = new XMLHttpRequest(systemXHR);
    download.open('GET', descriptor.objectURI);
    download.responseType = 'arraybuffer';
    download.send();

    download.onprogress = function(e) {
      bar.value = e.loaded;
    };

    // XXX This onerror function is being called with status 0 and statusText OK
    // It only happens sometimes. A caching thing? A bug in gecko?
    // There is no response body when this happends
    download.onerror = function() {
      reportError(DOWNLOAD_ERROR, ERR_CONTENT_DOWNLOAD_FAILED,
                  OMADownloadStatus.LOADER_ERROR,
                  download.status + ' ' + download.statusText);
    };

    download.onload = function() {
      // We're done downloading, so we can't cancel it anymore
      $('download-cancel').disabled = true;

      // Move on to step 6
      extractContent(download.getResponseHeader('Content-Type'),
                     download.response);
    };

    // Add another cancel button handler to abort the download if the
    // user clicks cancel
    $('download-cancel').addEventListener('click', function() {
      download.abort();
    });
  }

  // Step 6: extract the downloaded content from the array buffer
  function extractContent(type, buffer) {
    debug('Step 6a: extractContent', type, buffer.byteLength);

    if (type !== 'application/vnd.oma.drm.message') {
      // In this case, we already have the content and don't need to
      // extract anything. Move on to step 7
      previewContent(type, buffer);
      return;
    }

    // View the array buffer as if it was a binary string
    var dataString = new BinaryStringView(buffer);

    // If we're here, then dataString is a multipart message with a
    // boundary string at the start and end. There should be only one part
    // but we still must strip off the separators and extract the real
    // content type.  The type argument should specify the boundary string
    // but in practice it seems like it doesn't so we find it by examining
    // the end of the string.

    // Make sure there are no trailing newlines
    dataString = dataString.trim();

    function malformed(why) {
      if (why)
        debug('malformed drm message:', why);
      reportError(DOWNLOAD_ERROR, ERR_BAD_DRM_MESSAGE,
                  OMADownloadStatus.ATTRIBUTE_MISMATCH);
    }

    // The last two characters should be "--". If they are not, then
    // the content is malformed
    if (dataString.slice(-2).toString() !== '--')
      return malformed('missing trailing --');

    // Find the last newline.
    var end = dataString.lastIndexOf('\r\n');
    if (end === -1)
      return malformed('missing final \r\n');

    // The boundary string begins right after that newline
    var boundaryString = dataString.slice(end + 2, -2).toString() + '\r\n';
    var dataString = dataString.slice(0, end);

    debug('Boundary string is', boundaryString);

    // The first occurance of the boundary string is the start of
    // the content headers
    var headerStart =
      dataString.indexOf(boundaryString) + boundaryString.length;
    if (headerStart === -1)
      return malformed('missing boundary string at start');

    // If there are any more occurrances of the boundary string then
    // this is probably a .dm object for "combined delivery" and we
    // must reject it since we support only forward lock.
    if (dataString.indexOf(boundaryString, headerStart) !== -1)
      return malformed('more than one part');

    var contentStart = dataString.indexOf('\r\n\r\n', headerStart);
    if (contentStart === -1)
      return malformed('missing header separator');

    var headers = dataString.slice(headerStart,
                                   contentStart).toString().split('\r\n');
    var content = dataString.slice(contentStart + 4);

    debug('got first part headers:', JSON.stringify(headers));

    // find the content-type header for the content
    var contentType;
    for (var i = 0; i < headers.length; i++) {
      var header = headers[i].toLowerCase();
      if (header.startsWith('content-type:')) {
        contentType = header.substring(13).trim();
      }
    }

    if (!contentType)
      return malformed('no content-type header found in first part');

    debug('Found content in drm message file', contentType, content.length);
    previewContent(contentType, content.toArrayBuffer());
  }

  // Step 7
  function previewContent(type, bytes) {
    // If the content we found in the DRM message (.dm) file has a different
    // Content-Type than what we were expecting based on the .dd file
    // report an error.
    if (type !== mimeType) {
      reportError(DOWNLOAD_ERROR, ERR_BAD_DRM_MESSAGE,
                  OMADownloadStatus.ATTRIBUTE_MISMATCH);
      return;
    }

    switch (installType) {
    case SONG:
    case RINGTONE:
      previewAudio(type, bytes);
      return;
    case WALLPAPER:
      previewImage(type, bytes);
      return;
    }
  }

  function previewImage(type, bytes) {
    // Hide the confirmation screen and show the preview screen
    $('download-confirmation').hidden = true;
    $('preview-image-screen').hidden = false;

    // Load the image into an off-screen image
    var blob = new Blob([bytes], { type: type });
    var url = URL.createObjectURL(blob);
    var image = new Image();
    image.src = url;

    // If we can't load the image, abort with an error
    image.onerror = function() {
      URL.revokeObjectURL(url);
      reportError(INSTALL_ERROR, ERR_BAD_IMAGE,
                  OMADownloadStatus.NON_ACCEPTABLE_CONTENT);
      return;
    };

    // If the image loads successfully, use it as the background image
    // for the preview. And enable the install button
    image.onload = function() {
      var preview = $('preview-image');
      preview.style.backgroundImage = 'url(' + url + ')';
      $('preview-image-install').disabled = false;
    };

    // If the user clicks Install, move on to step 8
    $('preview-image-install').onclick = function() {
      URL.revokeObjectURL(url);
      installContent(bytes);
    };

    // If the user clicks cancel, return to the browser without installing
    $('preview-image-cancel').onclick = function() {
      URL.revokeObjectURL(url);
      sendStatus(OMADownloadStatus.USER_CANCELLED, function() {
        activity.postError('cancelled');
      });
    };
  }

  function previewAudio(type, bytes) {
    // Hide the confirmation screen and show the preview screen
    $('download-confirmation').hidden = true;
    $('preview-audio-screen').hidden = false;

    // Create a blob and a blob: url that we can play
    var blob = new Blob([bytes], { type: type });
    var url = URL.createObjectURL(blob);

    var player = $('preview-audio');
    player.src = url;

    // If we can't play the audio, abort with an error
    player.onerror = function() {
      cleanup();
      reportError(INSTALL_ERROR,
                  ERR_BAD_AUDIO, OMADownloadStatus.NON_ACCEPTABLE_CONTENT);
      return;
    };

    // If we can play the music, enable the Install button
    player.oncanplay = function() {
      $('preview-audio-install').disabled = false;
    };

    // Don't allow the user to play more than 50% of the audio, or
    // 5 seconds, whichever is longer
    player.ontimeupdate = player.ondurationchange = function() {
      if (player.currentTime > Math.max(5, player.duration / 2)) {
        player.pause();
        player.currentTime = 0;
      }
    };

    // If the user clicks Install, move on to step 8
    $('preview-audio-install').onclick = function() {
      cleanup();
      installContent(bytes);
    };

    // If the user clicks cancel, return to the browser without installing
    $('preview-audio-cancel').onclick = function() {
      cleanup();
      sendStatus(OMADownloadStatus.USER_CANCELLED, function() {
        activity.postError('cancelled');
      });
    };

    function cleanup() {
      player.pause();
      player.removeAttribute('src');
      player.load();
      URL.revokeObjectURL(url);
    }
  }

  // Step 8
  function installContent(bytes) {
    switch (installType) {
    case SONG:
      installSong(bytes);
      return;
    case RINGTONE:
    case WALLPAPER:
      install(installType, bytes, descriptor);
      return;
    }
  }

  function installSong(buffer) {
    debug('installSong');
    ForwardLock.getOrCreateKey(function(secret) {
      debug('got secret key');
      var blob = ForwardLock.lockBuffer(secret, buffer, mimeType, {
        vendor: descriptor.vendor,
        name: descriptor.name,
        description: descriptor.description
      });
      debug('encrypted song');

      getStorageIfAvailable('music', descriptor.size,
                            storageSuccess, storageError);

      function storageError(err) {
        debug('storageError:', err);
        if (err === 'unavailable') {
          reportError(INSTALL_ERROR, ERR_NO_SDCARD,
                      OMADownloadStatus.INSUFFICIENT_MEMORY);
        }
        else if (err === 'shared') {
          reportError(INSTALL_ERROR, ERR_SDCARD_IN_USE,
                      OMADownloadStatus.INSUFFICIENT_MEMORY);
        }
        else {
          reportError(INSTALL_ERROR, ERR_NO_SPACE,
                      OMADownloadStatus.INSUFFICIENT_MEMORY, err);
        }
      }

      function storageSuccess(storage) {
        debug('got music storage');
        var filename = 'locked/';
        if (descriptor.vendor)
          filename += fixPath(descriptor.vendor) + '/';
        filename += fixPath(descriptor.name) + '.lcka';
        debug('trying filename', filename);

        // Remove characters in s that might be significant in a filename
        function fixPath(s) { return s.replace(/[\/\\\.\,\?\*\:]/g, '') }

        getUnusedFilename(storage, filename, function(filename) {
          debug('using filename', filename);
          var addreq = storage.addNamed(blob, filename);

          addreq.onerror = function() {
            // We don't expect this to fail, since we've already checked
            // available storage space.
            reportError(INSTALL_ERROR, ERR_DS_SAVE_FAILURE,
                        OMADownloadStatus.LOADER_ERROR,
                        addreq.error.name);
          };

          addreq.onsuccess = function() {
            // The song is installed and ready to be played, so
            // send a success notification, tell the user that the
            // song was installed and return to the invoking application.
            reportSuccess(SUCCESS_SONG);
          };
        });
      }
    });
  }

  function install(installType, buffer, descriptor) {
    // We don't need the secret key here, but we need to create one
    // if it doesn't already exist
    ForwardLock.getOrCreateKey();

    var objectStoreName = installType === RINGTONE ? 'ringtones' : 'wallpapers';

    var blob = new Blob([buffer], { type: mimeType });
    objectStore.readwrite(objectStoreName, function(store) {
      var req = store.add({ blob: blob, descriptor: descriptor });

      req.onerror = function() {
        reportError(INSTALL_ERROR, ERR_DB_STORE_FAILURE,
                    OMADownloadStatus.LOADER_ERROR,
                    req.error.name);
      };

      req.onsuccess = function() {
        // Report that we've successfully saved the media.
        sendStatus(OMADownloadStatus.SUCCESS);

        // Install this blob as the default ringtone or wallpaper
        // We assume that if the user is downloading this media they
        // want to use it right away. Otherwise we could put a checkbox
        // on the confirmation screen.
        var lock = navigator.mozSettings.createLock();
        var settings = {};
        if (installType === RINGTONE) {
          settings[RINGTONE_KEY] = blob;
          settings[RINGTONE_NAME_KEY] = descriptor.name;
        }
        else {
          settings[WALLPAPER_KEY] = blob;
        }

        lock.set(settings).onsuccess = function() {
          var msgid;
          if (installType === RINGTONE)
            msgid = SUCCESS_RINGTONE;
          else
            msgid = SUCCESS_WALLPAPER;

          showDialog({
            message: _(msgid),
            okCallback: function() {
              // Return from the activity after the user has seen the message.
              activity.postResult({ success: true });
            }
          });
        };
      };
    });
  }
}
