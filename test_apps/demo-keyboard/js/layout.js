'use strict';

/*
 * A KeyboardLayout object represnts a single localization of the keyboard
 * app. In general each language will have its own KeyboardLayout object.
 * There may also be more than one layout for a given language. The Dvorak
 * layout and QWERTY layouts might both be used for English, for example.
 *
 * A KeyboardLayout may have more than one "page". The default page generally
 * displays letters and alternate pages may display numbers, punctuation,
 * symbols, etc.
 *
 * Each page has a default layout, but may also define variant layouts
 * that depend on the type attribute of the input field that the user is
 * entering text into. For example the "email" variant of a page layout
 * might include an @ character that is not present for normal type="text"
 * input.
 *
 * The layout of a page is specifed as an array of strings. Each
 * element of the array represents one row of the keyboard (from top to
 * bottom). Each string is a space-separated list of key names.
 *
 * Keys are defined separately from the page layouts. Each page of a
 * keyboard layout defines a mapping from key names to key objects.
 * A key object has these properties:
 *
 *   name: the name of the key
 *   keycap: the string of text displayed on the key
 *   keycmd: a string specifying the command sent by the key
 *
 * Depending on the command, a key may have other properties. The "sendkey"
 * command has an associated keycode property, for example, and the "switchpage"
 * command has a "page" property.
 *
 * The properties of a key object may be explicitly specified in the
 * KeyboardLayout configuration file, as part of the keys property of
 * the page or of the containing layout. If properties are not
 * specified, they are derived from the key name.  If no keycap is
 * specified, then the name is used as the key cap. If the name has a
 * single character and no keycmd is specified, then keycmd defaults to
 * "sendkey" and the name is used as the keycode.
 *
 * This class includes some page layouts and key definitions that may
 * be generally useful for a variety of locales.  If a configuration
 * file includes a string where a page definition object was
 * expected, the string will be used to look up a pre-defined page.
 * If a layout includes a keyname that is not defined elsewhere, it
 * will be looked up in the set of predefined keys. As a convention,
 * predefined pages and keys have names that are all uppercase.
 *
 * This module is supposed to be general enough that it can move
 * to shared/js/keyboard/layout.js for use by multiple keybaord apps.
 */
function KeyboardLayout(config) {
  var self = this;

  // This constructor is passed a data structure that contains all the
  // keyboard layout details. This data is generally read from a JSON file.
  // We copy and unpack this data into a KeyboardLayout object. Thus a
  // KeyboardLayout object has many of the same propeties as a KeyboardLayout
  // configuration file. The configuration file is optimized for human
  // readability and editability, and the KeyboardLayout object is the
  // expanded, optimized form used for implementing the keyboard.
  this.name = config.name;
  this.label = config.label;
  this.pages = {};
  this.pageViewCache = {};

  // For each page of this layout
  for (var pagename in config.pages) {
    var pageconfig = config.pages[pagename];  // Page configuration data

    // If the page configuration data is just the string 'inherit',
    // then it is a reference to a pre-defined page.
    if (pageconfig === 'inherit') {
      if (pagename in KeyboardLayout.predefinedPages) {
        pageconfig = KeyboardLayout.predefinedPages[pagename];
      }
      else {
        console.error('Skipping unknown page', pagename);
        continue;
      }
    }

    // This is the processed version of the page configuration data
    var pagedata = this.pages[pagename] = {};

    // Build the default page layout for this page
    pagedata.defaultLayout = new KeyboardPage(pagename, 'default',
                                              pageconfig.layout,
                                              pageconfig.keys, config.keys);

    // Build any variant page layouts for this page
    pagedata.variants = {};
    if (pageconfig.variants) {
      for (var variant in pageconfig.variants) {
        pagedata.variants[variant] =
          new KeyboardPage(pagename, variant,
                           pageconfig.variants[variant],
                           pageconfig.keys, config.keys);

      }
    }
  }
}

// Get a PageView object for the specified page name and variant.  If
// no pagename is specified, the first page specified in the layout is
// used as the default. If the specified variant does not exist for
// the named page (or if no variant is specified) then the default
// layout for the page is used. PageView objects are built when they
// are first requested and are then cached for later reuse.
KeyboardLayout.prototype.getPageView = function(container, pagename, variant) {
  if (!pagename)
    pagename = Object.keys(this.pages)[0];

  if (!(pagename in this.pages)) {
    throw Error('unknown page: ', pagename);
  }

  var cachekey = pagename;
  var page = this.pages[pagename].defaultLayout;

  if (variant && (variant in this.pages[pagename].variants)) {
    cachekey += ' ' + variant;
    page = this.pages[pagename].variants[variant];
  }

  var pageview = this.pageViewCache[cachekey];

  if (!pageview) {
    pageview = new KeyboardPageView(page);
    this.pageViewCache[cachekey] = pageview;
    pageview.resize();
    container.appendChild(pageview.element);
  }
  else {
    // Resize in case the orientation has changed since we were last displayed.
    // If the page view is already the right size this call is a no-op.
    pageview.resize();
  }

  return pageview;
};

// Invoke the function f on each page view object
KeyboardLayout.prototype.forEachPageView = function forEachPageView(f) {
  for (var key in this.pageViewCache) {
    f(this.pageViewCache[key]);
  }
};

KeyboardLayout.predefinedPages = {
  NUMBERS: {
    layout: [
      '1 2 3 4 5 6 7 8 9 0',
      '@ # $ % & * - + ( )',
      'ALT ! " \' : ; / ? BACKSPACE',
      'ABC SWITCH SPACE RETURN'
    ],
    keys: {
      ALT: {
        keycmd: 'page',
        page: 'SYMBOLS',
        size: 1.5,
        classes: ['specialkey']
      }
    }
  },
  SYMBOLS: {
    layout: [
      '` ~ _ ^ ± | [ ] { }',
      '° ² ³ © ® § < > « »',
      'ALT ¥ € £ $ ¢ \\ = BACKSPACE',
      'ABC SWITCH SPACE RETURN'
    ],
    keys: {
      ALT: {
        keycmd: 'page',
        page: 'NUMBERS',
        size: 1.5,
        classes: ['specialkey']
      }
    }
  }
};

KeyboardLayout.predefinedKeys = {
  SPACE: {
    keycmd: 'sendkey',
    keycap: '\u00A0',  // non-breaking space
    size: 0,
    keycode: 32,
    static: true,
    classes: ['specialkey']
  },
  RETURN: {
    keycmd: 'sendkey',
    keycap: '↵',
    keycode: 13,
    static: true,
    size: 2,
    classes: ['symbolfont', 'specialkey'],
    omitkeyrole: true  // Don't use role=key for this
  },

  BACKSPACE: {
    keycmd: 'backspace',
    keycap: '⌫',
    keycode: 8,
    autorepeat: true,
    static: true,
    size: 0,
    classes: ['symbolfont', 'specialkey'],
    omitkeyrole: true  // Don't use role=key for this
  },

  SHIFT: {
    keycmd: 'shift',
    keycap: '⇪',
    size: 0,
    classes: ['symbolfont', 'specialkey']
  },

  '?123': {
    keycmd: 'page',
    page: 'NUMBERS',
    size: 1.5,
    classes: ['specialkey']
  },
  'ABC': {
    keycmd: 'defaultPage',
    size: 1.5,
    classes: ['specialkey']
  },

  SWITCH: {
    keycmd: 'switch',
    keycap: '\uD83C\uDF10',  // Unicode U+1F310 'GLOBE WITH MERIDIANS'
    size: 1.5,
    classes: ['symbolfont', 'specialkey']
  }
};
