'use strict';

/* global ImageUtils, LazyLoader */

/*
 *   WARNING: This module LazyLoads
 *
 *   '/shared/js/contacts/import/utilities/config.js',
 *   '/shared/js/image_utils.js'
 *
 */

var utils = window.utils || {};

(function(utils) {
  var DEPENDENCIES = [
    '/shared/js/contacts/import/utilities/config.js',
    '/shared/js/image_utils.js'
  ];

  var dpr = window.devicePixelRatio || 1;

  var CONFIG_FILE = '/config-images.json';

  // Default data for creating a thumbnail. This will be used if a config file
  // is not found
  var DEFAULT_CONFIG = {
    'thumbnail' : {
      'format': 'image/jpeg',
      'size': 65,
      'quality': 1.0
    }
  };
  var THUMB_CONFIG = DEFAULT_CONFIG.thumbnail;

  if (typeof utils.thumbnailImage !== 'undefined') {
    return;
  }

  // Obtains the thumbnail configuration by looking  for the config file
  // If no config file is found, then default values are taken
  function getThumbsConfig() {
    return new Promise(function(resolve, reject) {
      utils.config.load(CONFIG_FILE).then(function resolved(config) {
        resolve(config);
      }, function rejected() {
          resolve(DEFAULT_CONFIG);
      });
    });
  }

  function scaleImage(blob, configData) {
    var thumbConfig = configData && configData.thumbnail || {};

    var thumbnailEdge = (thumbConfig.size || THUMB_CONFIG.size) * dpr;
    var format = thumbConfig.format || THUMB_CONFIG.format;
    var encodingQuality = thumbConfig.quality || THUMB_CONFIG.quality;

    return ImageUtils.resizeAndCropToCover(blob, thumbnailEdge,
                                           thumbnailEdge, format,
                                           encodingQuality);
  }

  // We keep the aspect ratio and make the smallest edge be
  // |thumbnailEdge| long.
  utils.thumbnailImage = function(blob, callback) {
    LazyLoader.load(DEPENDENCIES, function() {
      getThumbsConfig().then(function(config) {
        return scaleImage(blob, config);
      }).then(callback).catch(function(err) {
          console.error('Error while converting image to thumbnail:', err.name);
          callback(blob);
        });
    });
  };

})(utils);
