/*
 * ImageEditor.js: simple image editing and previews in a <canvas> element.
 *
 * Display an edited version of the specified image in a <canvas> element
 * inside the specified container element. The image (or cropped region of
 * the image) will be displayed as large as possible within the container's
 * area.  Edits is an object that specifies the edits to apply to the image.
 * The edits object may include these properties:
 *
 *  gamma: a float specifying gamma correction
 *  matrix: a 4x4 matrix that represents a transformation of each rgba pixel.
 *    this can be used to convert to bw or sepia, for example.
 *  borderWidth: the size of the border as a fraction of the image width
 *  borderColor: a [r, g, b, a] array specifying border color
 *
 * In addition to previewing the image, this class also defines a
 * getFullSizeBlob() function that creates a full-size version of the
 * edited image.
 *
 * This class also handles cropping.  See:
 *
 *   showCropOverlay()
 *   hideCropOverlay()
 *   cropImage()
 *   undoCrop()
 *
 * This code expects WebGL GLSL shader programs in scripts with ids
 * edit-vertex-shader and edit-fragment-shader. It dynamically creates
 * canvas elements with ids edit-preview-canvas and edit-crop-canvas.
 * The stylesheet includes static styles to position those dyanamic elements.
 */
'use strict';

function ImageEditor(imageURL, container, edits, ready) {
  this.imageURL = imageURL;
  this.container = container;
  this.edits = edits || {};
  this.source = {};     // The source rectangle (crop region) of the image
  this.dest = {};       // The destination (preview) rectangle of canvas
  this.cropRegion = {}; // Region displayed in crop overlay during drags

  // Start loading the image into a full-size offscreen image
  this.original = new Image();
  this.original.src = imageURL;
  var self = this;

  // When the image loads display it
  this.original.onload = function() {
    // Initialize the crop region to the full size of the original image
    self.resetCropRegion();

    // Display an edited preview of it
    self.edit();

    // If the constructor had a ready callback argument, call it now
    if (ready)
      ready();
  }

  // The canvas that displays the preview
  this.previewCanvas = document.createElement('canvas');
  this.previewCanvas.id = 'edit-preview-canvas'; // for stylesheet
  this.container.appendChild(this.previewCanvas);
  this.previewCanvas.width = this.previewCanvas.clientWidth;
  this.previewCanvas.height = this.previewCanvas.clientHeight;
  this.processor = new ImageProcessor(this.previewCanvas);
}

ImageEditor.prototype.destroy = function() {
  this.processor.destroy();
  this.original.src = '';
  this.original = null;
  this.container.removeChild(this.previewCanvas);
  this.previewCanvas = null;
  this.hideCropOverlay();
};

// Preview the image with the specified edits applyed. If edits is omitted,
// displays the original image. Clients should call this function when the
// desired edits change or when the size of the container changes (on
// orientation change events, for example)
ImageEditor.prototype.edit = function() {
  var canvas = this.previewCanvas;
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;

  // Source image dimensions
  var source = this.source;

  // Compute the destination rectangle in the preview canvas
  var dest = this.dest;
  var scalex = canvas.width / source.w;
  var scaley = canvas.height / source.h;
  var scale = Math.min(Math.min(scalex, scaley), 1);

  dest.w = Math.floor(source.w * scale);
  dest.h = Math.floor(source.h * scale);
  dest.x = Math.floor((canvas.width - dest.w) / 2);
  dest.y = Math.floor((canvas.height - dest.h) / 2);

  this.processor.draw(this.original,
                      source.x, source.y, source.w, source.h,
                      dest.x, dest.y, dest.w, dest.h,
                      this.edits);
};

// Apply the edits offscreen and pass the full-size edited image as a blob
// to the specified callback function. The code here is much like the
// code above in edit().
ImageEditor.prototype.getFullSizeBlob = function(type, callback) {
  // Create an offscreen canvas of the same size
  var canvas = document.createElement('canvas');
  canvas.width = this.source.w; // "full size" is cropped image size
  canvas.height = this.source.h;

  // Create an ImageProcessor object and use it to draw the edited
  // image to the full-size offscreen canvas
  var processor = new ImageProcessor(canvas);
  processor.draw(this.original,
                 this.source.x, this.source.y, this.source.w, this.source.h,
                 0, 0, this.source.w, this.source.h,
                 this.edits);

  // Now get the canvas contents as a file and pass to the callback
  callback(canvas.mozGetAsFile('', type));

  // Deallocate stuff
  processor.destroy();
  canvas.width = 0;
};


// Display cropping controls
// XXX: have to handle rotate/resize
ImageEditor.prototype.showCropOverlay = function showCropOverlay() {
  var canvas = this.cropCanvas = document.createElement('canvas');
  var context = this.cropContext = canvas.getContext('2d');
  canvas.id = 'edit-crop-canvas'; // for stylesheet
  this.container.appendChild(canvas);

  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;

  // Crop handle styles
  context.translate(10, 10);
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.strokeStyle = 'rgba(255,255,255,.75)';

  // Start off with a crop region that is the entire preview canvas
  var region = this.cropRegion;
  region.left = 0;
  region.top = 0;
  region.right = this.dest.w;
  region.bottom = this.dest.h;

  this.drawCropControls();

  canvas.addEventListener('mousedown', this.cropStart.bind(this));
};

ImageEditor.prototype.hideCropOverlay = function hideCropOverlay() {
  if (this.cropCanvas) {
    this.container.removeChild(this.cropCanvas);
    this.cropCanvas.width = 0;
    this.cropCanvas = this.cropContext = null;
  }
};

// Reset image to full original size
ImageEditor.prototype.resetCropRegion = function resetCropRegion() {
  this.source.x = 0;
  this.source.y = 0;
  this.source.w = this.original.width;
  this.source.h = this.original.height;
};

ImageEditor.prototype.drawCropControls = function(handle) {
  var canvas = this.cropCanvas;
  var context = this.cropContext;
  var region = this.cropRegion;
  var dest = this.dest;
  var left = region.left + dest.x;
  var top = region.top + dest.y;
  var right = region.right + dest.x;
  var bottom = region.bottom + dest.y;
  var centerX = (left + right) / 2;
  var centerY = (top + bottom) / 2;
  var width = right - left;
  var height = bottom - top;

  // Erase everything
  context.clearRect(-10, -10, canvas.width, canvas.height);

  // Overlay the preview canvas with translucent gray
  context.fillStyle = 'rgba(0, 0, 0, .5)';
  context.fillRect(dest.x, dest.y, dest.w, dest.h);

  // Clear a rectangle so interior of the crop region shows through
  context.clearRect(left, top, width, height);

  // Draw a border around the crop region
  context.lineWidth = 1;
  context.strokeRect(left, top, width, height);

  // Draw the drag handles in the corners of the crop region
  context.lineWidth = 4;
  context.beginPath();

  // N
  context.moveTo(centerX - 23, top - 1);
  context.lineTo(centerX + 23, top - 1);

  // E
  context.moveTo(right + 1, centerY - 23);
  context.lineTo(right + 1, centerY + 23);

  // S
  context.moveTo(centerX - 23, bottom + 1);
  context.lineTo(centerX + 23, bottom + 1);

  // W
  context.moveTo(left - 1, centerY - 23);
  context.lineTo(left - 1, centerY + 23);

  // Don't draw the corner handles if there is an aspect ratio we're maintaining
  if (!this.cropAspectWidth) {
    // NE
    context.moveTo(right - 23, top - 1);
    context.lineTo(right + 1, top - 1);
    context.lineTo(right + 1, top + 23);

    // SE
    context.moveTo(right + 1, bottom - 23);
    context.lineTo(right + 1, bottom + 1);
    context.lineTo(right - 23, bottom + 1);

    // SW
    context.moveTo(left + 23, bottom + 1);
    context.lineTo(left - 1, bottom + 1);
    context.lineTo(left - 1, bottom - 23);

    // NW
    context.moveTo(left - 1, top + 23);
    context.lineTo(left - 1, top - 1);
    context.lineTo(left + 23, top - 1);
  }

  // Draw all the handles at once
  context.stroke();

  // If one of the handles is being used, highlight it
  if (handle) {
    var cx, cy;
    switch (handle) {
    case 'n':
      cx = centerX;
      cy = top;
      break;
    case 'ne':
      cx = right;
      cy = top;
      break;
    case 'e':
      cx = right;
      cy = centerY;
      break;
    case 'se':
      cx = right;
      cy = bottom;
      break;
    case 's':
      cx = centerX;
      cy = bottom;
      break;
    case 'sw':
      cx = left;
      cy = bottom;
      break;
    case 'w':
      cx = left;
      cy = centerY;
      break;
    case 'nw':
      cx = left;
      cy = top;
      break;
    }

    context.beginPath();
    context.arc(cx, cy, 25, 0, 2 * Math.PI);
    context.fillStyle = 'rgba(255,255,255,.5)';
    context.lineWidth = 1;
    context.fill();
  }
};

// Called on mousedown in the crop overlay canvas
ImageEditor.prototype.cropStart = function(startEvent) {
  var self = this;
  var region = this.cropRegion;
  var dest = this.dest;
  var rect = this.previewCanvas.getBoundingClientRect();
  var x0 = startEvent.clientX - rect.left - dest.x;
  var y0 = startEvent.clientY - rect.top - dest.y;
  var left = region.left;
  var top = region.top;
  var right = region.right;
  var bottom = region.bottom;
  var aspectRatio = this.cropAspectWidth ?
    this.cropAspectWidth / this.cropAspectHeight :
    0;
  var centerX = (region.left + region.right) / 2;
  var centerY = (region.top + region.bottom) / 2;

  // Return true if (x0,y0) is within 25 pixels of (x,y)
  function hit(x, y) {
    return (x0 > x - 25 && x0 < x + 25 &&
            y0 > y - 25 && y0 < y + 25);
  }

  if (hit((left + right) / 2, top))
    drag('n');
  else if (hit(right, (top + bottom) / 2))
    drag('e');
  else if (hit((left + right) / 2, bottom))
    drag('s');
  else if (hit(left, (top + bottom) / 2))
    drag('w');
  else if (!aspectRatio) {
    if (hit(right, top))
      drag('ne');
    else if (hit(right, bottom))
      drag('se');
    else if (hit(left, bottom))
      drag('sw');
    else if (hit(left, top))
      drag('nw');
    else
      drag(); // with no argument, do a pan instead of a drag
  }
  else
    drag(); // pan

  function drag(handle) {
    window.addEventListener('mousemove', move, true);
    window.addEventListener('mouseup', up, true);

    self.drawCropControls(handle); // highlight drag handle

    function move(e) {
      var dx = e.clientX - startEvent.clientX;
      var dy = e.clientY - startEvent.clientY;

      var newleft = region.left;
      var newright = region.right;
      var newtop = region.top;
      var newbottom = region.bottom;

      if (!handle) {
        pan(dx, dy);
        return;
      }

      switch (handle) {
      case 'n':
        newtop = top + dy;
        break;
      case 'ne':
        newright = right + dx;
        newtop = top + dy;
        break;
      case 'e':
        newright = right + dx;
        break;
      case 'se':
        newright = right + dx;
        newbottom = bottom + dy;
        break;
      case 's':
        newbottom = bottom + dy;
        break;
      case 'sw':
        newleft = left + dx;
        newbottom = bottom + dy;
        break;
      case 'w':
        newleft = left + dx;
        break;
      case 'nw':
        newleft = left + dx;
        newtop = top + dy;
        break;
      }

      // If there is an aspect ratio, make sure we maintain it.
      // Note that if there is an aspect ratio we won't display
      // the corner drag handles, so we don't have to handle those.
      if (aspectRatio) {
        var width, height;
        switch (handle) {
        case 'n':
        case 's':
          // change width to match the new height, keeping the center still
          height = newbottom - newtop;
          width = height * aspectRatio;
          newleft = Math.floor(centerX - Math.floor(width / 2));
          newright = Math.ceil(centerX + Math.ceil(width / 2));
          break;
        case 'e':
        case 'w':
          // Change height to match new width, keeping center still
          width = newright - newleft;
          height = width / aspectRatio;
          newtop = Math.floor(centerY - Math.floor(height / 2));
          newbottom = Math.ceil(centerY + Math.ceil(height / 2));
          break;
        }
      }

      // Now if the new region is out of bounds then bail out without
      // changing the region at all and ignore this move event
      if (newtop < 0 || newleft < 0 ||
          newright > dest.w || newbottom > dest.h)
        return;

      // Don't let the crop region become smaller than 100x100. If it does
      // then the sensitive regions of the crop handles start to intersect.
      // If there is a cropping aspect ratio, then the minimum size in
      // one dimension will be 100 and will be larger in the other.
      var minWidth = 100, minHeight = 100;
      if (aspectRatio) {
        if (aspectRatio > 1)
          minWidth = Math.round(minWidth * aspectRatio);
        else if (aspectRatio < 1)
          minHeight = Math.round(minHeight / aspectRatio);
      }
      if (newright - newleft < minWidth || newbottom - newtop < minHeight)
        return;

      // Otherwise, all is well, so update the crop region and redraw
      region.left = newleft;
      region.right = newright;
      region.top = newtop;
      region.bottom = newbottom;

      self.drawCropControls(handle);
    }

    function pan(dx, dy) {
      if (dx > 0)
        dx = Math.min(dx, dest.w - right);
      if (dx < 0)
        dx = Math.max(dx, -left);
      if (dy > 0)
        dy = Math.min(dy, dest.h - bottom);
      if (dy < 0)
        dy = Math.max(dy, -top);

      region.left = left + dx;
      region.right = right + dx;
      region.top = top + dy;
      region.bottom = bottom + dy;

      self.drawCropControls();
    }

    function up(e) {
      window.removeEventListener('mousemove', move, true);
      window.removeEventListener('mouseup', up, true);
      self.drawCropControls(); // erase drag handle highlight
    }
  }

};

// If the crop overlay is displayed, use the current position of the
// overlaid crop region to actually set the crop region of the original image
ImageEditor.prototype.cropImage = function() {
  if (!this.cropCanvas)
    return;

  var region = this.cropRegion;
  var dest = this.dest;

  // Convert the preview crop region to fractions
  var left = region.left / dest.w;
  var right = region.right / dest.w;
  var top = region.top / dest.h;
  var bottom = region.bottom / dest.h;

  // Now convert those fractions to pixels in the original image
  // Note that the original image may have already been cropped, so we
  // multiply by the size of the crop region, not the full size
  left = Math.floor(left * this.source.w);
  right = Math.ceil(right * this.source.w);
  top = Math.floor(top * this.source.h);
  bottom = Math.floor(bottom * this.source.h);

  // XXX: tweak these to make sure we still have the right aspect ratio
  // after rounding to pixels
  console.error('Maintain aspect ratio precisely!!!');

  // And update the real crop region
  this.source.x += left;
  this.source.y += top;
  this.source.w = right - left;
  this.source.h = bottom - top;

  // Adjust the image
  this.edit();

  // Hide and reshow the crop overlay to reset it to match the new image size
  this.hideCropOverlay();
  this.showCropOverlay();
};

// Restore the image to its full original size
ImageEditor.prototype.undoCrop = function() {
  this.resetCropRegion();
  this.edit();
  this.hideCropOverlay();
  this.showCropOverlay();
};

// Pass no arguments for freeform 1,1 for square,
// 2,3 for portrait, 3,2 for landscape.
ImageEditor.prototype.setCropAspectRatio = function(ratioWidth, ratioHeight) {
  var region = this.cropRegion;
  var dest = this.dest;

  this.cropAspectWidth = ratioWidth || 0;
  this.cropAspectHeight = ratioHeight || 0;

  if (ratioWidth && ratioHeight) {
    // Constrained cropping, centered on image
    var centerX = dest.w / 2;
    var centerY = dest.h / 2;

    var scaleX = dest.w / ratioWidth;
    var scaleY = dest.h / ratioHeight;
    var scale = Math.min(scaleX, scaleY);

    var width = Math.floor(scale * ratioWidth);
    var height = Math.floor(scale * ratioHeight);

    region.left = centerX - width / 2;
    region.right = centerX + width / 2;
    region.top = centerY - height / 2;
    region.bottom = centerY + height / 2;
  }
  else {
    // Freeform cropping
    region.left = 0;
    region.top = 0;
    region.right = dest.w;
    region.bottom = dest.h;
  }

  this.drawCropControls();
};

// Get the pixels of the selected crop region, and resize them if width
// and height are specifed, encode them as an image file of the specified
// type and pass that file as a blob to the specified callback
ImageEditor.prototype.getCroppedRegionBlob = function(type,
                                                      width, height,
                                                      callback)
{
  // This is similar to the code in cropImage() and getFullSizeBlob
  // but since we're doing only cropping and no pixel manipulation I
  // don't need to create an ImageProcessor object.

  // Compute the rectangle of the original image that the user selected
  var region = this.cropRegion;
  var dest = this.dest;

  // Convert the preview crop region to fractions
  var left = region.left / dest.w;
  var right = region.right / dest.w;
  var top = region.top / dest.h;
  var bottom = region.bottom / dest.h;

  // Now convert those fractions to pixels in the original image
  // Note that the original image may have already been cropped, so we
  // multiply by the size of the crop region, not the full size
  left = Math.floor(left * this.source.w);
  right = Math.ceil(right * this.source.w);
  top = Math.floor(top * this.source.h);
  bottom = Math.floor(bottom * this.source.h);

  // If no destination size was specified, use the source size
  if (!width || !height) {
    width = right - left;
    height = bottom - top;
  }

  // Create a canvas of the desired size
  var canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  var context = canvas.getContext('2d');

  // Copy that rectangle to our canvas
  context.drawImage(this.original,
                    left, top, right - left, bottom - top,
                    0, 0, width, height);

  canvas.toBlob(callback, type);
};

//
// Create a new ImageProcessor object for the specified canvas to do
// webgl transformations on an image.  Expects its shader programs to be in
// <script> elements with ids 'edit-vertex-shader' and 'edit-fragment-shader'.
//
function ImageProcessor(canvas) {
  // WebGL context for the canvas
  this.canvas = canvas;
  var gl = this.context = canvas.getContext('webgl') ||
    canvas.getContext('experimental-webgl');

  // Define our shader programs
  var vshader = this.vshader = gl.createShader(gl.VERTEX_SHADER);
  var vshadersrc = document.getElementById('edit-vertex-shader').text;
  gl.shaderSource(vshader, vshadersrc);
  gl.compileShader(vshader);
  if (!gl.getShaderParameter(vshader, gl.COMPILE_STATUS)) {
    var error = new Error('Error compiling vertex shader:' +
                          gl.getShaderInfoLog(vshader));
    gl.deleteShader(vshader);
    throw error;
  }

  var fshader = this.fshader = gl.createShader(gl.FRAGMENT_SHADER);
  var fshadersrc = document.getElementById('edit-fragment-shader').text;
  gl.shaderSource(fshader, fshadersrc);
  gl.compileShader(fshader);
  if (!gl.getShaderParameter(fshader, gl.COMPILE_STATUS)) {
    var error = new Error('Error compiling fragment shader:' +
                          gl.getShaderInfoLog(fshader));
    gl.deleteShader(fshader);
    throw error;
  }

  var program = this.program = gl.createProgram();
  gl.attachShader(program, vshader);
  gl.attachShader(program, fshader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    var error = new Error('Error linking GLSL program:' +
                          gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    throw error;
  }
  gl.useProgram(program);

  // Create a texture to hold the source image once we have one
  this.sourceTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  // Create buffers to hold the input and output rectangles
  this.sourceRectangle = gl.createBuffer();
  this.destinationRectangle = gl.createBuffer();


  // Look up the addresses of the program's input variables
  this.srcPixelAddress = gl.getAttribLocation(program, 'src_pixel');
  this.destPixelAddress = gl.getAttribLocation(program, 'dest_pixel');
  this.canvasSizeAddress = gl.getUniformLocation(program, 'canvas_size');
  this.imageSizeAddress = gl.getUniformLocation(program, 'image_size');
  this.destSizeAddress = gl.getUniformLocation(program, 'dest_size');
  this.destOriginAddress = gl.getUniformLocation(program, 'dest_origin');
  this.matrixAddress = gl.getUniformLocation(program, 'matrix');
  this.gammaAddress = gl.getUniformLocation(program, 'gamma');
  this.borderWidthAddress = gl.getUniformLocation(program, 'border_width');
  this.borderColorAddress = gl.getUniformLocation(program, 'border_color');

}

// Destroy all the stuff we allocated
ImageProcessor.prototype.destroy = function() {
  var gl = this.context;
  gl.deleteShader(this.vshader);
  gl.deleteShader(this.fshader);
  gl.deleteProgram(this.program);
  gl.deleteTexture(this.sourceTexture);
  gl.deleteBuffer(this.sourceRectangle);
  gl.deleteBuffer(this.destinationRectangle);
};

ImageProcessor.prototype.draw = function(image,
                                         sx, sy, sw, sh,
                                         dx, dy, dw, dh,
                                         options)
{
  var gl = this.context;

  // Set the canvas size and image size
  gl.uniform2f(this.canvasSizeAddress, this.canvas.width, this.canvas.height);
  gl.uniform2f(this.imageSizeAddress, image.width, image.height);
  gl.uniform2f(this.destOriginAddress, dx, dy);
  gl.uniform2f(this.destSizeAddress, dw, dh);

  // Set the gamma correction
  var gammaArray;
  if (options.gamma)
    gl.uniform4f(this.gammaAddress,
                 options.gamma, options.gamma, options.gamma, options.gamma);
  else
    gl.uniform4f(this.gammaAddress, 1, 1, 1, 1);

  // Set the color transformation
  gl.uniformMatrix4fv(this.matrixAddress, false,
                      options.matrix || ImageProcessor.IDENTITY_MATRIX);

  // Set border size and color
  if (options.borderWidth)
    gl.uniform1f(this.borderWidthAddress, Math.ceil(dw * options.borderWidth));
  else
    gl.uniform1f(this.borderWidthAddress, 0);

  gl.uniform4fv(this.borderColorAddress, options.borderColor || [0, 0, 0, 0]);

  // Define the source rectangle
  makeRectangle(this.sourceRectangle, sx, sy, sw, sh);
  gl.enableVertexAttribArray(this.srcPixelAddress);
  gl.vertexAttribPointer(this.srcPixelAddress, 2, gl.FLOAT, false, 0, 0);

  // Load the image into the texture
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

  // Define the destination rectangle we're copying the image into
  makeRectangle(this.destinationRectangle, dx, dy, dw, dh);
  gl.enableVertexAttribArray(this.destPixelAddress);
  gl.vertexAttribPointer(this.destPixelAddress, 2, gl.FLOAT, false, 0, 0);

  // And draw it all
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  // Define a rectangle as two triangles
  function makeRectangle(b, x, y, w, h) {
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      x, y, x + w, y, x, y + h,         // one triangle
      x, y + h, x + w, y, x + w, y + h  // another triangle
    ]), gl.STATIC_DRAW);
  }
};

ImageProcessor.IDENTITY_MATRIX = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1
];

ImageProcessor.none_matrix = ImageProcessor.IDENTITY_MATRIX;

ImageProcessor.sepia_matrix = [
  0.393, 0.769, 0.189, 0,
  0.349, 0.686, 0.168, 0,
  0.272, 0.534, 0.131, 0,
  0, 0, 0, 1
];

ImageProcessor.bw_matrix = [
  .65, .25, .10, 0,
  .65, .25, .10, 0,
  .65, .25, .10, 0,
  0, 0, 0, 1
];

ImageProcessor.bluesteel_matrix = [
  1, .25, .65, 0,
  .1, 1, .65, 0,
  .1, .25, 1, .1,
  0, 0, 0, 1
];

ImageProcessor.faded_matrix = [
  1, .2, .2, .03,
  .2, .7, .2, .05,
  .1, 0, .8, 0,
  0, 0, 0, 1
];
