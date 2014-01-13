'use strict';

// Build an object representing one page of a keyboard layout.
// The input layout is an array of strings, with each string representing
// one row of the keyboard.  The pagekeys and layoutkeys arguments are objects
// from which key definitions should be looked up.
function KeyboardPage(pagename, variant, layout, pagekeys, layoutkeys) {
  this.name = name;
  this.variant = variant;

  // An array of arrays of keynames
  this.rows = [];

  // Maps key names to key objects.
  this.keys = {};

  // Loop through the rows
  for (var r = 0; r < layout.length; r++) {
    var rowtext = layout[r];
    var row = [];
    this.rows.push(row);

    // Loop through the keys in the row
    var keynames = rowtext.trim().split(' ');
    for (var k = 0; k < keynames.length; k++) {
      var keyname = keynames[k];
      if (keyname in this.keys) {
        console.error('Keyboard layout includes more than one key named',
                      keyname);
        continue;
      }

      // Add the named key to the row
      row.push(keyname);

      // Store the key object for this keyname
      this.keys[keyname] = new Key(keyname, pagekeys, layoutkeys);
    }
  }

  // If any of the regular keys in the layout have alternates specified,
  // we need to create key objects for those. Loop carefully so we
  // don't run the loop over the alternatives. And don't create two objects
  // for a single key
  var regularKeyNames = Object.keys(this.keys);
  for (var i = 0; i < regularKeyNames.length; i++) {
    var keyname = regularKeyNames[i];
    var key = this.keys[keyname];
    if (!key.alternatives)
      continue;

    key.alternatives = key.alternatives.trim().split(' ');
    for (var a = 0; a < key.alternatives.length; a++) {
      var altKeyName = key.alternatives[a];
      // If there is already a regular key by this name, assume this is the same
      if (altKeyName in this.keys) {
        continue;
      }
      this.keys[altKeyName] = new Key(altKeyName, pagekeys, layoutkeys);
    }
  }
}
