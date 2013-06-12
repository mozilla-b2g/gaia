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

if (!utils.time) {
  (function() {
    utils.time = {};

    var _ = navigator.mozL10n.get;

    utils.time.pretty = function(time) {
      var prettyDate = '';

      if (!time) {
        return prettyDate;
      }

      var dtf = new navigator.mozL10n.DateTimeFormat();
      var diff = (Date.now() - time) / 1000;
      var day_diff = Math.floor(diff / 86400);
      if (!isNaN(day_diff)) {
        // Woohh we are on the future here
        if (day_diff < 0 || diff < 0) {
          prettyDate = dtf.localeFormat(new Date(time),
                                                    _('dateTimeFormat_%x'));
        } else {
          prettyDate = day_diff === 0 && _('today') ||
                       day_diff === 1 && _('yesterday') ||
                       day_diff < 6 && dtf.localeFormat(new Date(time), '%A') ||
                       dtf.localeFormat(new Date(time), '%x');
        }
      }

      return prettyDate + ' ' +
                        dtf.localeFormat(new Date(time), _('shortTimeFormat'));
    };
  })();
}
