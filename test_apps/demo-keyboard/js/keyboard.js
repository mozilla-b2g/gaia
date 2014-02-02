'use strict';

var inputContext = null;
var layout;
var variant;
var keyboardContainer;
var currentPage;
var currentPageView;
var mainpageName;

var pages = {};
var pageviews = {};

window.addEventListener('load', init);

function init() {
  keyboardContainer = document.getElementById('keyboardContainer');

  layout = new KeyboardLayout(englishLayout);

  // Start off with the main page
  variant = getVariant();
  currentPageView = layout.getPageView(keyboardContainer, null, variant);
  currentPage = currentPageView.page;

  // Make it visible
  currentPageView.show();

  // The call to resizeWindow triggers the system app to actually display
  // the frame that holds the keyboard.
  resizeWindow();

  // Handle events
  KeyboardTouchHandler.setPageView(currentPageView);
  KeyboardTouchHandler.addEventListener('key', handleKey);

  // Prevent losing focus to the currently focused app
  // Otherwise, right after mousedown event, the app will receive a focus event.
  keyboardContainer.addEventListener('mousedown', function onMouseDown(evt) {
    evt.preventDefault();
  });

  window.addEventListener('resize', resizeWindow);

  window.navigator.mozInputMethod.oninputcontextchange = function() {
    inputContext = navigator.mozInputMethod.inputcontext;
    resizeWindow();
  };


  // If the variant changes, update the page view if needed
  InputField.addEventListener('inputfieldchanged', function(e) {
    var newvariant = getVariant();
    if (newvariant === variant)
      return;

    console.log('variant changed to', newvariant);

    variant = newvariant;
    var newPageView = layout.getPageView(keyboardContainer,
                                         currentPage.name, variant);
    if (newPageView === currentPageView)
      return;

    console.log('pageview changed to',
                newPageView.page.name, newPageView.page.variant);
    currentPageView.hide();
    currentPageView = newPageView;
    currentPage = currentPageView.page;
    currentPageView.show();
    KeyboardTouchHandler.setPageView(currentPageView);
  });
}

function getVariant() {
  var variant;

  // figure out what layout variant we're using
  // XXX: match the old keyboard behavior
  switch (InputField.inputType) {
  case 'email':
    variant = 'email';
    break;
  case 'url':
    variant = 'url';
    break;
  default:
    variant = null;
  }
  console.log('getVariant', variant);
  return variant;
}

function handleKey(e) {
  var keyname = e.detail;

  if (!keyname)
    return;
  var key = currentPage.keys[keyname];
  if (!key)
    return;

  switch (key.keycmd) {
  case 'sendkey':
    if (currentPageView.shifted) {
      sendKey(String.fromCharCode(key.keycode).toUpperCase().charCodeAt(0));
    }
    else {
      sendKey(key.keycode);
    }
    break;

  case 'backspace':
    sendKey(8);
    break;

  case 'switch':
    navigator.mozInputMethod.mgmt.next();
    break;
  case 'page':
    switchPage(key.page);
    break;
  case 'defaultPage':
    switchPage(mainpageName);
    break;
  default:
    console.error('Unknown keycmd', key.keycmd);
    break;
  }
}

function switchPage(pagename) {
  var oldPageView = currentPageView;
  currentPageView = layout.getPageView(keyboardContainer,
                                       pagename, variant);
  currentPage = currentPageView.page;
  oldPageView.hide();
  currentPageView.show();
  KeyboardTouchHandler.setPageView(currentPageView);
}

function sendKey(keycode) {
  switch (keycode) {
  case KeyEvent.DOM_VK_BACK_SPACE:
  case KeyEvent.DOM_VK_RETURN:
    InputField.sendKey(keycode, 0, 0);
    break;

  default:
    var start = performance.now();
    InputField.sendKey(0, keycode, 0);
    break;
  }
}

// XXX:
// The KeyboardLayout object could register this handler and do the resizing
function resizeWindow() {
  window.resizeTo(window.innerWidth, keyboardContainer.clientHeight);

  // We only resize the currently displayed page view. Other page views
  // are resized as needed when they're retrieved from the cache.
  currentPageView.resize();
}

var englishLayout = {
  name: 'english',
  label: 'English',
  pages: {
    main: {
      layout: [
        'q w e r t y u i o p',
        'a s d f g h j k l',
        'SHIFT z x c v b n m BACKSPACE',
        '?123 SWITCH SPACE . RETURN'
      ],
      variants: {
        email: [
          'q w e r t y u i o p',
          'a s d f g h j k l _',
          'SHIFT z x c v b n m BACKSPACE',
          '?123 SWITCH @ SPACE . RETURN'
        ],
        url: [
          'q w e r t y u i o p',
          'a s d f g h j k l :',
          'SHIFT z x c v b n m BACKSPACE',
          '?123 SWITCH SPACE . RETURN'
        ]
      }
    },
    NUMBERS: 'inherit',  // Use the built-in number and symbol pages
    SYMBOLS: 'inherit'
  },

  keys: {
    '.': {
      alternatives: ', ? ! ; :'
    },
    q: { alternatives: '1' },
    w: { alternatives: '2' },
    e: { alternatives: '3 é è' },
    r: { alternatives: '4' },
    t: { alternatives: '5' },
    y: { alternatives: '6' },
    u: { alternatives: '7' },
    i: { alternatives: '8' },
    o: { alternatives: '9' },
    p: { alternatives: '0' }
  }
};
