'use strict';
// Extend this class for creating a new customizer and provide
// a set() method. It is expected set() returns nothing and accept
// an unique parameter which is an object of the type specified
// in the constructor of the customizer.

// resourceParams is an object with 'type' & 'mimetype' (optional).

var Customizer = (function(setting, resourceParams, onerror) {
  var self = this;

  this.init = function() {
    window.addEventListener('customization', function eventHandler(event) {
      if (event.detail.setting === setting) {
        window.removeEventListener('customization', eventHandler);
        var URI = event.detail.value;
        Resources.load(URI, resourceParams, self.set,
          function onerrorRetrieving(status) {
            console.error('Customizer.js: Error retrieving the resource.');
            onerror && onerror(status);
          }
        );
      }
    });
  };
});
