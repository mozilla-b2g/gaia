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
* { box-sizing: border-box; }

#container {
  display: block;
  position: relative; /* so that we can absolutely position content */
  width: 100%;
  height: 100%;
}

canvas {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
}

.mark {
  display: block;
  position: absolute;
  border: solid white 4px;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  margin-left: -20px;
  margin-top: -20px;
}

.mark:before {
  box-sizing: border-box;
  display: block;
  position: relative;
  border: solid black 1px;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  content: '';
  margin-left: -4px;
  margin-top: -4px;
}

#popup {
  display: none;
  position: absolute;
  width: 75px;
  height: 75px;
  border: solid white 6px;
  border-radius: 50%;
  border-bottom-right-radius: 5px;
  transform: translateY(-150%) translateX(-50%) rotate(45deg);
  box-shadow: 6px 2px 4px black;
}

#popup:before {
  box-sizing: border-box;
  display: block;
  border: solid black 1px;
  border-radius: 50%;
  border-bottom-right-radius: 5px;
  width: 75px;
  height: 75px;
  margin-left: -6px;
  margin-top: -6px;
  content: '';
}

</style>
<div id="container">
  <canvas id="hues"></canvas>
  <canvas id="values"></canvas>
  <div class="mark" id="huemark"></div>
  <div class="mark" id="valuemark"></div>
  <div id="popup"></div>
</div>
`;

  const R0 = 0.10;  // The inner radius of the hue/saturation ring
  const R1 = 0.70;  // The outer radius of the hue/saturation ring
  const R2 = 0.97;  // The outer radius of the value ring
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
    this.huecanvas = this.shadow.getElementById('hues');
    this.valcanvas = this.shadow.getElementById('values');
    this.huemark = this.shadow.getElementById('huemark');
    this.valuemark = this.shadow.getElementById('valuemark');
    this.popup = this.shadow.getElementById('popup');

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
    this.shadow.addEventListener('mousedown', this);
    this.shadow.addEventListener('touchstart', this);
    this.shadow.addEventListener('touchmove', this);
    this.shadow.addEventListener('touchend', this);

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
    this.huecanvas.width = 0;
    this.valcanvas.width = 0;
    this.huecontext = null;
    this.valuecontext = null;
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
    this.cx = this.width / 2;                 // center of the circle
    this.cy = this.height / 2;
    this.radius = Math.min(this.cx, this.cy);
    this.r0 = Math.round(R0 * this.radius);   // inner radius of hue ring
    this.r1 = Math.round(R1 * this.radius);   // outer radius of hue ring
    this.r2 = Math.round(R2 * this.radius);   // outer radius of value ring

    // If we are not in the document yet, or have 0 size, there is nothing
    // to do here.
    if (!this.attached || this.width === 0 || this.height === 0) {
      return;
    }

    // Set the canvas dimensions
    // XXX: note that it would be more efficient to force the canvases to
    // be square.  But then the layout would be tricker
    this.huecanvas.width = this.width;
    this.huecanvas.height = this.height;
    this.valcanvas.width = this.width;
    this.valcanvas.height = this.height;

    // Get the canvas contexts
    this.huectx = this.huecanvas.getContext('2d', {alpha: false});
    this.valctx = this.valcanvas.getContext('2d');

    // Do the pre-drawing
    this.drawHueSaturationPlane();
    this.drawValueGradient();

    // And do the regular drawing by calling updateState() to force a redraw
    // We do not generate a change event in this case
    this.updateState(this.h, this.s, this.v, false, true);
  };

  ColorPickerImpl.prototype.handleEvent = function(e) {
    var box = this.element.getBoundingClientRect();
    var x, y, hit;

    // Get the mouse or touch coordinates from the event, convert to
    // be relative to this element, and convert from CSS to device pixels
    if (e instanceof MouseEvent) {
      x = (e.clientX - box.left) * this.dpr;
      y = (e.clientY - box.top) * this.dpr;
    }
    else if (e instanceof TouchEvent) {
      var touch = e.changedTouches[0];
      x = (touch.clientX - box.left) * this.dpr;
      y = (touch.clientY - box.top) * this.dpr;
    }

    if (e.type === 'touchstart' || e.type === 'mousedown') {
      if (e.type === 'mousedown') {
        window.addEventListener('mousemove', this, true);
        window.addEventListener('mouseup', this, true);
      }

      hit = this.hit(x, y);
      if (hit === 'hue') {
        this.changeHueSaturation(x, y);
        this.dragging = 'hue';
        this.showPopup(x, y);
      }
      else if (hit === 'value') {
        this.changeValue(x, y);
        this.dragging = 'value';
        this.showPopup(x, y);
      }
    }
    else if (this.dragging &&
             (e.type === 'touchmove' || e.type === 'mousemove'))
    {
      hit = this.hit(x, y);
      if (hit === this.dragging) {
        if (hit === 'hue') {
          this.changeHueSaturation(x, y);
        }
        else if (hit === 'value') {
          this.changeValue(x, y);
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
    var hueChange = force || (h !== this.h) || (s !== this.s);
    var valueChange = force || (v !== this.v);

    if (!hueChange && !valueChange) {
      return;
    }

    this.h = h;
    this.s = s;
    this.v = v;
    [this.r, this.g, this.b] = hsv2rgb(h, s, v);
    this.hexColorString = rgb2hex(this.r, this.g, this.b);

    if (this.attached) {
      if (hueChange) {
        this.hueChanged = true;
      }
      if (valueChange) {
        this.valueChanged = true;
      }

      if (!this.redrawRequested) {
        this.redrawRequested = requestAnimationFrame(function() {
          this.setMarkColor();

          if (this.hueChanged) {
            this.updateHue();
          }

          if (this.valueChanged) {
            this.updateValue();
          }

          this.redrawRequested = null;
          this.hueChanged = false;
          this.valueChanged = false;

          // Don't send change events out any faster than 60 times a second
          // even if touch events are coming in faster than that.
          if (notify) {
            this.element.dispatchEvent(new Event('change'));
          }

        }.bind(this));
      }
    }
  };

  // Draw the value=1 plane of the HSV color cylinder into the hue canvas
  ColorPickerImpl.prototype.drawHueSaturationPlane = function() {
    var r0 = this.r0;
    var r1 = this.r1;
    var width = 2 * r1;
    var height = 2 * r1;

    // Precompute this value to make the inner loop as fast as possible
    var conversion = 1 / (r1 - r0);

    var imagedata = this.huectx.getImageData(this.cx - r1,
                                             this.cy - r1,
                                             width, height);
    var pixels = imagedata.data;

    for(var y = 0; y < height; y++) {
      var dy = y - r1;

      for(var x = 0; x < width; x++) {
        var dx = x - r1;
        var distance = Math.sqrt(dx*dx + dy*dy);

        // if this pixel is outside r1, do nothing
        if (distance >  r1) {
          continue;
        }

        var index = (y * width + x) * 4;

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

    this.huectx.putImageData(imagedata, this.cx - r1, this.cy - r1);
  };

  // Draw a gradient of transparent black colors into the value context
  // We do this by seting pixels directly in an ImageData so that we can
  // avoid thin lines and moire patterns that appear when we try to fill
  // individual wedges of color
  ColorPickerImpl.prototype.drawValueGradient = function() {
    var r1 = this.r1;
    var r2 = this.r2;
    var width = 2 * r2;
    var height = 2 * r2;

    var imagedata = this.valctx.getImageData(this.cx - r2,
                                             this.cy - r2,
                                             width, height);
    var pixels = imagedata.data;

    for(var y = 0; y < height; y++) {
      var dy = y - r2;
      var dy2 = dy * dy;

      for(var x = 0; x < width; x++) {
        var dx = x - r2;
        var distance = Math.sqrt(dx*dx + dy2);

        // If this pixel is outside r2 continue.
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

        // If we've moved inside the ring skip immediately to the next part
        if (distance < r1) {  // if inside the ring
          if (dx < 0) {       // and on the left side
            x = width - x;    // skip to the matching right side
          }
          continue;
        }

        // figure out the angle to (dx,dy) and convert to our value
        var angle = Math.atan2(dy, -dx) + HALFPI;
        if (angle < 0) {
          angle += TWOPI;
        }
        var value = angle/TWOPI;
        var opacity = Math.round((1 - value) * 255);

        var index = (y * width + x) * 4;
        pixels[index] = 0;
        pixels[index + 1] = 0;
        pixels[index + 2] = 0;
        pixels[index + 3] = opacity;
      }
    }

    this.valctx.putImageData(imagedata, this.cx - r2, this.cy - r2);

    // Draw an opaque gradient ring between the hues and values
    var radiansPerSegment = TWOPI / 256;
    var startAngle;
    var endAngle = 3 * HALFPI;
    // The inner half of this line will be overwritten by the solid
    // transparent circle we draw, so we draw it twice as wide as we need
    this.valctx.lineWidth = 3 * this.dpr;
    this.valctx.lineCap = 'square';

    for(var level = 255; level >= 0; level--) {
      startAngle = endAngle;
      endAngle = startAngle - radiansPerSegment;
      // And now draw another segment in a contrasting color to
      // separate the values from the hues. Note that these are
      // opaque colors and are all shades of gray.
      this.valctx.beginPath();
      this.valctx.arc(this.cx, this.cy, this.r1, startAngle, endAngle, true);
      this.valctx.strokeStyle = rgb2hex(level, level, level);
      if (level === 0) {
        this.valctx.lineCap = 'butt';
      }
      this.valctx.stroke();
    }

    // Finally draw an opaque black border around the entire circle. This is
    // needed because the solid ring of color we draw on the hue canvas is
    // antialiased, and the individual pixels we draw on the value canvas
    // are jaggy, so we end up with a tiny fringe of partially lit pixels
    // showing at the edge.
    this.valctx.beginPath();
    this.valctx.arc(this.cx, this.cy, this.r2, 0, TWOPI);
    this.valctx.strokeStyle = '#000';
    this.valctx.lineWidth = 2 * this.dpr;
    this.valctx.stroke();
  };

  // Return 'hue' if (x, y) is in the hue/saturation disk.
  // Return 'value' if (x, y) is in the value ring.
  // Otherwise return null.
  ColorPickerImpl.prototype.hit = function(x, y) {
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

  ColorPickerImpl.prototype.changeHueSaturation = function(x, y) {
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

  ColorPickerImpl.prototype.changeValue = function(x, y) {
    var dx = x - this.cx;
    var dy = y - this.cy;
    var angle = Math.atan2(-dy, dx) - HALFPI;
    if (angle < 0) {
      angle += TWOPI;
    }
    var value = angle / TWOPI;
    this.updateState(this.h, this.s, value);
  };

  ColorPickerImpl.prototype.updateValue = function() {
    // Move the marker that indicates the currently selected value
    var angle = this.v * TWOPI + HALFPI;

    var r = (this.r1 + this.r2)/2;
    var x = this.cx + r * Math.cos(angle);
    var y = this.cy - r * Math.sin(angle);
    this.valuemark.style.left = (x / this.dpr) + 'px';
    this.valuemark.style.top = (y / this.dpr) + 'px';
    this.popup.style.left = (x / this.dpr) + 'px';
    this.popup.style.top = (y / this.dpr) + 'px';

    // Draw a transparent black circle in the value canvas to alter the
    // apparent values of the colors in the hue canvas. We need to do a
    // copy operation so that the colors already in the canvas do not get
    // combined with the pixels we're drawing.
    //
    // XXX This code works correctly on the desktop but not in Firefox for
    // Android or on FirefoxOS, so until bug 1126055 is resolved, we're
    // just not going to alter the value of the central color disk.
    //
    // var opacity = 1 - this.v;
    // this.valctx.save();
    // this.valctx.beginPath();
    // this.valctx.arc(this.cx, this.cy, this.r1, 0, TWOPI, false);
    // this.valctx.clip();
    // this.valctx.globalCompositeOperation = 'copy';
    // this.valctx.fillStyle = 'rgba(0,0,0,' + opacity + ')';
    // this.valctx.fill();
    // this.valctx.restore();
  };

  ColorPickerImpl.prototype.updateHue = function() {
    // Compute the position of the hue marker and move it
    var x = this.cx, y = this.cy;

    if (this.s !== 0) {
      var d = this.r0 + this.s * (this.r1 - this.r0);
      var angle = this.h * RADIANS;

      x += d * Math.cos(angle);
      y -= d * Math.sin(angle);
    }
    this.huemark.style.left = (x / this.dpr) + 'px';
    this.huemark.style.top = (y / this.dpr) + 'px';
    this.popup.style.left = (x / this.dpr) + 'px';
    this.popup.style.top = (y / this.dpr) + 'px';

    // Draw a solid ring of the current hue/saturation at value=1 in the
    // hue canvas so that a gradient of the color appears through the 
    // pre-drawn gradient in the value canvas.
    this.huectx.beginPath();
    this.huectx.arc(this.cx, this.cy, this.r1, 0, TWOPI, true);
    this.huectx.arc(this.cx, this.cy, this.r2, 0, TWOPI, false);
    this.huectx.fillStyle = hsv2hex(this.h, this.s, 1);
    this.huectx.fill();
  };

  ColorPickerImpl.prototype.setMarkColor = function() {
    this.huemark.style.backgroundColor = this.hexColorString;
    this.valuemark.style.backgroundColor = this.hexColorString;
    this.popup.style.backgroundColor = this.hexColorString;
  };

  ColorPickerImpl.prototype.showPopup = function(x, y) {
    // Set the initial position of the popup and show it
    this.popup.style.left = x / this.dpr + 'px';
    this.popup.style.top = y / this.dpr + 'px';
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
