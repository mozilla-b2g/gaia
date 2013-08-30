/*global mocha requireApp suite test assert setup suiteTeardown */

mocha.setup('tdd');
window.assert = chai.assert;

navigator.mozSettings.createLock().set({
  'keyboard.ftu.enabled': false
});

/**
 * This is a set of tests that test mozInputMethod
 */
suite('Input Method', function() {
  this.timeout(10000);

  var container = document.getElementById('workspace');

  setup(function(next) {
    navigator.mozInputMethod.oninputcontextchange = function() {
      if (navigator.mozInputMethod.inputcontext) {
        if (navigator.mozInputMethod.inputcontext.textAfterCursor === 'sfw') {
          navigator.mozInputMethod.oninputcontextchange = function() {
            next();
          };

          container.innerHTML = '';
          document.querySelector('#sfw input').blur();
        }
      }
    };
    document.querySelector('#sfw input').focus();
  });

  suiteTeardown(function() {
    container.innerHTML = '';
  });

  suite('InputContextChange events', function() {
    test('Event fires on textbox focus', function(next) {
      navigator.mozInputMethod.oninputcontextchange = function() {
        if (!navigator.mozInputMethod.inputcontext)
          return;
        assert.equal(navigator.mozInputMethod.inputcontext.inputType,
          'text');
        next();
      };
      container.innerHTML = '<input type="text" id="test" />';
      document.querySelector('#test').focus();
    });

    test('Event fires on textarea focus', function(next) {
      navigator.mozInputMethod.oninputcontextchange = function() {
        if (!navigator.mozInputMethod.inputcontext)
          return;
        assert.equal(navigator.mozInputMethod.inputcontext.inputType,
          'textarea');
        next();
      };
      container.innerHTML = '<textarea id="test2">Hi!</textarea>';
      document.querySelector('#test2').focus();
    });

    test('Event fires on contenteditable focus', function(next) {
      navigator.mozInputMethod.oninputcontextchange = function() {
        if (!navigator.mozInputMethod.inputcontext)
          return;
        assert.equal(navigator.mozInputMethod.inputcontext.inputType,
          'textarea');
        next();
      };
      container.innerHTML = '<div id="test3" contenteditable="true">Hi</div>';
      document.querySelector('#test3').focus();
    });

    test('No event on type="range"', function(next) {
      var fired = false;
      navigator.mozInputMethod.oninputcontextchange = function() {
        if (!navigator.mozInputMethod.inputcontext)
          return;
        fired = true;
      };
      container.innerHTML = '<input type="range" min="0" max="100" step="1"/>';
      document.querySelector('input[type=range]').focus();
      setTimeout(function() {
        assert.equal(fired, false);
        next();
      }, 150);
    });

    test('Focus event on type="date"', function(next) {
      container.innerHTML = '<input type="date" id="date1"/>';
      var el = document.querySelector('#date1');
      el.onfocus = function() {
        next();
      };
      el.focus();
    });

    test('Focus event on type="time"', function(next) {
      container.innerHTML = '<input type="time" id="time1"/>';
      var el = document.querySelector('#time1');
      el.onfocus = function() {
        next();
      };
      el.focus();
    });

    test('Event fires on textbox blur', function(next) {
      container.innerHTML = '<input type="text" id="test" />';
      var el = document.querySelector('#test');
      el.focus();

      navigator.mozInputMethod.oninputcontextchange = function() {
        assert.equal(navigator.mozInputMethod.inputcontext, null);
        next();
      };
      el.blur();
    });

    test('Event fires on textarea blur', function(next) {
      container.innerHTML = '<textarea id="test2">Whatup</textarea>';
      var el = document.querySelector('#test2');
      el.focus();

      navigator.mozInputMethod.oninputcontextchange = function() {
        assert.equal(navigator.mozInputMethod.inputcontext, null);
        next();
      };
      el.blur();
    });

    test('Event fires on contenteditable blur', function(next) {
      container.innerHTML = '<div id="test3" contenteditable="true">O</div>';
      var el = document.querySelector('#test3');
      el.focus();

      navigator.mozInputMethod.oninputcontextchange = function() {
        assert.equal(navigator.mozInputMethod.inputcontext, null);
        next();
      };
      el.blur();
    });
  });

  suite('GetText', function() {
    function getText(html, id, expected, next) {
      container.innerHTML = html;

      navigator.mozInputMethod.oninputcontextchange = function() {
        if (!navigator.mozInputMethod.inputcontext)
          return;

        var r = navigator.mozInputMethod.inputcontext.getText();
        r.onerror = function() {
          assert.strictEqual(true, r.error.name);
        };
        r.onsuccess = function() {
          assert.equal(expected, r.result);
          next();
        };
      };

      document.querySelector('#' + id).focus();
    }

    test('Textbox', function(next) {
      getText('<input type="text" id="test" value="Joehoe" />', 'test',
        'Joehoe', next);
    });

    test('Textarea', function(next) {
      getText('<textarea id="test">Oh yeah</textarea>', 'test',
        'Oh yeah', next);
    });

    test('ContentEditable', function(next) {
      getText('<div contenteditable="true" id="test">Que</div>', 'test',
        'Que', next);
    });
  });

  suite('SendKeys', function() {
    function sendKeys(chars, expected, next) {
      var completed = 0;
      var icc = navigator.mozInputMethod.inputcontext;
      if (!icc)
        return;
      chars.forEach(function(c) {
        var sk;
        if (typeof c === 'string') {
          sk = icc.sendKey(0, c.charCodeAt(0), 0);
        }
        else {
          sk = icc.sendKey(c, 0, 0);
        }

        sk.onsuccess = function() {
          if (++completed === chars.length) {
            var r = navigator.mozInputMethod.inputcontext.getText();
            r.onerror = function() {
              assert.strictEqual(true, r.error.name);
            };
            r.onsuccess = function() {
              assert.equal(expected, r.result);
              next();
            };
          }
        };
        sk.onerror = function() {
          assert.strictEqual(true, sk.error.name);
        };
      });
    }

    test('Handle backspace', function(next) {
      container.innerHTML = '<input type="text" id="test" value="" />';

      navigator.mozInputMethod.oninputcontextchange = function() {
        if (navigator.mozInputMethod.inputcontext) {
          sendKeys(['J', 'a', 'm', KeyEvent.DOM_VK_BACK_SPACE, 'n'],
            'Jan', next);
        }
      };
      document.querySelector('#test').focus();
    });

    test('Cursor movement', function(next) {
      container.innerHTML = '<input type="text" id="test" value="" />';

      navigator.mozInputMethod.oninputcontextchange = function() {
        if (!navigator.mozInputMethod.inputcontext)
          return;

        sendKeys(['a', 'b', 'c'], 'abc', function() {
          var r =
            navigator.mozInputMethod.inputcontext.setSelectionRange(1, 0);
          r.onsuccess = function() {
            sendKeys(['d', 'e'],
               'adebc', next);
          };
          r.onerror = function() {
            assert.strictEqual(true, r.error.name);
          };
        });
      };
      document.querySelector('#test').focus();
    });
  });
});

mocha.checkLeaks();
mocha.run();