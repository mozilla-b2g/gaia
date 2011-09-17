/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var GetAnimationStartTime() {
  return window.mozAnimationStartTime ||
         window.webkitAnimationStartTime ||
         window.animationStartTime;
}

var RequestAnimationFrame() {
  if (window.mozRequestAnimationFrame)
    window.mozRequestAnimationFrame();
  else if (window.webkitRequestAnimationFrame)
    window.webkitRequestAnimationFrame();
  else if (window.requestAnimationFrame)
    window.requestAnimationFrame();
}

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
    this.startTime = GetAnimiationStartTime();
    this.stopTime = this.startTime + duration;
    this.startX = this.x;
    this.startY = this.y;
    RequestAnimationFrame();
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
    if (elapsed == 1)
      this.stopAnimation();
  },
  move: function(stopX, stopY, duration) {
    this.setAnimation(function (elapsed, x, y, startX, startY) {
        this.setPosition(x + (stopX - x) * elapsed,
                         y + (stopY - y) * elapsed);
      }, duration);
  }
}

function SceneGraph(canvas) {
  this.sprites = [];

  // animate the scene graph, returning false if the animation is done
  function animate(sprites, now) {
    var more = false;
    for (var n = 0; n < sprites.length; ++n) {
      var sprite = sprites[n];
      if (sprite.fn) {
        more = true;
        sprite.animate(now);
      }
    }
    return more;
  }
  // fallback 2D canvas backend
  function draw(sprites) {
    var ctx = canvas.getContext('2d');
    for (var n = 0; n < sprites.length; ++n) {
      var sprite = sprites[n];
      ctx.putImageData(sprite.imageData, sprite.x, sprite.y);
    }
  }

  var self = this;
  window.addEventListener("MozBeforePaint", function(event) {
      // continue painting until we are run out of animations
      if (animate(self.sprites, event.timeStamp)) {
        draw(sprites);
        RequestAnimationFrame();
      }
    }, false);
}

SceneGraph.prototype = {
  // add a sprite to the scene graph
  add: function(sprite) {
    var sprites = this.sprites;
    sprite.index = sprites.length;
    sprite.sceneGraph = this;
    sprites.push(sprite);
  },
  // remove a sprite from the scene graph
  remove: function(sprite) {
    var sprites = this.sprites;
    sprites.splice(sprites.length, 1);
  }
}
