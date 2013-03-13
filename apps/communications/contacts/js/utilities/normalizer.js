'use strict';

var utils = window.utils || {};

if (!utils.text) {
  (function() {
    var Text = utils.text = {};

    // This should be fixed at a plaftorm level using
    // an utf8 normalized form.
    // Platform bug: https://bugzilla.mozilla.org/show_bug.cgi?id=779068
    // Please remove when this bug is fixed.
    var inChars = 'àáâãäçèéêëìíîïñòóôõöùúûüýÿÀÁÂÃÄÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝ',
        outChars = 'aaaaaceeeeiiiinooooouuuuyyAAAAACEEEEIIIINOOOOOUUUUY',
        regExp = new RegExp('[' + inChars + ']', 'g'),
        match = {};

    for (var i = 0; i < inChars.length; i++) {
      match[inChars[i]] = outChars[i];
    }

    var replaceMethod = function replace(character) {
      return match[character] || character;
    };

    Text.normalize = function normalizeText(value) {
      return value.replace(regExp, replaceMethod);
    };

    // Taken from /apps/browser/js/browser.js
    Text.escapeHTML = function ut_escapeHTML(str, escapeQuotes) {
      if (Array.isArray(str)) {
        return Text.escapeHTML(str.join(' '), escapeQuotes);
      }
      if (!str || typeof str != 'string')
        return '';
      var escaped = str.replace(/&/g, '&amp;').replace(/</g, '&lt;')
                       .replace(/>/g, '&gt;');
      if (escapeQuotes)
        return escaped.replace(/"/g, '&quot;').replace(/'/g, '&#x27;'); //"
      return escaped;
    };

    Text.escapeRegExp = function escapeRegExp(str) {
      return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
    };
  })();
}
