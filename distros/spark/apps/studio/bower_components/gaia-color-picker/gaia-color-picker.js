/**
 * This module defines a custom <gaia-color-picker> element and exports the
 * GaiaColorPicker() constructor as its only global symbol.
 *
 * EXAMPLE
 *
 *   <gaia-color-picker id="picker" value="#aabbcc"></gaia-color-picker>
 *   <script>
 *     var picker = document.getElementById('picker');
 *     picker.onchange = function() {
 *       console.log(picker.r, picker.g, picker.b, picker.value);
 *     };
 *   </script>
 *
 * ATTRIBUTES
 *
 * A <gaia-color-picker> element defines an HTML attribute named "value" that
 * can be use to query or set the currently selected color. The value of this
 * attribute is a standard CSS hexadecimal color specification in the form
 * #rgb or #rrggbb.
 *
 * PROPERTIES
 *
 * A <gaia-color-picker> element defines the following JavaScript properties:
 *
 * value: a read/write string property that reflects the "value" attribute.
 *
 * r: the red component of the current color. A read-only integer 0-255.
 *
 * g: the green component of the current color. A read-only integer 0-255.
 *
 * b: the red component of the current color. A read-only integer 0-255.
 *
 * h: the hue the current color. A read-only number 0 - 360.
 *
 * s: the saturation of the current color. A read-only number 0.0 - 1.0.
 *
 * v: the value of the current color. A read-only number 0.0 - 1.0.
 *
 * EVENTS
 *
 * When the user interacts with a <gaia-color-picker> component to select a
 * new color, the component emits a "change" event. There are no details in
 * the event object. The changed color is available through the properties
 * listed above.
 *
 * METHODS
 *
 * A <gaia-color-picker> element defines the following methods:
 *
 * resize(): call this function when the size of the component has changed
 * to tell it to resize its internal canvases and re-draw its color wheel.
 * You should call this on window.resize events and any time the document
 * layout changes in such a way that the component size changes. Note that
 * this recomputes all the pixels of hte hue/saturation color disk and is
 * a relatively expensive operation.
 *
 * STATIC FUNCTIONS
 *
 * This module defines color space conversion utility functions as
 * properties of the GaiaColorPicker constructor:
 *
 * GaiaColorPicker.rgb2hsv(red, green, blue): returns [hue, saturation, value]
 *
 * GaiaColorPicker.hsv2rgb(hue, saturation, value): returns [red, green, blue]
 *
 * GaiaColorPicker.rgb2hex(red, green, blue): returns hex color string "#rrggbb"
 *
 * GaiaColorPicker.hex2rgb("#rrggbb"): returns [red, green, blue]
 *
 * GaiaColorPicker.hsv2hex(hue, saturation, value): returns "#rrggbb"
 *
 * GaiaColorPicker.hex2hsv("#rrggbb"): returns [hue, saturation, value]
 */
(function(exports) {
  'use strict';
  /*jshint esnext:true*/

  var GaiaColorPicker = document.registerElement('gaia-color-picker', {
    prototype: Object.create(HTMLElement.prototype, {

      createdCallback: {
        value: function() { this._impl = new ColorPickerImpl(this); }
      },

      attachedCallback: {
        value: function() { this._impl.attach(); }
      },

      detachedCallback: {
        value: function() { this._impl.detach(); }
      },

      attributeChangedCallback: {
        value: function(name, oldval, newval) {
          // If the user deletes the attribute we will do nothing, since
          // there isn't really a reasonable default value to revert to.
          if (name === 'value' && newval !== null) {
            this.value = newval;
          }
        }
      },

      resize: {
        value: function() { this._impl.resize(); }
      },

      h: {
        get: function() { return this._impl.h; }
      },

      s: {
        get: function() { return this._impl.s; }
      },

      v: {
        get: function() { return this._impl.v; }
      },

      r: {
        get: function() { return this._impl.r; }
      },

      g: {
        get: function() { return this._impl.g; }
      },

      b: {
        get: function() { return this._impl.b; }
      },

      value: {
        get: function() { return this._impl.hexColorString; },
        set: function(newval) { this._impl.setHexColorString(newval); }
      }
    })
  });

  // Expose the utility functions through the constructor
  GaiaColorPicker.hsv2rgb = hsv2rgb;
  GaiaColorPicker.rgb2hsv = rgb2hsv;
  GaiaColorPicker.hsv2hex = hsv2hex;
  GaiaColorPicker.rgb2hex = rgb2hex;
  GaiaColorPicker.hex2rgb = hex2rgb;
  GaiaColorPicker.hex2hsv = hex2hsv;

  // Export the constructor
  exports.GaiaColorPicker = GaiaColorPicker;

  /*
   * Implementation details below
   */

  const TEMPLATE = `
<style>
* {
  box-sizing: border-box;
  -moz-user-select: none;
}

#container {
  display: block;
  position: relative; /* so that we can absolutely position content */
  width: 100%;
  height: 100%;
}

#canvas {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
}

.mark {
  display: block;
  position: absolute;
  border: solid white 2px;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  transform: translate(-50%, -50%);
}

#popup {
  display: none;
  position: absolute;
  width: 65px;
  height: 65px;
  border: solid white 3px;
  border-radius: 50%;
  border-bottom-right-radius: 3px;
  transform: translate(-50%, -150%) rotate(45deg);
  box-shadow: 2px 2px 5px rgba(0, 0, 0, .6);
  background-color: white;
}

.preview {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: solid #bbb 1px;
}

</style>
<div id="container">
  <canvas id="canvas"></canvas>
  <div class="mark" id="huemark"><div class="preview"></div></div>
  <div class="mark" id="valuemark"><div class="preview"></div></div>
  <div id="popup"><div class="preview" id="swatch"></div></div>
</div>
`;

  const R0 = 0.10;  // The inner radius of the hue/saturation ring
  const R1 = 0.70;  // The outer radius of the hue/saturation ring
  const R2 = 0.98;  // The outer radius of the value ring
  const DEGREES = 180/Math.PI;  // Convert radians to degrees
  const RADIANS = Math.PI/180;  // Convert degrees to radians
  const PI = Math.PI;
  const TWOPI = 2 * Math.PI;
  const HALFPI = Math.PI/2;

  function ColorPickerImpl(element) {
    // Lazily create the template the first time a color picker is created
    if (!ColorPickerImpl.template) {
      ColorPickerImpl.template = document.createElement('template');
      ColorPickerImpl.template.innerHTML = TEMPLATE;
    }

    // This is the <gaia-color-picker> element we are the implementation for
    this.element = element;

    // Create the elements we need in the shadow DOM
    this.shadow = element.createShadowRoot();
    this.shadow.appendChild(ColorPickerImpl.template.content.cloneNode(true));

    // Get references to the elements we'll need to manipulate
    this.canvas = this.shadow.getElementById('canvas');
    this.huemark = this.shadow.getElementById('huemark');
    this.valuemark = this.shadow.getElementById('valuemark');
    this.popup = this.shadow.getElementById('popup');
    this.swatch = this.shadow.getElementById('swatch');

    // And create the offscreen canvas element that we use for drawing
    this.offscreen = document.createElement('canvas');

    // Start off pure white
    this.h = 0;
    this.s = 0.0;
    this.v = 1.0;
    this.r = 255;
    this.g = 255;
    this.b = 255;
    this.hexColorString = '#ffffff';

    // But if there is a "value" attribute on the element, use that
    var initialValue = this.element.getAttribute('value');
    if (initialValue) {
      this.setHexColorString(initialValue);
    }

    // Register event handlers for user interaction
    this.shadow.addEventListener('touchstart', this);
    this.shadow.addEventListener('touchmove', this);
    this.shadow.addEventListener('touchend', this);
    this.shadow.addEventListener('mousedown', this);
    this.mouseEventHandlerRegistered = true;

    // If we're already in the document, do the rest now
    if (this.element.parentNode) {
      this.attach();
    }
    else {
      this.attached = false;
    }
  }

  ColorPickerImpl.prototype.attach = function() {
    this.attached = true;
    this.resize();
  };

  ColorPickerImpl.prototype.detach = function() {
    this.attached = false;
    this.canvas.width = 0;
    this.offscreen.width = 0;
    this.context = null;
    this.offctx = null;
  };

  ColorPickerImpl.prototype.resize = function() {
    //
    // When the color picker is first added to the document, or when we notice
    // that its size has changed, we resize the canvas elements and pre-draw
    // as much of the color wheel as we can.
    //
    // Drawing a color wheel is a fairly expensive operation and as the user
    // moves her finger across the component we'll have to redraw it quickly.
    // To optimize this, we use two canvas layers and pre-draw as much as
    // possible. On the bottom "hue layer" we draw only bright colors with
    // value 1.  On the top "value layer" we draw transparent black, with
    // opacity set to modify the apparent value of the colors below.
    //
    // In this function we will pre-draw the hue/saturation plane for value=1
    // on the hue layer. This is an expensive operation that involves setting
    // tens of thousands of individual pixels in an ImageData object. Then,
    // when the user interacts with the color picker to change the value to v,
    // we can change the apparent value of the entire hue/saturation plane by
    // drawing a single circle of transparent black with opacity (1 - v) in
    // the value plane. A single draw operation in the value plane will make
    // it look like we've changed the value of each individual pixel in the
    // hue/saturation wheel.
    //
    // Similarly, this function will also pre-draw the outer value ring of the
    // color wheel in the value layer. We will draw wedges of transparent black
    // with opacity ranging from 1 down to 0. Then, when the user interacts
    // with the color wheel and we need to display all possible values of a
    // given hue/saturation color, all we need to do is draw a solid ring of
    // that color in the hue plane, and because of the pre-drawn gradient in
    // the value plane, the user will see all possible values of that
    // hue/saturation combination.
    //
    // The upshot is that all the tricky and time-consuming drawing is done
    // here only when we resize the canvas. And updating the component visuals
    // when the user interacts with it is fast and nearly trivial.
    //

    // Compute our dimensions. Note that we want to use device pixels
    // not CSS pixels.
    this.dpr = window.devicePixelRatio;
    this.width = this.element.clientWidth * this.dpr;
    this.height = this.element.clientHeight * this.dpr;

    // Canvas dimension in device pixels: width and height are the same
    this.canvasSize = Math.min(this.width, this.height);
    this.radius = this.canvasSize / 2;
    this.r0 = Math.round(R0 * this.radius);   // inner radius of hue ring
    this.r1 = Math.round(R1 * this.radius);   // outer radius of hue ring
    this.r2 = Math.round(R2 * this.radius);   // outer radius of value ring

    // The center of the square canvas
    this.cx = this.radius;
    this.cy = this.radius;

    // Canvas screen size in CSS pixels
    this.canvasScreenSize = this.canvasSize / this.dpr;

    // Canvas screen position in CSS pixels
    this.canvasLeft = (this.element.clientWidth - this.canvasScreenSize) / 2;
    this.canvasTop = (this.element.clientHeight - this.canvasScreenSize) / 2;

    // If we are not in the document yet, or have 0 size, there is nothing
    // to do here.
    if (!this.attached || this.width === 0 || this.height === 0) {
      return;
    }

    // Set the onscreen and offscreen canvas dimensions
    this.canvas.width = this.canvas.height = this.canvasSize;
    this.offscreen.width = this.offscreen.height = this.canvasSize;

    // Set the onscreen canvas size and position.
    this.canvas.style.left = this.canvasLeft + 'px';
    this.canvas.style.top = this.canvasTop + 'px';
    this.canvas.style.width = this.canvasScreenSize + 'px';
    this.canvas.style.height = this.canvasScreenSize + 'px';

    // Get the canvas contexts.
    this.context = this.canvas.getContext('2d', { alpha: false });
    this.offctx = this.offscreen.getContext('2d');

    // Do the pre-drawing into the offscreen canvas
    this.predraw();

    // And do the regular drawing by calling updateState() to force a redraw
    // We do not generate a change event in this case
    this.updateState(this.h, this.s, this.v, false, true);
  };

  ColorPickerImpl.prototype.handleEvent = function(e) {
    var box = this.canvas.getBoundingClientRect();
    var x, y, hit;

    // Get the mouse or touch coordinates from the event, convert to
    // be relative to this element, and convert from CSS to device pixels
    if (e instanceof MouseEvent) {
      x = (e.clientX - box.left) * this.dpr;
      y = (e.clientY - box.top) * this.dpr;
    }
    else if (e instanceof TouchEvent) {
      // if we ever get a touch event stop listening for mouse events
      // we never want to receive both kinds.
      if (this.mouseEventHandlerRegistered) {
        this.shadow.removeEventListener('mousedown', this);
        this.mouseEventHandlerRegistered = false;
      }
      var touch = e.changedTouches[0];
      x = (touch.clientX - box.left) * this.dpr;
      y = (touch.clientY - box.top) * this.dpr;
    }

    if (e.type === 'touchstart' || e.type === 'mousedown') {
      if (e.type === 'mousedown') {
        window.addEventListener('mousemove', this, true);
        window.addEventListener('mouseup', this, true);
      }

      hit = this.hittest(x, y);
      if (hit === 'hue') {
        this.hitHueSaturation(x, y);
        this.dragging = 'hue';
      }
      else if (hit === 'value') {
        this.hitValue(x, y);
        this.dragging = 'value';
      }
      if (this.dragging) {
        this.movePopup();
        this.showPopup();
      }
    }
    else if (this.dragging &&
             (e.type === 'touchmove' || e.type === 'mousemove'))
    {
      hit = this.hittest(x, y);
      if (hit === this.dragging) {
        if (hit === 'hue') {
          this.hitHueSaturation(x, y);
        }
        else if (hit === 'value') {
          this.hitValue(x, y);
        }
      }
    }
    else if (e.type === 'touchend' || e.type === 'mouseup') {
      if (e.type === 'mouseup') {
        window.removeEventListener('mousemove', this, true);
        window.removeEventListener('mouseup', this, true);
      }
      this.dragging = null;
      this.hidePopup();
    }
  };

  ColorPickerImpl.prototype.setHexColorString = function(hexstring) {
    // If the hexstring is the same as the current value, do nothing.
    // This is important to prevent recursion since calling this function
    // sets the HTML attribute, and setting the HTML attribute calls
    // this function.
    if (hexstring === this.hexColorString) {
      return;
    }

    // Parse the new value
    var rgb = hex2rgb(hexstring);

    // Convert to hsv and update the color picker with the new color.
    // Don't emit a change event for this update, however, since this
    // is used for changes caused by JS code, not by the user.
    this.updateState(...rgb2hsv(...rgb), false);

    // Make sure this new hexstring is visible through the attribute, too.
    this.element.setAttribute('value', this.hexColorString);
  };

  ColorPickerImpl.prototype.updateState = function(h, s, v,
                                                   notify = true,
                                                   force = false)
  {
    var changed = force || (h !== this.h) || (s !== this.s) || (v !== this.v);

    if (!changed) {
      return;
    }

    this.h = h;
    this.s = s;
    this.v = v;
    [this.r, this.g, this.b] = hsv2rgb(h, s, v);
    this.hexColorString = rgb2hex(this.r, this.g, this.b);

    if (this.attached) {
      if (!this.redrawRequested) {
        this.redrawRequested = requestAnimationFrame(function(t) {
          this.redrawRequested = null;
          this.draw();
          this.setMarkColor();
          this.moveHueMark();
          this.moveValueMark();
          this.movePopup();

          // Don't send change events out any faster than once per frame
          // even if touch events are coming in faster than that.
          if (notify) {
            this.element.dispatchEvent(new Event('change'));
          }
        }.bind(this));
      }
    }
  };

  // Draw the unchanging parts of the color wheel into the offscreen canvas
  // The center of the wheel is the value=1 plane of the HSV color cylinder.
  // Outside of this center wheel is a gradient of transparent black colors.
  // Note that we only have to call predraw when the size of the canvas changes.
  ColorPickerImpl.prototype.predraw = function() {
    var r0 = this.r0;
    var r1 = this.r1;
    var r2 = this.r2;
    var width = 2 * r2;
    var height = 2 * r2;
    var conversion = 1 / (r1 - r0);  // Precompute for speed

    // Get the rectangle of the canvas inside r2
    var imagedata = this.offctx.getImageData(this.cx - r2,
                                             this.cy - r2,
                                             width, height);

    // And loop through all of the pixels in the rectangle
    var pixels = imagedata.data;
    for(var y = 0; y < height; y++) {
      var dy = y - r2;
      var dy2 = dy * dy;

      for(var x = 0; x < width; x++) {
        var dx = x - r2;
        var distance = Math.sqrt(dx*dx + dy2);

        // If this pixel is outside skip to the next one
        if (distance >  r2) {
          if (dx > 0) { // If we're on the right, we're done with this line
            break;
          }
          else {
            // Otherwise, skip ahead to the first pixel on the circle
            var newx = Math.ceil(r2 - Math.sqrt(r2*r2 - dy2))-1;
            // make sure we're not moving backwards and starting an
            // infinite loop
            if (newx > x) {
              x = newx;
            }
            continue;
          }
        }

        var index = (y * width + x) * 4;

        if (distance > r1) {
          // If we are between r1 and r2, set the pixel to the appropriate
          // transparent color to create a gradient for the value ring.
          // figure out the angle to (dx,dy) and convert to our value
          var angle = Math.atan2(dy, -dx) + HALFPI;
          if (angle < 0) {
            angle += TWOPI;
          }
          var value = angle/TWOPI;
          var opacity = Math.round((1 - value) * 255);

          pixels[index] = 0;
          pixels[index + 1] = 0;
          pixels[index + 2] = 0;
          pixels[index + 3] = opacity;
        }
        else {
          // If we are inside r1, set the pixel to the appropriate
          // hue/saturation.

          // If the pixel is inside r0, make it pure white
          if (distance < r0) {
            pixels[index] = 255;
            pixels[index+1] = 255;
            pixels[index+2] = 255;
            pixels[index+3] = 255;
          }
          else {
            // Convert dx, dy to polar (hue, saturation)
            var hue = Math.atan2(-dy, dx) * DEGREES;
            if (hue < 0) {
              hue += 360;
            }
            var saturation = (distance - r0) * conversion;

            // Convert that color to rgb
            var rgb = hsv2rgb(hue, saturation, 1.0);
            pixels[index] = rgb[0];
            pixels[index + 1] = rgb[1];
            pixels[index + 2] = rgb[2];
            pixels[index + 3] = 255; // Opaque
          }
        }
      }
    }

    // Copy the pixels back into the offscreen canvas for use by this.draw()
    this.offctx.putImageData(imagedata, this.cx - r2, this.cy - r2);
  };

  // Return 'hue' if (x, y) is in the hue/saturation disk.
  // Return 'value' if (x, y) is in the value ring.
  // Otherwise return null.
  ColorPickerImpl.prototype.hittest = function(x, y) {
    var dx = x - this.cy;
    var dy = y - this.cy;
    var d = Math.sqrt(dx * dx + dy * dy);
    if (d < this.r1) {
      return 'hue';
    }
    else if (d < this.r2) {
      return 'value';
    }
    return null;
  };

  ColorPickerImpl.prototype.hitHueSaturation = function(x, y) {
    var dx = x - this.cx;
    var dy = y - this.cy;
    var d = Math.sqrt(dx * dx + dy * dy);
    var hue, saturation;

    // user clicked on the hue/saturation disc
    if (d >= this.r0) {
      // User clicked on the colorful part of the ring
      hue = Math.atan2(-dy, dx) * DEGREES;
      if (hue < 0) {
        hue += 360;
      }
      saturation = (d - this.r0) / (this.r1 - this.r0);
    }
    else {
      // user clicked on the white circle in the middle
      hue = 0;
      saturation = 0;
    }

    this.updateState(hue, saturation, this.v);
  };

  ColorPickerImpl.prototype.hitValue = function(x, y) {
    var dx = x - this.cx;
    var dy = y - this.cy;
    var angle = Math.atan2(-dy, dx) - HALFPI;
    if (angle < 0) {
      angle += TWOPI;
    }
    var value = angle / TWOPI;
    this.updateState(this.h, this.s, value);
  };

  ColorPickerImpl.prototype.draw = function() {
    var opacity = 1 - this.v;
    var gray = Math.round(opacity * 255);

    // Fill the outer value ring with the current hue and saturation
    // at value = 1.
    this.context.beginPath();
    this.context.arc(this.cx, this.cy, this.r2, 0, TWOPI);
    this.context.fillStyle = hsv2hex(this.h, this.s, 1);
    this.context.fill();

    // Overlap it with the offscreen canvas
    this.context.drawImage(this.offscreen, 0, 0);

    // Now draw over the hue/saturation ring with a translucent color
    // to reduce the value to the appropriate level.
    this.context.beginPath();
    this.context.arc(this.cx, this.cy, this.r1, 0, TWOPI);
    this.context.fillStyle = 'rgba(0,0,0,' + opacity + ')';
    this.context.fill();

    // Set the border width
    this.context.lineWidth = 1 * this.dpr;

    // Draw an inner border with a color that contrasts with the current value
    this.context.strokeStyle = rgb2hex(gray, gray, gray);
    this.context.stroke();

    // Draw an outer border
    this.context.beginPath();
    this.context.arc(this.cx, this.cy, this.r2, 0, TWOPI);
    this.context.strokeStyle = '#000';
    this.context.stroke();
  };

  ColorPickerImpl.prototype.moveValueMark = function() {
    // Move the marker that indicates the currently selected value
    var angle = this.v * TWOPI + HALFPI;

    var r = (this.r1 + this.r2)/2;
    var x = this.cx + r * Math.cos(angle);
    var y = this.cy - r * Math.sin(angle);
    x = this.canvasLeft + x / this.dpr;
    y = this.canvasTop + y / this.dpr;
    this.valuemark.style.left = x + 'px';
    this.valuemark.style.top = y + 'px';
  };

  ColorPickerImpl.prototype.moveHueMark = function() {
    // Compute the position of the hue marker and move it
    var x = this.cx, y = this.cy;

    if (this.s !== 0) {
      var d = this.r0 + this.s * (this.r1 - this.r0);
      var angle = this.h * RADIANS;

      x += d * Math.cos(angle);
      y -= d * Math.sin(angle);
    }

    x = this.canvasLeft + x / this.dpr;
    y = this.canvasTop + y / this.dpr;

    this.huemark.style.left = x + 'px';
    this.huemark.style.top = y + 'px';
  };

  ColorPickerImpl.prototype.movePopup = function() {
    if (this.dragging == 'hue') {
      this.popup.style.left = this.huemark.style.left;
      this.popup.style.top = this.huemark.style.top;
    }
    if (this.dragging == 'value') {
      this.popup.style.left = this.valuemark.style.left;
      this.popup.style.top = this.valuemark.style.top;
    }
  };

  ColorPickerImpl.prototype.setMarkColor = function() {
    this.huemark.style.backgroundColor = this.hexColorString;
    this.valuemark.style.backgroundColor = this.hexColorString;
    this.swatch.style.backgroundColor = this.hexColorString;
  };

  ColorPickerImpl.prototype.showPopup = function() {
    this.popup.style.display = 'block';
  };

  ColorPickerImpl.prototype.hidePopup = function() {
    this.popup.style.display = 'none';
  };

  /*
   * Color conversion utilities
   */

  //
  // Convert a (r,g,b) color into (hue, saturation, value)
  //
  // See http://en.wikipedia.org/wiki/HSL_and_HSV for the details
  // of the conversion algorithm.
  //
  // Note that if r, g, and b are all multiplied by x (0 <= x <= 1)
  // the hue and saturation are unchanged in this algorithm and the value
  // is also multiplied by x. This means that if a color is overlaid with
  // a translucent black with opacity a, it is the same as reducing the
  // value of the color by a factor of (1-a), and that the hue and saturation
  // of the color are unchanged by the overlay. This fact is critical to the
  // way we render the color wheel for this color picker component.
  //
  function rgb2hsv(r, g, b) {
    r = r/255;
    g = g/255;
    b = b/255;

    var min = Math.min(r, g, b);
    var max = Math.max(r, g, b);
    var chroma = max - min;

    var hue, saturation, value;

    // Compute the hue
    if (chroma === 0) {
      hue = 0; // technically hue is undefined in this case
    }
    else {
      if (max === r) {
        hue = (g - b) / chroma;
        if (hue < 0) {
          hue += 6;
        }
      }
      else if (max === g) {
        hue = (b - r) / chroma + 2;
      }
      else { // max === b
        hue = (r - g) / chroma + 4;
      }
    }

    // convert hue to degrees from 0 to 360;
    hue *= 60;

    // Value and saturation are easy:
    value = max;
    saturation = (value === 0) ? 0 : chroma / value;

    return [hue, saturation, value];
  }

  // Convert a (hue, saturation, value) color to (r, g, b)
  function hsv2rgb(h, s, v) {
    var chroma = s * v;
    var hprime = h / 60;
    var x = chroma * (1 - Math.abs(hprime % 2 - 1));
    var r, g, b;

    switch(Math.floor(hprime)) {
      case 0:
      r = chroma;
      g = x;
      b = 0;
      break;
      case 1:
      r = x;
      g = chroma;
      b = 0;
      break;
      case 2:
      r = 0;
      g = chroma;
      b = x;
      break;
      case 3:
      r = 0;
      g = x;
      b = chroma;
      break;
      case 4:
      r = x;
      g = 0;
      b = chroma;
      break;
      case 5:
      r = chroma;
      g = 0;
      b = x;
      break;
      default:
      throw new Error();
    }

    var m = v - chroma;
    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return [r, g, b];
  }

  // Convert a (r, g, b) color triplet to "#rrggbb" hexadecimal form
  function rgb2hex(r, g, b) {
    r = r.toString(16);
    g = g.toString(16);
    b = b.toString(16);

    if (r.length === 1) {
      r = '0' + r;
    }
    if (g.length === 1) {
      g = '0' + g;
    }
    if (b.length === 1) {
      b = '0' + b;
    }

    return '#' + r + g + b;
  }

  // Convert a "#rrggbb" color string to a (r, g, b) triplet.
  function hex2rgb(hex) {
    if (!/^#[0-9a-fA-F]{3}$|^#[0-9a-fA-F]{6}$/.test(hex)) {
      throw new TypeError('Invalid color specification: "' + hex + '"');
    }

    var r, g, b;
    if (hex.length === 4) {
      r = hex[1] + hex[1];
      g = hex[2] + hex[2];
      b = hex[3] + hex[3];
    }
    else {
      r = hex.substring(1, 3);
      g = hex.substring(3, 5);
      b = hex.substring(5, 7);
    }

    return [parseInt(r, 16), parseInt(g, 16), parseInt(b, 16)];
  }

  // Convert a (hue, saturation, value) color to "#rrggbb" form.
  function hsv2hex(h, s, v) {
    return rgb2hex(...hsv2rgb(h, s, v));
  }

  // Convert a "#rrggbb" color string to a (hue, saturation, value) triplet
  function hex2hsv(hex) {
    return rgb2hsv(...hex2rgb(hex));
  }
}(window));
