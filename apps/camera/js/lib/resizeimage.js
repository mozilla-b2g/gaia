define(function(require, exports, module) {
'use strict';

module.exports = function(config, done) {
  var blob = config.blob;
  var width = config.width;
  var height = config.height;
  var img = new Image();
  img.onload = onLoad;

  function onLoad() {
    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);
    canvas.toBlob(function(resizedBlob) {
      done(resizedBlob);
    }, 'image/jpeg');
  }

  img.src = window.URL.createObjectURL(blob);
};

});
