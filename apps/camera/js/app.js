 // We have seperated init and delayedInit as we want to make sure
  // that on first launch we dont interfere and load the camera
  // previewStream as fast as possible, once the previewStream is
  // active we do the rest of the initialisation.

function init() {

  requirejs.config({ baseUrl: 'js' });

  var requires = [
    'controllers/app',
    '/shared/js/async_storage.js',
    '/shared/js/blobview.js',
    '/shared/js/media/jpeg_metadata_parser.js',
    '/shared/js/media/get_video_rotation.js',
    '/shared/js/media/video_player.js',
    '/shared/js/media/media_frame.js',
    '/shared/js/gesture_detector.js',
    '/shared/js/lazy_l10n.js',
    'constants',
    'panzoom',
    'camera',
    'views/filmstrip',
    'confirm',
    'soundeffect',
    'orientation'
  ];

  require(requires, function(AppController) {
    window.AppController = new AppController();
  });
}

init();

document.addEventListener('visibilitychange', function() {
  if (document.hidden) {
    Camera.turnOffFlash();
    Camera.stopPreview();
    Camera.cancelPick();
    Camera.cancelPositionUpdate();
    if (Camera._secureMode) // If the lockscreen is locked
      Filmstrip.clear();  // then forget everything when closing camera
  } else {
    Camera.startPreview();
  }
});

window.addEventListener('beforeunload', function() {
  window.clearTimeout(Camera._timeoutId);
  delete Camera._timeoutId;
  ViewfinderView.setPreviewStream(null);
});