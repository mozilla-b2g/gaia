'use strict';
define(function() {
  /**
   * Given a mime type, generates a CSS class name that uses just the first part
   * of the mime type. So, audio/ogg becomes mime-audio.
   * @param  {String} mimeType
   * @return {String} a class name usable in CSS.
   */
  return function mimeToClass(mimeType) {
    mimeType = mimeType || '';
    return 'mime-' + (mimeType.split('/')[0] || '');
  };
});
