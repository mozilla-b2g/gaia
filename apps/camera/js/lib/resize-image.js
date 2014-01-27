define(function(require, exports, module) {
'use strict';

var debug = require('debug')('resize-image');

/**
 * Exports
 */

module.exports = function(options, done) {
  return new ResizeImage(options).run(done);
};

function ResizeImage(options) {
  this.canvas = document.createElement('canvas');
  this.ctx = this.canvas.getContext('2d');
  this.blob = options.blob;
  this.image = new Image();
  this.canvas.width = options.width;
  this.canvas.height = options.height;
  debug('initialized w: %s, h: %s', options.width, options.height);
}

ResizeImage.prototype.run = function(done) {
  var canvas = this.canvas;
  var image = this.image;
  var self = this;
  this.load(function() {
    self.correctDimensions();
    self.cover = self.coverData(image, canvas);
    self.draw();
    self.canvas.toBlob(done, 'image/jpeg');
  });
  return this;
};

/**
 * Calculate the other canvas
 * dimension based on the aspect
 * ratio of the loaded image.
 *
 * @private
 */
ResizeImage.prototype.correctDimensions = function() {
  var aspect = this.image.height / this.image.width;
  var canvas = this.canvas;
  canvas.width = canvas.width || canvas.height / aspect;
  canvas.height = canvas.height || canvas.width * aspect;
};

ResizeImage.prototype.load = function(done) {
  this.image.onload = done;
  this.image.src = window.URL.createObjectURL(this.blob);
};

ResizeImage.prototype.draw = function(done) {
  this.ctx.drawImage(
    this.image, 0, 0,
    this.image.width,
    this.image.height,
    this.cover.offsetX,
    this.cover.offsetY,
    this.cover.width,
    this.cover.height);
};

ResizeImage.prototype.coverData = function(image, canvas) {
  var result = {};
  var imageAspect = image.height / image.width;
  var canvasAspect = canvas.height / canvas.width;
  var squareCanvas = canvasAspect === 1;
  var matchWidth = squareCanvas && imageAspect > canvasAspect ||
    imageAspect > canvasAspect;

  if (matchWidth) {
    result.width = canvas.width;
    result.height = canvas.width * imageAspect;
    result.offsetY = -(result.height - canvas.height) / 2;
    result.offsetX = 0;
  } else {
    result.height = canvas.height;
    result.width = canvas.height / imageAspect;
    result.offsetX = -(result.width - canvas.width) / 2;
    result.offsetY = 0;
  }

  debug('cover data width: %s, height: %s, offsetX: %s, offsetY: %s',
    result.width, result.height, result.offsetX, result.offsetY);
  return result;
};

});
