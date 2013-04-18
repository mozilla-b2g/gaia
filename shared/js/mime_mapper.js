'use strict';

/**
 * MimeMapper helps gaia apps to decide the mapping of mimetype and extension.
 * The use cases often happen when apps need to know about the exact
 * mimetypes or extensions, such as to delegate the open web activity, we must
 * have suitable mimetypes or extensions to request the right activity
 *
 * The mapping is basically created according to:
 * http://en.wikipedia.org/wiki/Internet_media_type
 *
 * The supported formats are considered base on the deviceStorage properties:
 * http://dxr.mozilla.org/mozilla-central/toolkit/content/
 * devicestorage.properties
 *
 */

var MimeMapper = {
  // This list only contains the extensions we currently supported
  // We should make it more complete for further usages
  _typeToExtensionMap: {
    // Image
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/bmp': 'bmp',
    // Audio
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'audio/ogg': 'ogg',
    'audio/webm': 'webm',
    'audio/3gpp': '3gp',
    // Video
    'video/mp4': 'mp4',
    'video/mpeg': 'mpg',
    'video/ogg': 'ogg',
    'video/webm': 'webm',
    'video/3gpp': '3gp'
    // Application
    // If we want to support some types, like pdf, just add
    // 'application/pdf': 'pdf'
  },

  // This list only contains the mimetypes we currently supported
  // We should make it more complete for further usages
  _extensionToTypeMap: {
    // Image
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'jpe': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    // Audio
    'mp3': 'audio/mpeg',
    'm4a': 'audio/mp4',
    'm4b': 'audio/mp4',
    'm4p': 'audio/mp4',
    'm4r': 'audio/mp4',
    'aac': 'audio/aac',
    'opus': 'audio/ogg',
    // Video
    'mp4': 'video/mp4',
    'mpeg': 'video/mpeg',
    'mpg': 'video/mpeg',
    'ogv': 'video/ogg',
    'ogx': 'video/ogg',
    'webm': 'video/webm',
    '3gp': 'video/3gpp',
    'ogg': 'video/ogg'
    // Application
    // If we want to support some extensions, like pdf, just add
    // 'pdf': 'application/pdf'
  },

  isSupportedType: function(mimetype) {
    return (mimetype in this._typeToExtensionMap);
  },

  isSupportedExtension: function(extension) {
    return (extension in this._extensionToTypeMap);
  },

  guessExtensionFromType: function(mimetype) {
    return this._typeToExtensionMap[mimetype];
  },

  guessTypeFromExtension: function(extension) {
    return this._extensionToTypeMap[extension];
  }
};
