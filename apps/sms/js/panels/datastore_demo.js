/* global MessagesDatastore */

/* exported DatastoreDemoPanel */

'use strict';

(function(exports) {
  var DatastoreDemoPanel = {
    afterEnter: function() {
      MessagesDatastore.get(1).then(function(message) {
        alert(message.type + ': ' + message.body || message.smil);
      }).catch(function(e) {
        alert('Error (get): ' + e.message || e);
      });

      MessagesDatastore.getLength().then(function(length) {
        alert('Length: ' + length);
      }).catch(function(e) {
        alert('Error (getLength): ' + e.message || e);
      });

      MessagesDatastore.list().then(function(list) {
        alert('List size: ' + list.size);
      }).catch(function(e) {
        alert('Error (list): ' + e.message || e);
      });
    }
  };

  exports.DatastoreDemoPanel = DatastoreDemoPanel;
})(window);
