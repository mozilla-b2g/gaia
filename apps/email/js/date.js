/*global define */
define(function(require) {
  // TODO: move common date functions from mail_common into here over time,
  // and then remove this dependency.
  var common = require('mail_common');

  var date = {
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
        node.textContent = common.prettyDate(timestamp, true);
      } else {
        node.textContent = '';
        node.removeAttribute('data-time');
      }
    }
  };

  return date;
});
