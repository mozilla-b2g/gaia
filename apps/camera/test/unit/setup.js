/* global mocha */
'use strict';

mocha.setup({
  globals: [
    'PerformanceTestingHelper',
    'asyncStorage',
    'LazyL10n',
    'BlobView',
    'parseJPEGMetadata',
    'getVideoRotation',
    'Format',
    'VideoPlayer',
    'GestureDetector',
    'debug',
    'CONFIG_AVG_JPEG_COMPRESSION_RATIO',
    'MediaFrame',
    'confirm',
    'MozActivity',
    'CustomDialog'
  ]
});

// Shim for non FXOS environments
if (!navigator.getDeviceStorage) {
  navigator.getDeviceStorage = function() {};
}

// Once we have alemeda (requirejs) we can
// begin loading in our modules to test.
requireApp('camera/bower_components/alameda/index.js', function() {
  window.req = window.requirejs.config({
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
      'FontSizeUtils': '../shared/js/font_size_utils',
      'debug': '../bower_components/debug/index',
      'attach': '../bower_components/attach/index',
      'model': '../bower_components/model/index',
      'view': '../bower_components/view/index',
      'evt': '../bower_components/evt/index',
      'drag': '../bower_components/drag/index',
      'device-orientation': '../bower_components/device-orientation/index'
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
      'FontSizeUtils': {
        exports: 'FontSizeUtils'
      }
    }
  });
});

require('/shared/test/unit/mocks/mocks_helper.js');
