// Build an object representing one page of a keyboard layout.
// The input layout is an array of strings, with each string representing
// one row of the keyboard.  The pagekeys and layoutkeys arguments are objects
// from which key definitions should be looked up.
function KeyboardPage(layout, pagekeys, layoutkeys) {

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

  // Look up the HTML templates we'll use for building the keyboard page
  this.templates = {
    page: document.getElementById('keyboard-page-template'),
    row: document.getElementById('keyboard-row-template'),
    key: document.getElementById('keyboard-key-template'),
    altmenu: document.getElementById('keyboard-altmenu-template'),
    altkey: document.getElementById('keyboard-altkey-template')
  };
  for(var templatename in this.templates) {
    if (!this.templates[templatename])
      console.error('Cannot find required template element with id',
                    'keyboard-', templatename, '-template');
  }

  // Now that we have the key objects created and the layout parsed
  // we can build an HTML representation of the keyboard
  this.element = this.templates.page.content.cloneNode(true).firstElementChild;
  this.element.hidden = true;

  var self = this;
  this.rows.forEach(function buildRow(keynames) {
    var rowelt = self.templates.row.content.cloneNode(true).firstElementChild;
    keynames.forEach(function buildKey(keyname) {
      var keyobj = self.keys[keyname];
      var keyelt = self.templates.key.content.cloneNode(true).firstElementChild;
      keyelt.dataset.name = keyname;
      // We set the keycap as a data attribute so that we can use
      // it with content: attr(data-keycap) in the stylesheet
      keyelt.dataset.keycap = keyobj.keycap;

      // If the key has associated classses, set them.
      if (keyobj.classes) {
        keyobj.classes.forEach(function(c) { keyelt.classList.add(c); });
      }

      // The 'key' role tells an assistive technology that these buttons
      // are used for composing text or numbers, and should be easier to
      // activate than usual buttons. We only want this role for "normal"
      // keys, so we omit it if the key does not have a keycode (or if
      // the keycode is return or backspace)
      var keycode = keyobj.keycode;
      if (keycode && keycode !== 8 && keycode !== 13)
        keyelt.setAttribute('role', 'key');

      // We set the keycap as the text content of the innermost nested
      // element within the key element.
      var innermost = keyelt;
      while(innermost.firstElementChild)
        innermost = innermost.firstElementChild;
      innermost.textContent = keyobj.keycap;

      // Add the key to the row
      rowelt.appendChild(keyelt);

      // Remember the element for this key
      keyobj.element = keyelt;
    });
    // Add the row to the keyboard
    self.element.appendChild(rowelt);
  });

  // Create an element to hold the row of alternatives
  this.alternativesMenu =
    this.templates.altmenu.content.cloneNode(true).firstElementChild;
  this.element.appendChild(this.alternativesMenu);
  this.alternativesMenu.hidden = true;
}

// Compute the sizes of all the keys
// XXX: this might be easier if we we used CSS flex boxes for layout
KeyboardPage.prototype.setKeySizes = function setKeySizes() {
  // Compute the widths (in # of keys) for each row
  var self = this;
  var rowWidths = this.rows.map(function(row) {
    var size = 0;
    row.forEach(function(keyname) {
      var key = self.keys[keyname];
      // Keys with a non-zero explicit size use that size.
      // Keys with no specified size, or a size of 0 (flex) count as 1.
      size += key.size || 1;
    });
    return size;
  });

  // This is how wide the biggest row will be
  var maxRowWidth = Math.max.apply(Math, rowWidths);

  // A key with size 1 will be this many pixels wide
  var unitWidth = window.innerWidth / maxRowWidth;

  // Now loop through the rows and set the key sizes in each row
  for (var i = 0; i < this.rows.length; i++) {
    layoutRow(this.rows[i], rowWidths[i], maxRowWidth);
  }

  function layoutRow(row, rowWidth, maxWidth) {
    // If any items in this row have a size of 0 then they are
    // flexible and they share any extra space we have in the row.
    // The spacebar is the primary flexible key because it needs to
    // change size depending on how many special keys are inserted near it.
    var numFlexKeys = 0;
    row.forEach(function(keyname) {
      if (self.keys[keyname].size === 0)
        numFlexKeys += 1;
    });

    var flexKeySize = 0;
    if (numFlexKeys > 0)
      flexKeySize = 1 + (maxWidth - rowWidth) / numFlexKeys;

    // Now loop again, and set the size of each key
    row.forEach(function(keyname) {
      var key = self.keys[keyname];
      var size;
      if (key.size === 0)
        size = flexKeySize;
      else
        size = key.size || 1;

      var width = size * unitWidth - KeyboardPage.MARGIN;
      key.element.style.width = width + 'px';
    });
  }
};

// XXX
// It would be nice to be able to get rid of this.
// As it stands, this must be set to match the CSS.
KeyboardPage.MARGIN = 2;

KeyboardPage.prototype.highlight = function highlight(keyname) {
  this.keys[keyname].element.classList.add('touched');
};

KeyboardPage.prototype.unhighlight = function unhighlight(keyname) {
  this.keys[keyname].element.classList.remove('touched');
};

KeyboardPage.prototype.showAlternatives = function showAlternatives(keyname) {
  var self = this;
  var key = self.keys[keyname];
  if (!key) {
    console.error('unknown key name', keyname);
    return;
  }
  if (!key.alternatives) {
    console.error(keyname, 'has no alternatives');
    return;
  }

  // Populate the element with the alternatives
  key.alternatives.forEach(function(altkeyname) {
    var altkey = self.keys[altkeyname];
    if (!altkey) {
      console.error('unknown alt key', altkeyname);
      return;
    }

    var altelt =
      self.templates.altkey.content.cloneNode(true).firstElementChild;
    altelt.dataset.name = altkey.name;
    altelt.dataset.keycap = altkey.keycap;

    var innermost = altelt;
    while(innermost.firstElementChild)
      innermost = innermost.firstElementChild;
    innermost.textContent = altkey.keycap;
    self.alternativesMenu.appendChild(altelt);
  });

  // Now set the position of the alternatives row
  var altrow = this.alternativesMenu;
  var keypos = key.element.getBoundingClientRect();
  var keyOnLeft = ((keypos.left + keypos.right) < window.innerWidth);
  altrow.style.bottom = (window.innerHeight - keypos.bottom) + 'px';
  if (keyOnLeft) { // key is on left so alternatives run to the right
    altrow.style.left = keypos.left + 'px';
    altrow.style.right = 'auto';
  }
  else {           // key is on right so alternatives run to the left
    altrow.style.left = 'auto';
    altrow.style.right = (window.innerWidth - keypos.right) + 'px';
  }

  // If the alternatives run to the left, set the dir attribute
  altrow.dir = keyOnLeft ? 'ltr' : 'rtl';

  // The first alternative should always be at least as wide as the
  // key that it is an alternative for.
  altrow.firstElementChild.style.minWidth = (keypos.right - keypos.left) + 'px';

  // And make it visible
  key.element.classList.add('altshown');
  altrow.hidden = false;
};

KeyboardPage.prototype.hideAlternatives = function hideAlternatives(keyname) {
  this.alternativesMenu.hidden = true;
  this.alternativesMenu.textContent = '';
  this.keys[keyname].element.classList.remove('altshown');
};
