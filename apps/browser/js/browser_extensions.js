// Issue: apps/browser/js/browser.js has _many_ external deps, all of which
// culminate in an situation that seemingly prevents testability.
var Browser = Browser || {};

// Ported from:
// http://mxr.mozilla.org/mozilla-central/source/docshell/base/nsDefaultURIFixup.cpp#783
Browser.isNotURL = function browser_isNotURL(input) {
  // NOTE: NotFound is equal to the upper bound of Uint32 (2^32-1)
  var dLoc = input.indexOf('.') >>> 0;
  var cLoc = input.indexOf(':') >>> 0;
  var sLoc = input.indexOf(' ') >>> 0;
  var mLoc = input.indexOf('?') >>> 0;
  var qLoc = Math.min(input.indexOf('"') >>> 0, input.indexOf('\'') >>> 0);

  // Space at 0 index treated as NotFound
  if (sLoc === 0) {
    sLoc = -1 >>> 0;
  }

  // Question Mark at 0 index is a keyword search
  if (mLoc == 0) {
    return true;
  }

  // Space before Dot, Or Quote before Dot
  // Space before Colon, Or Quote before Colon
  // Space before QuestionMark, Or Quote before QuestionMark
  if ((sLoc < dLoc || qLoc < dLoc) &&
      (sLoc < cLoc || qLoc < cLoc) &&
      (sLoc < mLoc || qLoc < mLoc)) {
    return true;
  }

  // NotFound will always be greater then the length
  // If there is no Colon, no Dot and no QuestionMark
  // there is no way this is a URL
  if (cLoc > input.length && dLoc > input.length && mLoc > input.length) {
    return true;
  }

  return false;
};
