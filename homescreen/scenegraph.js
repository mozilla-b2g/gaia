/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

function Sprite(canvas, x, y) {
  this.imageData = canvas.getImageData(0, 0, canvas.width, canvas.height);
  this.setPosition(x, y);
}

Sprite.prototype = {
  setPosition: function(x, y) {
    this.x = x;
    this.y = y;
  },
  setAnimation: function(fn, duration) {
    this.fn = fn;
    this.startTime = Date.now();
    this.stopTime = this.startTime + duration;
    this.startX = this.x;
    this.startY = this.y;
  },
  stopAnimation: function() {
    this.fn = null;
    this.startTime = this.stopTime = 0;
  },
  animate: function(now) {
    var startTime = this.startTime;
    var stopTime = this.stopTime;
    // elapsed time scaled to [0..1]
    var elapsed = (now < startTime || now > stopTime)
                  ? 1
                  : ((now - startTime) / (stopTime - startTime));
    this.fn.call(this, elapsed, this.x, this.y, this.startX, this.startY);
  },
  move: function(stopX, stopY, duration) {
    this.setAnimation(function (elapsed, x, y, startX, startY) {
        this.setPosition(x + (stopX - x) * elapsed,
                         y + (stopY - y) * elapsed);
      }, duration);
  }
}

function SceneGraph(canvas) {
  this.canvas = canvas;
  this.sprites = [];
}

SceneGraph.prototype = {
  add: function(sprite) {
    var sprites = this.sprites;
    sprite.index = sprites.length;
    sprites.push(sprite);
  },
  remove: function(sprite) {
    var sprites = this.sprites;
    sprites.splice(sprites.length, 1);
  },
  animate: function() {
    var now = Date.now();
    for (var n = 0; n < sprites.length; ++n) {
      var sprite = sprites[n];
      if (sprite.fn)
        sprite.animate(now);
    }
  }
}
