var inputContext = null;
var layout;
var keyboardContainer;
var keyboardController;
var currentPage;
var mainpage;
var mainpageName;
var shifted = false;

// worker for predicting the next char 
var worker;
var predictionStartTime;

window.addEventListener('load', init);

function init() {
  keyboardContainer = document.getElementById('keyboardContainer');

  layout = new KeyboardLayout(englishLayout);
  for (var pagename in layout.pages) {
    // XXX: modify this to handle page layout variants
    var page = layout.pages[pagename].defaultLayout;
    if (!mainpage) {
      mainpage = page;
      mainpageName = pagename;
    }
    page.setKeySizes();
    keyboardContainer.appendChild(page.element);
  }

  // Start off with the main page
  currentPage = mainpage;
  currentPage.element.hidden = false;

  // Handle events
  keyboardController = new KeyboardController(keyboardContainer);
  keyboardController.setPage(currentPage);
  keyboardContainer.addEventListener('key', handleKey);

  // Prevent losing focus to the currently focused app
  // Otherwise, right after mousedown event, the app will receive a focus event.
  keyboardContainer.addEventListener('mousedown', function onMouseDown(evt) {
    evt.preventDefault();
  });

  window.addEventListener('resize', resizeWindow);

  worker = new Worker('js/worker.js');
  // XXX: english hardcoded for now
  worker.postMessage({ cmd: 'setLanguage', args: ['en_us']});

  worker.onmessage = function(e) {
    switch (e.data.cmd) {
    case 'log':
      console.log(e.data.message);
      break;
    case 'error':
      console.error(e.data.message);
      break;
    case 'chars':
      console.log('Predictions for', e.data.input, 'in',
                  performance.now() - predictionStartTime, ':',
                  JSON.stringify(e.data.chars));
      keyboardController.hitdetector.setExpectedChars(e.data.chars);
      break;
    }
  };

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
    if (shifted) {
      sendKey(String.fromCharCode(key.keycode).toUpperCase().charCodeAt(0));
      shift(false);
    }
    else {
      sendKey(key.keycode);
    }

    var char = String.fromCharCode(key.keycode);
    if (shifted)
      char = char.toUpperCase();
    predictNextChar(inputContext.textBeforeCursor + char);
    break;

  case 'backspace':
    sendKey(8);
    predictNextChar(inputContext.textBeforeCursor.slice(0,-1));
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
  case 'shift':
    shift(!shifted);
    break;
  default:
    console.error('Unknown keycmd', key.keycmd);
    break;
  }
}

function predictNextChar(input) {
  var lastSpace = input.lastIndexOf(' ');
  var lastWord = input.substring(lastSpace + 1);
  predictionStartTime = performance.now();
  if (lastWord)
    worker.postMessage({ cmd: 'predictNextChar', args: [lastWord] });
  else
    keyboardController.hitdetector.setExpectedChars([]);
}

function switchPage(pagename) {
  if (!(pagename in layout.pages)) {
    console.log('unknown layout', pagename);
    return;
  }
  currentPage.element.hidden = true;
  // XXX: modify this to handle page layout variants
  currentPage = layout.pages[pagename].defaultLayout;
  keyboardController.setPage(currentPage);
  currentPage.element.hidden = false;
}

function shift(on) {
  if (on) {
    shifted = true;
    currentPage.element.classList.add('uppercase');
  }
  else {
    shifted = false;
    currentPage.element.classList.remove('uppercase');
  }
}

function sendKey(keycode) {
  console.log('sendKey:', String.fromCharCode(keycode));
  switch (keycode) {
  case KeyEvent.DOM_VK_BACK_SPACE:
  case KeyEvent.DOM_VK_RETURN:
    inputContext.sendKey(keycode, 0, 0);
    break;

  default:
    var start = performance.now();
    inputContext.sendKey(0, keycode, 0);
    break;
  }
}

function resizeWindow() {
  window.resizeTo(window.innerWidth, keyboardContainer.clientHeight);

  for (var pagename in layout.pages) {
    // XXX: modify this to handle page layout variants
    layout.pages[pagename].defaultLayout.setKeySizes();
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
