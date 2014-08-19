require.config({
  baseUrl: '/js',
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
    'StopRecordingEvent': '../shared/js/stop_recording_event',
    'debug': 'vendor/debug'
  },
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
    'StopRecordingEvent': {
      exports: 'StopRecordingEvent'
    }
  }
});
