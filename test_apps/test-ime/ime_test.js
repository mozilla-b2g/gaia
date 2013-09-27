/*global mocha requireApp suite test assert setup suiteTeardown */

mocha.setup({ ui: 'tdd', ignoreLeaks: true });
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

  /**
   * Send a set of characters to the current inputcontext
   * @param {Array} chars Array of characters
   * @param {Boolean} expected Expected value of the field after input
   * @param {Function} next Callback
   */
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
          var gt = navigator.mozInputMethod.inputcontext.getText();

          gt.onsuccess = function() {
            /*dump('sendKeys result ' + JSON.stringify({
                expected: expected,
                result: v
              }) + '\n'); */

            assert.strictEqual(expected, gt.result);
            next();
          };

          gt.onerror = function() {
            assert.strictEqual(true, gt.error);
          };
        }
      };
      sk.onerror = function() {
        assert.strictEqual(true, sk.error);
      };
    });
  }

  /**
   * Listens once to an inputcontextchange and then discards the event
   * @param {Boolean} needIc Specify whether NULL for the inputcontext is OK
   * @param {Function} callback Callback with 1 arg that holds inputcontext
   */
  function onIcc(needIc, callback) {
    navigator.mozInputMethod.oninputcontextchange = function onicc() {
      if (!navigator.mozInputMethod.inputcontext && needIc) {
        return;
      }
      callback(navigator.mozInputMethod.inputcontext);
    };
  }

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

    test('Event fires on designMode=on focus', function(next) {
      onIcc(true, function(ic) {
        assert.equal(ic.inputType, 'textarea');
        next();
      });
      container.innerHTML = '<iframe id="test"></iframe>';
      var iframe = container.querySelector('iframe');
      iframe.contentDocument.designMode = 'on';
      iframe.focus();
    });

    test('Event fires on iframe body contenteditable focus', function(next) {
      // <body contenteditable>contentEditable</body>
      onIcc(true, function(ic) {
        assert.equal(ic.inputType, 'textarea');
        next();
      });
      container.innerHTML = '<iframe id="test"></iframe>';
      var iframe = container.querySelector('iframe');
      iframe.contentDocument.body.setAttribute('contenteditable', true);
      iframe.focus();
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

      setTimeout(function() {
        onIcc(false, function(ic) {
          assert.equal(ic, null);
          next();
        });
        el.blur();
      }, 100);
    });

    test('Event fires on textarea blur', function(next) {
      container.innerHTML = '<textarea id="test2">Whatup</textarea>';
      var el = document.querySelector('#test2');
      el.focus();

      setTimeout(function() {
        onIcc(false, function(ic) {
          assert.equal(ic, null);
          next();
        });
        el.blur();
      }, 100);
    });

    test('Event fires on contenteditable blur', function(next) {
      container.innerHTML = '<div id="test3" contenteditable="true">O</div>';
      var el = document.querySelector('#test3');
      el.focus();

      setTimeout(function() {
        onIcc(false, function(ic) {
          assert.equal(ic, null);
          next();
        });
        el.blur();
      }, 100);
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

    test('Handle contenteditable CR', function(next) {
      container.innerHTML = '<div contenteditable="true" id="test"></div>';

      onIcc(true, function() {
        sendKeys(['J', 'a', 'm', KeyEvent.DOM_VK_RETURN, 'n'],
          'Jam\nn', next);
      });
      document.querySelector('#test').focus();
    });

    test('Handle textarea CR', function(next) {
      container.innerHTML = '<textarea id="test"></textarea>';

      onIcc(true, function() {
        sendKeys(['J', 'a', 'm', KeyEvent.DOM_VK_RETURN, 'n'],
          'Jam\nn', next);
      });
      document.querySelector('#test').focus();
    });

    test('Cursor movement', function(next) {
      container.innerHTML = '<input type="text" id="test" value="" />';

      navigator.mozInputMethod.oninputcontextchange = function() {
        if (!navigator.mozInputMethod.inputcontext)
          return;

        var ic = navigator.mozInputMethod.inputcontext;

        sendKeys(['a', 'b', 'c'], 'abc', function() {
          var r = ic.setSelectionRange(1, 0);

          r.onsuccess = function() {
            sendKeys(['d', 'e'], 'adebc', next);
          };
          r.onerror = function() {
            assert.strictEqual(true, r.error);
          };
        });
      };
      document.querySelector('#test').focus();
    });
  });

  suite('ReplaceSurroundingText', function() {
    // https://bugzilla.mozilla.org/show_bug.cgi?id=902847
    test('Contenteditable with CR', function(next) {
      onIcc(true, function(ic) {
        sendKeys(['J', 'a'], 'Ja', function() {
          ic.replaceSurroundingText('Jay\r', 2, 0).onsuccess = function() {
            // The \n after to shouldn't be here. Wtf?
            sendKeys(['t', 'o'], 'Jay\nto\n', function() {
              ic.replaceSurroundingText('tof\r', 2, 0).onsuccess = function() {
                ic.getText().onsuccess = function() {
                  // Oh hi, here's another newline...
                  assert.equal(this.result, 'Jay\ntof\n\n');
                  next();
                };
              };
            });
          };
        });
      });

      container.innerHTML = '<div contenteditable="true" id="test"></div>';
      document.querySelector('#test').focus();
    });

    test('Textarea with CR', function(next) {
      onIcc(true, function(ic) {
        sendKeys(['J', 'a'], 'Ja', function() {
          ic.replaceSurroundingText('Jay\r', 2, 0).onsuccess = function() {
            sendKeys(['t', 'o'], 'Jay\nto', function() {
              ic.replaceSurroundingText('tof\r', 2, 0).onsuccess = function() {
                ic.getText().onsuccess = function() {
                  assert.equal(this.result, 'Jay\ntof\n');
                  next();
                };
              };
            });
          };
        });
      });

      container.innerHTML = '<textarea id="test"></textarea>';
      document.querySelector('#test').focus();
    });
  });
});

mocha.run();
