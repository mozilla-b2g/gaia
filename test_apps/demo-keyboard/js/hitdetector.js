// This hit detector takes a keyboard layout page as input and defines a
// keyAt function that takes an x,y coordinate and returns the name of the
// key closest to that point.
//
// If given an optional list of character codes and their weights, it will
// weight the keys that generate those codes to make them easier to type.
// The algorithm uses a power diagram (see
// http://en.wikipedia.org/wiki/Power_diagram)


// Call this after the keyboard has been added to the document so that
// the keys have positions defined
function KeyboardHitDetector(page) {
  this.page = page;
  this.keydata = {};
  this.weights = {};
  this.initialized = false;
  this.keyCodeToName = {};  // map keycodes to key names for this page
}

// We defer initialization until the first keyAt request comes in because
// getBoundingClientRect() doesn't return valid value until the keyboard
// is actually displayed. If we init directly from the contructor, then
// it matters whether we create the hit detector before or after the
// keyboard layout is shown. By waiting until the first hit needs to be
// tested, we ensure that the keyboard is actually shown.
KeyboardHitDetector.prototype.init = function() {
  for (var keyname in this.page.keys) {
    var keyobj = this.page.keys[keyname];
    // Alternate keys that appear in the popup menu do not have elements
    // by default and are not handled by this hit detector
    if (!keyobj.element)
      continue;
    var rect = keyobj.element.getBoundingClientRect();
    this.keydata[keyname] = {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      cx: (rect.left + rect.right) / 2,
      cy: (rect.top + rect.bottom) / 2,
      static: keyobj.static || !keyobj.keycode
    };

    // If this key has a keycode, map the keycode back to the name
    if (keyobj.keycode) {
      this.keyCodeToName[keyobj.keycode] = keyname;
    }
  }
  this.initialized = true;
};

// Return the name of the key at (x,y). If that point is not inside any
// of the keys, return the key whose center is nearest to that point.
KeyboardHitDetector.prototype.keyAt = function keyAt(x, y) {
  var start = performance.now();
  if (!this.initialized) {
    this.init();
  }

  // A simple hit detection algorithm is to use elementFromPoint() or to
  // loop through the keys and find one that contains the point (x,y).
  // The problem with that is that if the user touches outside of any key
  // nothing happens.
  //
  // So a better approach is to loop through the keys and compute the distance
  // from the center of the key to the point (x,y), then select the key
  // with the smallest distance. We have to be careful about the spacebar
  // because the ends of the bar are actually closer to keys in the 3rd row
  // than they are to the center of the bar. So this approach can be combined
  // with the first so that points inside a key always hit that key.
  //
  // But if we can predict what characters the user is likely to type next
  // then we can anticipate the user's input and do hit detection with
  // that in mind to try to reduce typos. To do this, we assign a weight to
  // each key depending on how likely it is. Then, instead of computing the
  // distance to the key we compute the "power" for each key, which is
  // the distance minus the weight.  The key with the smallest power (unlike
  // distance the power can be negative) is the one we hit. Note that this
  // brings us back to a situation where the ends of the spacebar may register
  // as letters rather than a space.
  //
  // XXX: We may want to modify this algorithm so that certain keys do
  // not participate, and are always hit if we are inside of
  // them. Keys that don't send keycodes (like shift and backspace)
  // should proably be exempt from resizing. This could be based on the
  // keycmd or other properties of the key object. It is unclear if we should
  // apply this to the spacebar or not, but I tend to think we should.
  //
  // XXX: We can make the weight of the key dependent on the elapsed time
  // since the last keystroke. This means we do more aggressive anticipation
  // when the user is typing more quickly.
  //
  var nearestName, smallestPower = Infinity;
  for (var keyname in this.keydata) {
    var data = this.keydata[keyname];

    if (data.static) {
      // If this is a static key then we don't want it to be affected by
      // dynamic hit target resizing. We treat it as hit if a touch is
      // anywhere inside of it and return immediately without looking for
      // other possible hits. Note that we can still hit these static keys
      // from the outside if we are closer to them than any other keys.
      if (data.left <= x && x <= data.right &&
          data.top <= y && y <= data.bottom) {
        return keyname;
      }
    }

    var dx = x - data.cx;
    var dy = y - data.cy;
    var distance = dx * dx + dy * dy;
    var weight = this.weights[keyname] || 0;
    var power = distance - weight;
    if (power < smallestPower) {
      smallestPower = power;
      nearestName = keyname;
    }
  }
  return nearestName;
};

KeyboardHitDetector.prototype.setExpectedChars = function(chars) {
  // The input is an array with 2n elements. Each pair of elements
  // represents a keycode and a weight
  this.weights = {};

  // The raw weights from the prediction engine are word frequency numbers
  // between 1 and 32. We don't want to use them raw, but want to scale
  // them as a fraction of the largest weight. (So that if there is one
  // character with weight 20 and one with weight 10, they would be scaled
  // to 1 and 0.5.) We then multiply by a tuneable factor that specfies how
  // aggressive we are with prediction, and square the results since we
  // need a squared value in the hit detection algorithm
  var highestWeight = chars[1];

  for (var i = 0; i < chars.length; i += 2) {
    var keycode = chars[i];
    if (keycode === 0) // Keycode 0 means end of word
      keycode = 32;    // so expect a space character instead
    var weight = chars[i + 1];
    var keyname = this.keyCodeToName[keycode];
    if (!keyname)
      continue;
    weight = weight / highestWeight;
    weight = weight * KeyboardHitDetector.PREDICTION_STRENGTH;
    weight = weight * weight;
    this.weights[keyname] = weight;
  }

/*
  // Illustrate the weights of each key with an outline around the key
  // This is purely an illustration. The outlines around each key do not
  // actually display the Voronoi cells for each key
  for (var keyname in this.page.keys) {
    var keyobj = this.page.keys[keyname];
    var keyelt = keyobj.element;
    if (!keyelt)
      continue;
    var weight = this.weights[keyname];
    if (weight) {
      keyelt.style.boxShadow = '0 0 5px ' +
        0.5 * Math.sqrt(this.weights[keyname]) +
        'px gold';
    }
    else {
      keyelt.style.boxShadow = 'none';
    }
  }
*/
};

// This tuneable constant specifies how aggressive we are with our
// dynamic hit target resizing.
KeyboardHitDetector.PREDICTION_STRENGTH = 40;
