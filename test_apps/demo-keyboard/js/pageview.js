(function(exports) {
  'use strict';

  // This is the margin between keys.
  // It must match the CSS file, which makes it brittle
  // XXX: get rid of it somehow
  const MARGIN = 2;

  // Look up the HTML templates we'll use for building the keyboard page
  var templates = {
    page: document.getElementById('keyboard-page-template'),
    row: document.getElementById('keyboard-row-template'),
    key: document.getElementById('keyboard-key-template'),
    altmenu: document.getElementById('keyboard-altmenu-template'),
    altkey: document.getElementById('keyboard-altkey-template')
  };

  // Make sure we found all the templates
  Object.keys(templates).forEach(function(templatename) {
    if (!templates[templatename])
      console.error('Cannot find required template element with id',
                    'keyboard-', templatename, '-template');
  });

  function KeyboardPageView(page) {
    this.page = page;             // Our KeyboardPage model
    this.element = null;          // The toplevel HTML element for this view
    this.alternativesMenu = null; // Alternatives menu element
    this.keyelts = {};            // Key name->element map
    this.keyrects = {};           // Key name->bounding box map

    // Create an HTML rendering of a KeyboardPage data structure
    this.element = templates.page.content.cloneNode(true).firstElementChild;

    for (var r = 0; r < page.rows.length; r++) {
      var row = page.rows[r];
      var rowelt = templates.row.content.cloneNode(true).firstElementChild;

      for (var k = 0; k < row.length; k++) {
        var keyname = row[k];
        var keyobj = page.keys[keyname];
        var keyelt = templates.key.content.cloneNode(true).firstElementChild;
        // Map the key name to the HTML element for the key
        this.keyelts[keyname] = keyelt;

        // Initialize the key element attributes
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
        // activate than usual buttons. We set it on all keys except for
        // those with the "omitkeyrole" property (which should be set on
        // keys like Return and Backspace that should be a little harder
        // to activate).
        if (!keyobj.omitkeyrole)
          keyelt.setAttribute('role', 'key');

        // We set the keycap as the text content of the innermost nested
        // element within the key element.
        var innermost = keyelt;
        while (innermost.firstElementChild)
          innermost = innermost.firstElementChild;
        innermost.textContent = keyobj.keycap;

        // Add the key to the row
        rowelt.appendChild(keyelt);
      }

      // Add the row to the pageview
      this.element.appendChild(rowelt);
    }

    // Create an element to hold the row of alternatives
    this.alternativesMenu =
      templates.altmenu.content.cloneNode(true).firstElementChild;
    this.element.appendChild(this.alternativesMenu);
    this.alternativesMenu.hidden = true;
  }

  // Compute the sizes of all the keys and lay them out
  KeyboardPageView.prototype.resize = function resize() {
    var page = this.page;
    var view = this;

    // Discard any cached information we have about the bounding boxes
    // of the keys
    this.keyrects = {};

    // Compute the widths (in # of keys) for each row
    var rowWidths = page.rows.map(function(row) {
      var size = 0;
      row.forEach(function(keyname) {
        var key = page.keys[keyname];
        // Keys with a non-zero explicit size use that size.
        // Keys with no specified size, or a size of 0 (flex) count as 1.
        size += key.size || 1;
      });
      return size;
    });

    // This is how wide the biggest row will be
    var maxRowWidth = Math.max.apply(Math, rowWidths);

    // A key with size 1 will be this many pixels wide (including margins)
    var unitWidth = window.innerWidth / maxRowWidth;

    // Now loop through the rows and set the key sizes in each row
    for (var i = 0; i < page.rows.length; i++) {
      layoutRow(page.rows[i], rowWidths[i], maxRowWidth);
    }

    function layoutRow(row, rowWidth, maxWidth) {
      // If any items in this row have a size of 0 then they are
      // flexible and they share any extra space we have in the row.
      // The spacebar is the primary flexible key because it needs to
      // change size depending on how many special keys are inserted near it.
      var numFlexKeys = 0;
      row.forEach(function(keyname) {
        if (page.keys[keyname].size === 0)
          numFlexKeys += 1;
      });

      var flexKeySize = 0;
      if (numFlexKeys > 0)
        flexKeySize = 1 + (maxWidth - rowWidth) / numFlexKeys;

      // Now loop again, and set the size of each key
      row.forEach(function(keyname) {
        var key = page.keys[keyname];
        var size;
        if (key.size === 0)
          size = flexKeySize;
        else
          size = key.size || 1;

        var width = size * unitWidth - MARGIN;
        view.keyelts[keyname].style.width = width + 'px';
      });
    }
  };

  // Return the current layout rectangle for the named key.
  // We can't compute this when we first render the page because
  // layout hasn't happened yet at that point. So we compute them
  // on demand.
  KeyboardPageView.prototype.getKeyRect = function getKeyRect(keyname) {
    var rect = this.keyrects[keyname];
    if (!rect) {
      var keyelt = this.keyelts[keyname];
      if (!keyelt)
        throw Error('unknown key: ' + keyname);

      rect = keyelt.getBoundingClientRect();
      if (rect.width === 0)
        throw Error('KeyboardPageView is not laid out yet: ' + keyname);

      // In addition to the basic rectangle, the hit detector in
      // KeyboardTouchHandler also wants some additional data. We
      // could compute this separately in the hit detector, but for
      // efficiency we store it here.
      rect.cx = (rect.left + rect.right) / 2;
      rect.cy = (rect.top + rect.bottom) / 2;
      var keyobj = this.page.keys[keyname];
      rect.static = keyobj.static || !keyobj.keycode;

      // Remember this key rectangle for next time
      this.keyrects[keyname] = rect;
    }

    return rect;
  };

  KeyboardPageView.prototype.highlight = function highlight(keyname) {
    this.keyelts[keyname].classList.add('touched');
  };

  KeyboardPageView.prototype.unhighlight = function unhighlight(keyname) {
    this.keyelts[keyname].classList.remove('touched');
  };

  KeyboardPageView.prototype.showAlternatives = function(keyname) {
    var page = this.page;
    var key = page.keys[keyname];
    var keyelt = this.keyelts[keyname];

    if (!key) {
      console.error('unknown key name', keyname);
      return;
    }
    if (!key.alternatives) {
      console.error(keyname, 'has no alternatives');
      return;
    }

    // Populate the element with the alternatives
    for (var i = 0; i < key.alternatives.length; i++) {
      var altkeyname = key.alternatives[i];
      var altkey = page.keys[altkeyname];
      if (!altkey) {
        console.error('unknown alt key', altkeyname);
        continue;
      }

      var altelt =
        templates.altkey.content.cloneNode(true).firstElementChild;
      altelt.dataset.name = altkey.name;
      altelt.dataset.keycap = altkey.keycap;

      var innermost = altelt;
      while (innermost.firstElementChild)
        innermost = innermost.firstElementChild;
      innermost.textContent = altkey.keycap;
      this.alternativesMenu.appendChild(altelt);
    }

    // Now set the position of the alternatives row
    var altrow = this.alternativesMenu;
    var keyrect = this.getKeyRect(keyname);
    var keyOnLeft = ((keyrect.left + keyrect.right) < window.innerWidth);
    altrow.style.bottom = (window.innerHeight - keyrect.bottom) + 'px';
    if (keyOnLeft) { // key is on left so alternatives run to the right
      altrow.style.left = keyrect.left + 'px';
      altrow.style.right = 'auto';
      altrow.dir = 'ltr';  // left to right
    }
    else {           // key is on right so alternatives run to the left
      altrow.style.left = 'auto';
      altrow.style.right = (window.innerWidth - keyrect.right) + 'px';
      altrow.dir = 'rtl';  // right to left
    }

    // The first alternative should always be at least as wide as the
    // key that it is an alternative for.
    altrow.firstElementChild.style.minWidth =
      (keyrect.right - keyrect.left) + 'px';

    // And make it visible
    keyelt.classList.add('altshown');
    altrow.hidden = false;
  };

  KeyboardPageView.prototype.hideAlternatives = function(keyname) {
    this.alternativesMenu.hidden = true;
    this.alternativesMenu.textContent = '';
    this.keyelts[keyname].classList.remove('altshown');
  };

  KeyboardPageView.prototype.hide = function() {
    this.element.classList.add('hidden');
  };

  KeyboardPageView.prototype.show = function() {
    this.element.classList.remove('hidden');
  };

  KeyboardPageView.prototype.setShiftState = function(shifted, locked) {
    this.shifted = shifted;
    this.locked = locked;

    if (locked) {
      this.element.classList.add('shifted');
      this.element.classList.add('locked');
    }
    else if (shifted) {
      this.element.classList.add('shifted');
      this.element.classList.remove('locked');
    }
    else {
      this.element.classList.remove('shifted');
      this.element.classList.remove('locked');
    }
  };

  exports.KeyboardPageView = KeyboardPageView;
}(window));

