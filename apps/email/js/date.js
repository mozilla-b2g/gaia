'use strict';
define(function(require) {
  var mozL10n = require('l10n!');

  var date = {
    /**
     * Display a human-readable relative timestamp.
     */
    prettyDate: function(time, useCompactFormat) {
      var f = new mozL10n.DateTimeFormat();
      return f.fromNow(time, useCompactFormat);
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
        node.textContent = date.prettyDate(timestamp, true);
      } else {
        node.textContent = '';
        node.removeAttribute('data-time');
      }
    }
  };

  return date;
});
