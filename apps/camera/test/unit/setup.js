/*global mocha*/
'use strict';

mocha.setup({
  globals: [
    'PerformanceTestingHelper',
    'LazyLoader',
    'asyncStorage',
    'LazyL10n',
    'BlobView',
    'parseJPEGMetadata',
    'getVideoRotation',
    'Format',
    'VideoPlayer',
    'GestureDetector',
    'debug'
  ]
});

// Shim for non FXOS environments
if (!navigator.getDeviceStorage) {
  navigator.getDeviceStorage = function() {};
}

// Once we have alemeda (requirejs) we can
// begin loading in our modules to test.
requireApp('camera/js/vendor/alameda.js', function() {
  window.req = window.requirejs.config({
    baseUrl: '/js',
    paths: {
      'LazyL10n': '../shared/js/lazy_l10n',
      'LazyLoader': '../shared/js/lazy_loader',
      'asyncStorage': '../shared/js/async_storage',
      'getVideoRotation': '../shared/js/media/get_video_rotation',
      'performanceTesting': '../shared/js/performance_testing_helper',
      'jpegMetaDataParser': '../shared/js/media/jpeg_metadata_parser',
      'format': '../shared/js/format',
      'GestureDetector': '../shared/js/gesture_detector',
      'VideoPlayer': '../shared/js/media/video_player',
      'MediaFrame': '../shared/js/media/media_frame',
      'BlobView': '../shared/js/blobview'
    },
    shim: {
      'format': {
        exports: 'Format'
      },
      'LazyL10n': {
        deps: ['LazyLoader'],
        exports: 'LazyL10n'
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
      'LazyLoader': {
        exports: 'LazyLoader'
      },
      'asyncStorage': {
        exports: 'asyncStorage'
      },
      'performanceTesting': {
        exports: 'PerformanceTestingHelper'
      },
      'jpegMetaDataParser': {
        exports: 'parseJPEGMetadata'
      },
      'GestureDetector': {
        exports: 'GestureDetector'
      }
    }
  });
});
