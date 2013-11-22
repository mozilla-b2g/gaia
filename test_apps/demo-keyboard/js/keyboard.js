'use strict';

var inputContext = null;
var layout;
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

  // Initialize KeyboardPageView objects for all of the layout pages
  // XXX: this ignores variants like email and url
  for (var pagename in layout.pages) {
    var page = layout.pages[pagename].defaultLayout;
    pages[pagename] = page;
    var pageview = new KeyboardPageView(page);
    pageviews[pagename] = pageview;
    pageview.resize();
    keyboardContainer.appendChild(pageview.element);

    // The first named page is the default one for the layout
    if (!mainpageName) {
      mainpageName = pagename;
    }
  }

  // Start off with the main page
  currentPage = pages[mainpageName];
  currentPageView = pageviews[mainpageName];
  currentPageView.show();

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
  if (!(pagename in layout.pages)) {
    console.log('unknown layout', pagename);
    return;
  }
  currentPageView.hide();
  // XXX: modify this to handle page layout variants
  currentPage = pages[pagename];
  currentPageView = pageviews[pagename];
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

function resizeWindow() {
  window.resizeTo(window.innerWidth, keyboardContainer.clientHeight);

  for (var pagename in pageviews) {
    // XXX: modify this to handle page layout variants
    // XXX: PageView object now, and method is layout()
    pageviews[pagename].resize();
  }
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
