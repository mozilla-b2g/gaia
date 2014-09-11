requirejs.config({
  baseUrl: '/js',

  // 'paths' lets us alias complex
  // paths to something simpler.
  paths: {
    'l10n': '../shared/js/l10n',
    'asyncStorage': '../shared/js/async_storage',
    'getVideoRotation': '../shared/js/media/get_video_rotation',
    'performance-testing-helper': '../shared/js/performance_testing_helper',
    'jpegMetaDataParser': '../shared/js/media/jpeg_metadata_parser',
    'downsample': '../shared/js/media/downsample',
    'getImageSize': '../shared/js/media/image_size',
    'cropResizeRotate': '../shared/js/media/crop_resize_rotate',
    'format': '../shared/js/format',
    'GestureDetector': '../shared/js/gesture_detector',
    'VideoPlayer': '../shared/js/media/video_player',
    'MediaFrame': '../shared/js/media/media_frame',
    'BlobView': '../shared/js/blobview',
    'CustomDialog': '../shared/js/custom_dialog',
    'debug': '../bower_components/debug/index',
    'attach': '../bower_components/attach/index',
    'model': '../bower_components/model/index',
    'view': '../bower_components/view/index',
    'evt': '../bower_components/evt/index',
    'drag': '../bower_components/drag/index',
    'device-orientation': '../bower_components/device-orientation/index',
    'stop-recording-event': '../shared/js/stop_recording_event'
  },

  // If your package uses relative `require()` paths
  // internally, then it needs to be defined as
  // a 'package' so they are resolved correctly.
  packages: [
    {
      name: 'gaia-header',
      location: '../bower_components/gaia-header',
      main: 'script'
    },
    {
      name: 'gaia-icons',
      location: '../bower_components/gaia-icons',
      main: 'script'
    }
  ],

  // 'shim' config lets us `require()` packages
  // that don't have an AMD define call.
  shim: {
    'format': {
      exports: 'Format'
    },
    'getVideoRotation': {
      deps: ['BlobView'],
      exports: 'getVideoRotation'
    },
    'MediaFrame': {
      deps: ['format', 'VideoPlayer'],
      exports: 'MediaFrame'
    },
    'BlobView': {
      exports: 'BlobView'
    },
    'asyncStorage': {
      exports: 'asyncStorage'
    },
    'performance-testing-helper': {
      exports: 'PerformanceTestingHelper'
    },
    'jpegMetaDataParser': {
      deps: ['BlobView'],
      exports: 'parseJPEGMetadata'
    },
    'getImageSize': {
      deps: ['BlobView', 'jpegMetaDataParser'],
      exports: 'getImageSize'
    },
    'cropResizeRotate': {
      deps: ['BlobView', 'getImageSize', 'jpegMetaDataParser', 'downsample'],
      exports: 'cropResizeRotate'
    },
    'GestureDetector': {
      exports: 'GestureDetector'
    },
    'CustomDialog': {
      exports: 'CustomDialog'
    },
    'stop-recording-event': {
      exports: 'StopRecordingEvent'
    }
  }
});
