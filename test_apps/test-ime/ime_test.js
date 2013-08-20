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

      sk.then(function() {
        if (++completed === chars.length) {
          navigator.mozInputMethod.inputcontext.getText().then(function(v) {
            assert.equal(expected, v);
            next();
          }, function(err) {
            assert.strictEqual(true, err);
          });
        }
      }, function(err) {
        assert.strictEqual(true, err);
      });
    });
  }

  /**
   * Listens once to an inputcontextchange and then discards the event
   * @param {Boolean} needIc Specify whether NULL for the inputcontext is OK
   * @param {Function} callback Callback with 1 arg that holds inputcontext
   */
  function onIcc(needIc, callback) {
    navigator.mozInputMethod.addEventListener('inputcontextchange', function onicc() {
      if (!navigator.mozInputMethod.inputcontext && needIc) {
        return;
      }
      navigator.mozInputMethod.removeEventListener('inputcontextchange', onicc);
      callback(navigator.mozInputMethod.inputcontext);
    });
  }

  setup(function(next) {
    container.innerHTML = '';

    // no active context? go along
    if (!navigator.mozInputMethod.inputcontext) {
      return next();
    }

    // otherwise wait for the blur() action
    onIcc(false, function() {
      next();
    });
  });

  suiteTeardown(function() {
    container.innerHTML = '';
  });

  suite('InputContextChange events', function() {
    test('Event fires on textbox focus', function(next) {
      onIcc(true, function(ic) {
        assert.equal(ic.inputType, 'text');
        next();
      });
      container.innerHTML = '<input type="text" id="test" />';
      document.querySelector('#test').focus();
    });

    test('Event fires on textarea focus', function(next) {
      onIcc(true, function(ic) {
        assert.equal(ic.inputType, 'textarea');
        next();
      });
      container.innerHTML = '<textarea id="test2">Hi!</textarea>';
      document.querySelector('#test2').focus();
    });

    test('Event fires on contenteditable focus', function(next) {
      onIcc(true, function(ic) {
        assert.equal(ic.inputType,
          'textarea');
        next();
      });
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
      onIcc(true, function() {
        fired = true;
      });
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
      container.innerHTML = '<input type="text" id="test" value="this is tb" />';
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

      onIcc(true, function(ic) {
        ic.getText().then(function(v) {
          assert.equal(expected, v);
          next();
        }, function(err) {
          assert.strictEqual(true, err);
        });
      });

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

      onIcc(true, function() {
        sendKeys(['J', 'a', 'm', KeyEvent.DOM_VK_BACK_SPACE, 'n'],
          'Jan', next);
      });
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

      onIcc(true, function(ic) {
        sendKeys(['a', 'b', 'c'], 'abc', function() {
          var r = ic.setSelectionRange(1, 0).then(function() {
            sendKeys(['d', 'e'],
             'adebc', next);
          }, function(err) {
            assert.strictEqual(true, err);
          });
        });
      });
      document.querySelector('#test').focus();
    });
  });

  suite('ReplaceSurroundingText', function() {
    // https://bugzilla.mozilla.org/show_bug.cgi?id=902847
    test('Contenteditable with CR', function(next) {
      onIcc(true, function(ic) {
        sendKeys(['J', 'a'], 'Ja', function() {
          ic.replaceSurroundingText('Jay\r', 2, 0).then(function() {
            // The \n after to shouldn't be here. Wtf?
            sendKeys(['t', 'o'], 'Jay\nto\n', function() {
              ic.replaceSurroundingText('tof\r', 2, 0).then(function() {
                ic.getText().then(function(v) {
                  // Oh hi, here's another newline...
                  assert.equal(v, 'Jay\ntof\n\n');
                  next();
                });
              });
            });
          });
        });
      });

      container.innerHTML = '<div contenteditable="true" id="test"></div>';
      document.querySelector('#test').focus();
    });

    test('Textarea with CR', function(next) {
      onIcc(true, function(ic) {
        sendKeys(['J', 'a'], 'Ja', function() {
          ic.replaceSurroundingText('Jay\r', 2, 0).then(function() {
            sendKeys(['t', 'o'], 'Jay\nto', function() {
              ic.replaceSurroundingText('tof\r', 2, 0).then(function() {
                ic.getText().then(function(v) {
                  assert.equal(v, 'Jay\ntof\n');
                  next();
                });
              });
            });
          });
        });
      });

      container.innerHTML = '<textarea id="test"></textarea>';
      document.querySelector('#test').focus();
    });
  });
});

mocha.run();
