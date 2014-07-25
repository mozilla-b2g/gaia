'use strict';

(function() {
  var utils = window.utils = window.utils || {};
  utils.phonetic = {};

  var PHONETIC_LANG = 'jp';

  utils.phonetic.isJapaneseLang = function() {
    return navigator.mozL10n.language.code === PHONETIC_LANG;
  };

  utils.phonetic.isCJK = function() {
    if ((name === null) || (name === '')) {
      return false;
    }
    for (var i = 0; i < name.length; i++) {
      if (!_isKanji(name.charAt(i)) &&
           !_isKana(name.charAt(i))) {
        return false;
      }
    }
    return true;
  };

  function _isKanji(c) {
    var unicode = c.charCodeAt(0);
    if ((unicode >= 0x4e00 && unicode <= 0x9fcf) ||
        (unicode >= 0x3400 && unicode <= 0x4dbf) ||
        (unicode >= 0x20000 && unicode <= 0x2a6df) ||
        (unicode >= 0xf900 && unicode <= 0xfadf) ||
        (unicode >= 0x3190 && unicode <= 0x319f) ||
        (unicode >= 0x2f800 && unicode <= 0x2fa1f)) {
      return true;
    }
    return false;
  }

  function _isKana(c) {
    var unicode = c.charCodeAt(0);
    if ((unicode >= 0x3040 && unicode <= 0x309f) ||
         (unicode >= 0x30a0 && unicode <= 0x30ff) ||
         (unicode >= 0xff61 && unicode <= 0xff9f)) {
      return true;
    }
    return false;
  }
})();
