'use strict';
define(function(require) {
  const mozIntl = require('moz_intl');
  var shortRelativeDateFmt, longRelativeDateFmt;

  function setRelativeDateFormatters() {
    shortRelativeDateFmt = mozIntl._gaia.RelativeDate(navigator.languages, {
      style: 'short'
    });
    longRelativeDateFmt = mozIntl._gaia.RelativeDate(navigator.languages, {
      style: 'long'
    });
  }

  setRelativeDateFormatters();
  window.addEventListener('languagechange', setRelativeDateFormatters);

  var date = {
    /**
     * Display a human-readable relative timestamp.
     */
    relativeDateElement: function(element, time, useCompactFormat) {
      if (time) {
        var f = useCompactFormat ? shortRelativeDateFmt : longRelativeDateFmt;
        f.formatElement(element, time);
      } else {
        element.textContent = '';
      }
    },

    /**
     * Given a node, show a pretty date for its contents.
     * @param {Node} node  the DOM node.
     * @param {Number} timestamp a timestamp like the one retuned
     * from Date.getTime().
     */
    setPrettyNodeDate: function(node, timestamp) {
      if (timestamp) {
        node.dataset.time = timestamp.valueOf();
        node.dataset.compactFormat = true;
        date.relativeDateElement(node, timestamp, true);
      } else {
        node.textContent = '';
        node.removeAttribute('data-time');
      }
    }
  };

  return date;
});
