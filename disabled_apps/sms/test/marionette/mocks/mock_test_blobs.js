/* global Components, Services */
'use strict';

const Cu = Components.utils;

Services.obs.addObserver(function(document) {
  if (!document || !document.location) {
    return;
  }

  function generateCanvas(width, height) {
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');

    canvas.width = width;
    canvas.height = height;

    var linearGradient = context.createLinearGradient(0, 0, width, height);
    linearGradient.addColorStop(0, 'blue');
    linearGradient.addColorStop(1, 'red');

    context.fillStyle = linearGradient;
    context.fillRect (0, 0, width, height);

    return canvas;
  }

  let TestBlobs = {
    generateImageBlob(width, height, type, quality) {
      var canvas = generateCanvas(width, height);

      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          canvas.width = canvas.height = 0;
          canvas = null;

          resolve(blob);
        }, type, quality);
      });
    }
  };

  var window = document.defaultView;

  Object.defineProperty(window.wrappedJSObject, 'TestBlobs', {
    // The property should be writable since mock is inserted/rewritten in
    // setup function that is called for every test in the suite.
    writable: true,
    value: Cu.cloneInto(TestBlobs, window, { cloneFunctions: true })
  });
}, 'document-element-inserted', false);
