/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

function GetAnimationStartTime() {
  return window.mozAnimationStartTime ||
         window.webkitAnimationStartTime ||
         window.animationStartTime;
}

function RequestAnimationFrame() {
  if (window.mozRequestAnimationFrame)
    window.mozRequestAnimationFrame();
  else if (window.webkitRequestAnimationFrame)
    window.webkitRequestAnimationFrame();
  else if (window.requestAnimationFrame)
    window.requestAnimationFrame();
}

function Sprite(canvas, x, y, scale) {
  this.canvas = canvas || null;
  this.setPosition(x | 0, y | 0);
  this.setScale(scale || 1);
}

Sprite.prototype = {
  setCanvas: function(canvas) {
    this.canvas = canvas;
    RequestAnimationFrame();
  },
  setPosition: function(targetX, targetY, duration, fn) {
    if (duration && (this.x != targetX || this.y != targetY)) {
      this.targetX = targetX;
      this.targetY = targetY;
      this.moveStart = GetAnimationStartTime();
      this.moveStop = this.moveStart + duration;
      this.moveFunction = fn || function(elapsed) {
        var x = this.x;
        var y = this.y;
        this.x = x + (this.targetX - x) * elapsed;
        this.y = y + (this.targetY - y) * elapsed;
      }
      RequestAnimationFrame();
      return;
    }
    this.x = targetX;
    this.y = targetY;
    this.moveFuncton = null;
  },
  setScale: function(targetScale, duration, fn) {
    if (duration && this.scale != targetScale) {
      this.targetScale = targetScale;
      this.scaleStart = GetAnimationStartTime();
      this.scaleStop = this.scaleStart + duration;
      this.scaleFunction = fn || function(elapsed) {
        var scale = this.scale;
        this.scale = scale + (this.targetScale - scale) * elapsed;
      }
      RequestAnimationFrame();
      return;
    }
    this.scale = targetScale;
    this.scaleFunction = null;
  },
  stopAnimation: function() {
    this.moveFunction = this.scaleFunction = null;
  },
  animate: function(now) {
    function GetElapsed(start, stop, now) {
      return (now < start || now > stop) ? 1 : ((now - start) / (stop - start));
    }
    if (this.moveFunction) {
      var elapsed = GetElapsed(this.moveStart, this.moveStop, now);
      this.moveFunction(elapsed);
      if (elapsed == 1)
        this.moveFunction = null;
    }
    if (this.scaleFunction) {
      var elapsed = GetElapsed(this.scaleStart, this.scaleStop, now);
      this.scaleFunction(elapsed);
      if (elapsed == 1)
        this.scaleFunction = null;
    }
    return this.moveFunction || this.scaleFunction;
  }
}

function SceneGraph(canvas) {
  this.sprites = [];

  // animate the scene graph, returning false if the animation is done
  function animate(sprites, now) {
    console.log(uneval(sprites));
    var more = false;
    for (var n = 0; n < sprites.length; ++n) {
      var sprite = sprites[n];
      if (sprite.animate(now))
        more = true;
    }
    return more;
  }
  // fallback 2D canvas backend
  function draw(sprites) {
    var ctx = canvas.getContext('2d');
    for (var n = 0; n < sprites.length; ++n) {
      var sprite = sprites[n];
      var canvas = sprite.canvas;
      if (canvas) {
        var scale = sprite.scale;
        ctx.drawImage(canvas, sprite.x, sprite.y, canvas.width * scale, canvas.height * scale);
      }
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
    sprites.push(sprite);
  },
  // remove a sprite from the scene graph
  remove: function(sprite) {
    var sprites = this.sprites;
    sprites.splice(sprites.index, 1);
  },
  // walk over all sprites in the scene
  forAll: function(callback) {
    var sprites = this.sprites;
    for (var n = 0; n < sprites.length; ++n)
      callback(sprites[n]);
  }
}
