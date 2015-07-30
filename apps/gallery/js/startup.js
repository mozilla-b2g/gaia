/* global LazyLoader, Pick, Thumbnails, $, thumbnails */
/* global MediaDB, photodb, picking, setView, LAYOUT_MODE, currentView */
/* global Overlay, isPhone, doNotScanInBackgroundHack, fullscreenButtons */
/* global launchCameraApp, deleteSelectedItems, shareSelectedItems */
/* global resizeHandler, currentFrame, showFile, fileCreated, fileDeleted */
/* global files, thumbnailClickHandler */

(function startup() {
  'use strict';

  var firstScanDone = false;          // Have we completed our first scan yet?

  showUI();                           // We're localized, so unhide
  registerEventHandlers();            // Hook up UI elements
  finishDBInitialization();           // Finish MediaDB initialization
  setInitialView();                   // Start off in thumbnail list mode
  registerActivityHandler();          // Handle pick and browse activities
  displayThumbnails();                // Get the thumbnails displayed
  doNotScanInBackgroundHack(photodb); // Remove as part of bug 1046995

  function showUI() {
    // <body> children are hidden until the UI is translated
    document.body.classList.remove('hidden');

    // load frame_script.js for preview mode and show loading background
    if (!isPhone) {
      LazyLoader.load('js/frame_scripts.js');
    }

    // Tell performance monitors that our chrome is visible
    window.performance.mark('navigationLoaded');
  }

  function registerEventHandlers() {
    // Clicking on the select button goes to thumbnail select mode
    $('thumbnails-select-button').onclick =
      setView.bind(null, LAYOUT_MODE.select);

    // Clicking on the cancel button goes from thumbnail select mode
    // back to thumbnail list mode
    $('selected-header').addEventListener('action',
                                          setView.bind(null, LAYOUT_MODE.list));

    if (!isPhone) {
      $('fullscreen-toolbar-header').addEventListener('action', function() {
        setView(LAYOUT_MODE.list);
      });
    }

    // The camera buttons should launch the camera app
    fullscreenButtons.camera.onclick = launchCameraApp;

    $('thumbnails-camera-button').onclick = launchCameraApp;
    Overlay.addEventListener('camera', launchCameraApp);

    // Clicking on the delete button in thumbnail select mode deletes all
    // selected items
    $('thumbnails-delete-button').onclick = deleteSelectedItems;

    // Clicking on the share button in select mode shares all selected images
    $('thumbnails-share-button').onclick = shareSelectedItems;

    Overlay.addEventListener('cancel', function() {
      if (picking) {
        Pick.cancel();
      }
    });

    // Handle resize events
    window.onresize = resizeHandler;

    // All our buttons and UI elements are hooked up, so we've reached
    // the "interactive" mark.
    window.performance.mark('navigationInteractive');
  }

  // We created the MediaDB in thumbnails.js. Now we need to finish
  // setting it up.
  function finishDBInitialization() {

    // Display a dialog if the DB needs to upgrade before becoming ready
    photodb.onupgrading = function(evt) {
      Overlay.show('upgrade');
    };

    // This is called when DeviceStorage becomes unavailable because the
    // sd card is removed or because it is mounted for USB mass storage
    // This may be called before onready if it is unavailable to begin with
    // We don't need one of these handlers for the video db, since both
    // will get the same event at more or less the same time.
    photodb.onunavailable = function() {
      // Switch back to the thumbnail view unless it is a pick activity.
      // If we were viewing or editing an image it might not be there
      // anymore when the MediaDB becomes available again.
      if (!picking) {
        setView(LAYOUT_MODE.list);
      } else {
        Pick.restart();
      }

      // If storage becomes unavailble (e.g. the user starts a USB Mass Storage
      // Lock the user out of the app, and tell them why
      var why = photodb.state;
      if (why === MediaDB.NOCARD) {
        Overlay.show('nocard');
      }
      else if (why === MediaDB.UNMOUNTED) {
        Overlay.show('pluggedin');
      }
    };

    photodb.onready = function() {
      // Hide the nocard or pluggedin overlay if it is displayed
      if (Overlay.current === 'nocard' || Overlay.current === 'pluggedin' ||
          Overlay.current === 'upgrade') {
        Overlay.hide();
      }

      // We also scan the file system for new files every time we get
      // a ready event. That code is in a different event handler that
      // is not registered until we are notified the Thumbnails.created
      // promise resolves.
    };

    photodb.onscanstart = function onscanstart() {
      // Prevents user to edit images when scanning pictures from storage
      fullscreenButtons.edit.classList.add('disabled');
      // Show the scanning indicator
      $('throbber').classList.remove('hidden');
      $('throbber').classList.add('throb');
    };

    photodb.onscanend = function onscanend() {
      // Allows the user to edit images when scanning is finished
      fullscreenButtons.edit.classList.remove('disabled');

      if (Overlay.current === 'scanning') {
        Overlay.show('emptygallery');
      }
      else if (!isPhone && !currentFrame.displayingImage &&
               !currentFrame.displayingVideo) {
        // focus on latest one if client hasn't clicked any of
        // them
        showFile(0);
      }

      // Hide the scanning indicator
      // setTimeout() is to workaround Bug 1166500
      $('throbber').classList.remove('throb');
      setTimeout(function() { $('throbber').classList.add('hidden'); }, 100);

      // If this was the first scan after startup, then tell
      // performance monitors that the app is finally fully loaded and stable.
      if (!firstScanDone) {
        firstScanDone = true;
        window.performance.mark('fullyLoaded');
      }
    };

    // On devices with internal and external device storage, this handler is
    // triggered when the user removes the sdcard. MediaDB remains usable
    // and we'll get a bunch of deleted events for the files that are no longer
    // available. But we need to listen to this event so we can switch back
    // to the list of thumbnails. We don't want to be left viewing or editing
    // a photo that is no longer available.
    photodb.oncardremoved = function oncardremoved() {
      // If the user pulls the sdcard while trying to pick an image, give up
      if (picking) {
        Pick.cancel();
        return;
      }

      setView(LAYOUT_MODE.list);
    };

    // One or more files was created (or was just discovered by a scan)
    photodb.oncreated = function(event) {
      event.detail.forEach(fileCreated);
    };

    // One or more files were deleted (or were just discovered missing)
    photodb.ondeleted = function(event) {
      event.detail.forEach(fileDeleted);
    };

    // If the mediadb is not still in its initial OPENING state then we
    // missed a "ready" or "unavailable" or "upgrading" event, and need
    // to call the appropriate handler now. Note that we don't start scanning
    // until after the ready event arrives and we enumerate the db, so it
    // is not possible for us to miss a scanstart or scanend events. And if
    // we miss a created or deleted event, the relevant files will be found
    // during the enumeration, so this is all we have to look for now
    switch (photodb.state) {
    case MediaDB.UPGRADING:
      photodb.onupgrading();
      break;
    case MediaDB.READY:
      photodb.onready();
      break;
    case MediaDB.NOCARD:
    case MediaDB.UNMOUNTED:
      photodb.onunavailable();
      break;
    }
  }

  function setInitialView() {
    // Start off in thumbnail list mode or in pick mode
    if (picking) {
      setView(LAYOUT_MODE.pick);
    }
    else {
      setView(LAYOUT_MODE.list);
    }
  }

  // Register a handler for pick and browse activities
  function registerActivityHandler() {
    navigator.mozSetMessageHandler('activity', function activityHandler(a) {
      var activityName = a.source.name;
      switch (activityName) {
      case 'browse':
        // The user is probably coming to us from the camera, and she probably
        // wants to see the list of thumbnails. If the gallery was already
        // running when the browse activity was started, then we might not be
        // displaying the thumbnails. If we're currently displaying a single
        // image, switch to the thumbnails. But if the user left the gallery
        // in the middle of an edit or in the middle of making a selection,
        // then returning to the thumbnail list would cause her to lose work,
        // so in those cases we don't change anything and let the gallery
        // resume where the user left it. See Bug 846220.
        if (currentView === LAYOUT_MODE.fullscreen) {
          setView(LAYOUT_MODE.list);
        }
        break;
      case 'pick':
        LazyLoader.load('js/pick.js', function() { Pick.start(a); });
        break;
      }
    });
  }

  // Get the thumbnails displayed
  function displayThumbnails() {
    // thumbnails.js started created thumbanils offscreen.
    // We're ready now to deal with them

    // Copy stuff to global variables
    // jshint ignore:start
    thumbnails = Thumbnails.container;  // The element that holds the thumbnail
    thumbnailList = Thumbnails.list;    // The object that represents them
    // jshint ignore:end

    // Now insert the thumbnails into the document.
    var placeholder = $('thumbnails-placeholder');
    placeholder.parentElement.replaceChild(thumbnails, placeholder);

    // Handle clicks on the thumbnails
    thumbnails.addEventListener('click', thumbnailClickHandler);

    // When the first page of thumbnails is diplayed, we can emit
    // our 'visually complete' mark for startup time comparison
    Thumbnails.firstpage.then(function() {
      // Tell performance monitors that "above the fold" content is displayed
      // and is ready to interact with.
      window.performance.mark('visuallyLoaded');
      window.performance.mark('contentInteractive');
    });

    // When all the thumbnails have been created, we can start a scan
    Thumbnails.complete.then(function() {
      if (files.length === 0) { // If we didn't find anything
        Overlay.show('scanning');
      }

      // Send a custom mark to performance monitors to note that we're done
      // enumerating the database at this point. We won't send the final
      // fullyLoaded marker until we're completely stable and have
      // finished scanning.
      window.performance.mark('mediaEnumerated');

      // Now that we've enumerated all the photos and videos we already know
      // about it is time to go and scan the filesystem for new ones. If the
      // MediaDB is fully ready, we can scan now. Either way, we always want
      // to scan every time we get a new 'ready' event.
      photodb.addEventListener('ready', function() { photodb.scan(); });
      if (photodb.state === MediaDB.READY) { // if already ready then scan now
        photodb.scan();
      }
    });
  }
})();
