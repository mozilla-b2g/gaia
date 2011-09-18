/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/*const*/var kUseGL = 1;

function abort(why) { alert(why); throw why; }
function assert(cond, msg) { if (!cond) abort(msg); }

// Return the current time of the "animation clock", which ticks on
// each frame drawn.
function GetAnimationClockTime() {
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

var Physics = {
  Linear: function(elapsed, start, current, target) {
    return start + (target - start) * elapsed;
  },
  Spring: function(elapsed, start, current, target) {
    return current + (target - current) * elapsed;
  }
}

function Sprite(canvas, x, y, scale) {
  this.canvas = canvas || null;
  this.width = this.height = 0;
  this.setPosition(x | 0, y | 0);
  this.setScale(scale || 1);
}

Sprite.prototype = {
  setCanvas: function(canvas) {
    this.canvas = canvas;
    this.width = canvas.width;
    this.height = canvas.height;
    RequestAnimationFrame();
  },
  setPosition: function(targetX, targetY, duration, fn) {
    if (duration && (this.x != targetX || this.y != targetY)) {
      this.startX = this.x;
      this.startY = this.y;
      this.targetX = targetX;
      this.targetY = targetY;
      this.moveStart = GetAnimationClockTime();
      this.moveStop = this.moveStart + duration;
      this.moveFunction = fn || Physics.Linear;
      RequestAnimationFrame();
      return;
    }
    this.x = targetX;
    this.y = targetY;
    this.moveFuncton = null;
  },
  setScale: function(targetScale, duration, fn) {
    if (duration && this.scale != targetScale) {
      this.startScale = this.scale;
      this.targetScale = targetScale;
      this.scaleStart = GetAnimationClockTime();
      this.scaleStop = this.scaleStart + duration;
      this.scaleFunction = fn || Physics.Linear;
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
      this.x = this.moveFunction(elapsed, this.startX, this.x, this.targetX);
      this.y = this.moveFunction(elapsed, this.startY, this.y, this.targetY);
      if (elapsed == 1)
        this.moveFunction = null;
    }
    if (this.scaleFunction) {
      var elapsed = GetElapsed(this.scaleStart, this.scaleStop, now);
      this.scale = this.scaleFunction(elapsed, this.startScale, this.scale, this.targetScale);
      if (elapsed == 1)
        this.scaleFunction = null;
    }
    return this.moveFunction || this.scaleFunction;
  }
}

function SceneGraph(canvas) {
  this.blitter =
    kUseGL ? new SpriteBlitterGL(canvas) : new SpriteBlitter2D(canvas);
  this.canvas = canvas;
  this.sprites = [];

  // animate the scene graph, returning false if the animation is done
  function animate(sprites, now) {
    var more = false;
    for (var n = 0; n < sprites.length; ++n) {
      var sprite = sprites[n];
      if (sprite.animate(now))
        more = true;
    }
    return more;
  }

  var self = this;
  window.addEventListener("MozBeforePaint", function(event) {
      // continue painting until we are run out of animations
      if (animate(self.sprites, GetAnimationClockTime()))
        RequestAnimationFrame();
      self.blitter.draw(self.sprites);
    }, false);
}

SceneGraph.prototype = {
  // add a sprite to the scene graph
  add: function(sprite) {
    var sprites = this.sprites;
    sprite.index = sprites.length;
    sprites.push(sprite);
    this.blitter.spriteAdded(sprite);
  },
  // remove a sprite from the scene graph
  remove: function(sprite) {
    var sprites = this.sprites;
    sprites.splice(sprites.index, 1);
    this.blitter.spriteRemoved(sprite);
  },
  // walk over all sprites in the scene
  forAll: function(callback) {
    var sprites = this.sprites;
    for (var n = 0; n < sprites.length; ++n)
      callback(sprites[n]);
  },
  forHit: function(x, y, callback) {
    var canvas = this.canvas;
    x -= canvas.clientLeft;
    y -= canvas.clientTop;
    if (x >= canvas.clientWidth || y >= canvas.clientHeight)
      return;
    var sprites = this.sprites;
    for (var n = 0; n < sprites.length; ++n) {
      var sprite = sprites[n];
      if (x >= sprite.x && x < sprite.x + sprite.width &&
          y >= sprite.y && y < sprite.y + sprite.height) {
        callback(sprite);
        return;
      }
    }
  }
}

// fallback 2D canvas backend
function SpriteBlitter2D(canvas) {
  this.canvas = canvas;
}
SpriteBlitter2D.prototype = {
  draw: function(sprites) {
    var canvas = this.canvas;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (var n = 0; n < sprites.length; ++n) {
      var sprite = sprites[n];
      var canvas = sprite.canvas;
      if (canvas) {
        var scale = sprite.scale;
        ctx.drawImage(canvas, sprite.x, sprite.y, canvas.width * scale, canvas.height * scale);
      }
    }    
  },
  // nothing to do here
  spriteAdded: function(sprite) {},
  spriteRemoved: function(sprite) {}
};

// blt using WebGL.  This should be as fast or faster than using a 2D
// drawing context when the browser engine is drawing with OpenGL (and
// so doesn't need to read back from the WebGL context).
var kVertexShader = [
  'attribute vec4 aPosAndTexCoord;',
  'uniform mat4 uProjection;',
  'varying vec2 vTexCoord;',
  '',
  'void main(void) {',
  '  vTexCoord = aPosAndTexCoord.zw;',
  '  vec4 transformedPos = vec4(aPosAndTexCoord.x, aPosAndTexCoord.y, 0.0, 1.0);',
  '  gl_Position = uProjection * transformedPos;',
  '}'
].join("\n");

var kFragmentShader = [
  '#ifdef GL_ES',
  'precision highp float;',
  '#endif',
  '',
  'varying vec2 vTexCoord;',
  'uniform sampler2D uTexture;',
  '',
  'void main(void) {',
  '  vec4 texColor;',
  '  texColor = texture2D(uTexture, vTexCoord);',
  '  gl_FragColor = texColor;',
  '}'
].join("\n");

var kMaxTextureSize = 0;

// NB: sprites really need a depth value since they can overlap.  As
// it stands we should assume that they're drawn in an undefined
// z-order (GL may actually specify that, not sure).
function SpriteBlitterGL(canvas) {
  this.canvas = canvas;
  var gl =
    this.gl = canvas.getContext('experimental-webgl');
  this.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  this.posAndTexCoordArray = new Float32Array(4/*vertices*/ * 4/*elements per vertex*/);
  this.posAndTexCoordBuffer = gl.createBuffer();
  var program =
    this.program = compileGLProgram(gl, kVertexShader, kFragmentShader);
  this.projectionMatrix = new Float32Array(
    [ 2.0,     0.0,   0.0,   0.0,
      0.0,    -2.0,   0.0,   0.0,
      0.0,     0.0,   1.0,   0.0,
     -1.0,     1.0,   0.0,   1.0 ]);
  this.viewportWidth = canvas.width;
  this.viewportHeight = canvas.height;

  gl.useProgram(program);

  program.aPosAndTexCoord = gl.getAttribLocation(program, 'aPosAndTexCoord');
  gl.enableVertexAttribArray(program.aPosAndTexCoord);

  program.uProjection = gl.getUniformLocation(program, 'uProjection');
  program.uTexture = gl.getUniformLocation(program, 'uTexture');

  gl.clearColor(0.0, 0.0, 0.0, 0.0);
}
SpriteBlitterGL.prototype = {
  draw: function(sprites) {
    var gl = this.gl;
    var posAndTexCoordArray = this.posAndTexCoordArray;
    var posAndTexCoordBuffer = this.posAndTexCoordBuffer;
    var program = this.program;
    var viewportWidth = this.viewportWidth, viewportHeight = this.viewportHeight;

    gl.viewport(0, 0, viewportWidth, viewportHeight);

    gl.clear(gl.COLOR_BUFFER_BIT);

    // XXX we need to enable blending to deal with overlapping
    // sprites, but doing so causes the appearance of fonts to worsen.
    // Need to investigate that.
    gl.enable(gl.BLEND);
    // "over" operator
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.uniformMatrix4fv(program.uProjection, false, this.projectionMatrix);
    gl.uniform1i(program.uTexture, 0);

    for (var n = 0; n < sprites.length; ++n) {
      var sprite = sprites[n];
      var canvas = sprite.canvas;
      var scale = sprite.scale;
      var x = sprite.x / viewportWidth;
      var y = sprite.y / viewportHeight;
      var width = canvas.width * scale;
      var height = canvas.height * scale;
      var xmost = x + width / viewportWidth;
      var ymost = y + height / viewportHeight;

      var i = 0;
      // bottom left
      posAndTexCoordArray[i++] = x;
      posAndTexCoordArray[i++] = ymost;
      posAndTexCoordArray[i++] = 0;
      posAndTexCoordArray[i++] = 0;
      // bottom right
      posAndTexCoordArray[i++] = xmost;
      posAndTexCoordArray[i++] = ymost;
      posAndTexCoordArray[i++] = 1;
      posAndTexCoordArray[i++] = 0;
      // top left
      posAndTexCoordArray[i++] = x;
      posAndTexCoordArray[i++] = y;
      posAndTexCoordArray[i++] = 0;
      posAndTexCoordArray[i++] = 1;
      // top right
      posAndTexCoordArray[i++] = xmost;
      posAndTexCoordArray[i++] = y;
      posAndTexCoordArray[i++] = 1;
      posAndTexCoordArray[i++] = 1;

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, sprite.texture);

      gl.bindBuffer(gl.ARRAY_BUFFER, posAndTexCoordBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, posAndTexCoordArray, gl.STREAM_DRAW);
      gl.vertexAttribPointer(program.aPosition, 4, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    gl.bindTexture(gl.TEXTURE_2D, null);
  },
  spriteAdded: function(sprite) {
    if (('texture' in sprite) && sprite.texture !== null)
      return;

    var canvas = sprite.canvas;
    assert(canvas.width <= this.maxTextureSize
           && canvas.height <= this.maxTextureSize,
           "Sprite canvas must be smaller than max texture dimension");
    var gl = this.gl;
    var texture = sprite.texture = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE,
                  sprite.canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    // XXX mipmap if we start downscaling a lot
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
  },
  spriteRemoved: function(sprite) {
    gl.deleteTexture(sprite.texture);
    sprite.texture = null;
  }
};

function compileGLProgram(gl, vxShader, pixShader) {
  function compileShader(type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    assert(gl.getShaderParameter(shader, gl.COMPILE_STATUS),
           "Compile error for "+ type +": "+ gl.getShaderInfoLog(shader));
    return shader;
  }

  var p = gl.createProgram();
  var vs = compileShader(gl.VERTEX_SHADER, vxShader);
  var fs = compileShader(gl.FRAGMENT_SHADER, pixShader);
  gl.attachShader(p, vs);  gl.deleteShader(vs);
  gl.attachShader(p, fs);  gl.deleteShader(fs);
  gl.linkProgram(p);

  if (!gl.getProgramParameter(p, gl.LINK_STATUS))
    // FIXME fall back on 2d
    abort("Failed to compile shaders.");

  return p;
}
