/* global Resources */
/* exported Customizer */

'use strict';
// Extend this class for creating a new customizer and provide
// a set() method. It is expected set() returns nothing and accept
// an unique parameter which is an object of the type specified
// in the constructor of the customizer.
var Customizer = (function(setting, resourceType, onerror) {
  var self = this;

  this.init = function() {
    window.addEventListener('customization', function eventHandler(event) {
      if (event.detail.setting === setting) {
        window.removeEventListener('customization', eventHandler);
        var value = event.detail.value;
        // If resourceType === 'data' the value received contains directly the
        // value that the customizer will proccess.
        // In other case the value will have the resource to be loaded by the
        // customizer.
        if (resourceType === 'data') {
          self.set(value);
        } else {
          Resources.load(value, resourceType, self.set,
            function onerrorRetrieving(status) {
              console.error('Customizer.js: Error retrieving the resource.');
              onerror && onerror(status);
          });
        }
      }
    });
  };
});
