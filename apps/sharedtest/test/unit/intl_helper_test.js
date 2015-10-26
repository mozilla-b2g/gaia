'use strict';

/* global IntlHelper */

require('/shared/js/intl_helper.js');

suite('IntlHelper', function() {
  var realMozL10n;

  beforeEach(function() {
    IntlHelper._resetObjectCache();
  });

  setup(function() {
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = undefined;
  });

  teardown(function() {
    navigator.mozL10n = realMozL10n;
  });

  suite('define', function() {
    test('should work for a known type', function() {
      assert.doesNotThrow(function() {
        IntlHelper.define('shortDate', 'datetime', {
          'month': 'numeric',
          'year': '2-digit'
        });
      });
    });
    test('should throw for an unknown type', function() {
      assert.throws(function() {
        IntlHelper.define('shortDate', 'unknownType', {
          'month': 'numeric',
          'year': '2-digit'
        });
      });
    });
  });

  suite('get', function() {
    setup(function() {
      IntlHelper.define('shortDate', 'datetime', {
        'month': 'numeric',
        'year': '2-digit'
      });
    });

    test('should work for a defined name', function() {
      assert.doesNotThrow(function() {
        IntlHelper.get('shortDate');
      });
    });
    test('should return a formatter with the right type', function() {
      var formatter = IntlHelper.get('shortDate');
      assert.isTrue(formatter instanceof Intl.DateTimeFormat);
    });
    test('should return a formatter with the right options', function() {
      var formatter = IntlHelper.get('shortDate');
      var options = formatter.resolvedOptions();
      assert.equal(options.month, 'numeric');
      assert.equal(options.year, '2-digit');
      assert.strictEqual(options.hour, undefined);
      assert.strictEqual(options.hour12, undefined);
    });
    test('should throw for an undefined name', function() {
      assert.throws(function() {
        IntlHelper.get('unknownName');
      });
    });
  });

  suite('observe', function() {
    setup(function() {
      IntlHelper.define('shortDate', 'datetime', {
        'month': 'numeric',
        'year': '2-digit'
      });
    });

    test('should work for a defined name', function() {
      assert.doesNotThrow(function() {
        IntlHelper.observe('shortDate', () => {});
      });
    });
    test('should throw for an undefined name', function() {
      assert.throws(function() {
        IntlHelper.observe('undefinedName', () => {});
      });
    });
    test('should throw if one of the names is undefined', function() {
      assert.throws(function() {
        IntlHelper.observe(['shortDate', 'undefinedName'], () => {});
      });
    });
    test('should fire when affected', function(done) {
      IntlHelper.observe('shortDate', done);

      IntlHelper.handleEvent({type: 'languagechange'});
    });
    test('should fire once even when defined twice', function() {
      var firedCount = 0;
      function test() {
        firedCount++;
      }
      IntlHelper.observe('shortDate', test);
      IntlHelper.observe('shortDate', test);

      IntlHelper.handleEvent({type: 'languagechange'});

      assert.equal(firedCount, 1);
    });
    test('should next event even when the the first one errors', function() {
      var firedCount = 0;
      function test() {
        var x = unknownVariable + 1; // jshint ignore:line
        firedCount++;
      }
      function test2() {
        firedCount++;
      }
      IntlHelper.observe('shortDate', test);
      IntlHelper.observe('shortDate', test2);

      // be nice to our log, avoid spamming our error
      sinon.stub(console, 'error');
      IntlHelper.handleEvent({type: 'languagechange'});
      console.error.restore();

      assert.equal(firedCount, 1);
    });
  });

  suite('unobserve', function() {
    setup(function() {
      IntlHelper.define('shortDate', 'datetime', {
        'month': 'numeric',
        'year': '2-digit'
      });
    });

    test('should not fire after unobserved', function() {
      var wasFired = false;

      function test() {
        wasFired = true;
      }
      IntlHelper.observe('shortDate', test);
      IntlHelper.unobserve('shortDate', test);
      IntlHelper.handleEvent({type: 'languagechange'});

      assert.isFalse(wasFired);
    });
  });

  suite('DateTime', function() {
    setup(function() {
      IntlHelper.define('shortTime', 'datetime', {
        'hour': 'numeric',
        'minute': 'numeric'
      });

      IntlHelper.define('shortDate', 'datetime', {
        'month': 'numeric',
        'year': '2-digit'
      });
    });

    test('should only fire hour formatter on timeformatchange', function() {
      var setTimeFired = false;
      var setDateFired = false;
      function setTime() {
        setTimeFired = true;
      }

      function setDate() {
        setDateFired = true;
      }

      IntlHelper.observe('shortTime', setTime);
      IntlHelper.observe('shortDate', setDate);

      IntlHelper.handleEvent({type: 'timeformatchange'});

      assert.isTrue(setTimeFired);
      assert.isFalse(setDateFired);
    });
    test('should fire if at least one name is affected', function() {
      var setValuesFired = false;
      function setValues() {
        setValuesFired = true;
      }

      IntlHelper.observe(['shortDate', 'shortTime'], setValues);
      IntlHelper.handleEvent({type: 'timeformatchange'});

      assert.isTrue(setValuesFired);
    });
    test('should not fire if timeformatchange and no hour', function() {
      var setValuesFired = false;
      function setValues() {
        setValuesFired = true;
      }

      IntlHelper.observe('shortDate', setValues);
      IntlHelper.handleEvent({type: 'timeformatchange'});

      assert.isFalse(setValuesFired);
    });
    test('should add hour12 to options', function() {
      var expectedValue = false;
      function setValues() {
        var formatter = IntlHelper.get('shortTime');
        assert.equal(formatter.resolvedOptions().hour12, expectedValue);
      }

      IntlHelper.observe('shortTime', setValues);
      navigator.mozHour12 = false;
      IntlHelper.handleEvent({type: 'timeformatchange'});

      navigator.mozHour12 = true;
      expectedValue = true;
      IntlHelper.handleEvent({type: 'timeformatchange'});
    });
  });

  suite('Number', function() {
    setup(function() {
      IntlHelper.define('downloadPercent', 'number', {
        'style': 'percent',
      });
    });

    test('should fire formatter on languagechange', function() {
      var setValuesFired = false;
      function setValues() {
        setValuesFired = true;
      }

      IntlHelper.observe('downloadPercent', setValues);
      IntlHelper.handleEvent({type: 'languagechange'});

      assert.isTrue(setValuesFired);
    });
    test('should not fire formatter on timeformatchange', function() {
      var setValuesFired = false;
      function setValues() {
        setValuesFired = true;
      }

      IntlHelper.observe('downloadPercent', setValues);
      IntlHelper.handleEvent({type: 'timeformatchange'});

      assert.isFalse(setValuesFired);
    });
  });

  suite('Collator', function() {
    setup(function() {
      IntlHelper.define('timezoneSorter', 'collator', {
        'usage': 'sort',
        'sensitivity': 'variant',
      });
    });

    test('should fire formatter on languagechange', function() {
      var setValuesFired = false;
      function setValues() {
        setValuesFired = true;
      }

      IntlHelper.observe('timezoneSorter', setValues);
      IntlHelper.handleEvent({type: 'languagechange'});

      assert.isTrue(setValuesFired);
    });
    test('should not fire formatter on timeformatchange', function() {
      var setValuesFired = false;
      function setValues() {
        setValuesFired = true;
      }

      IntlHelper.observe('timezoneSorter', setValues);
      IntlHelper.handleEvent({type: 'timeformatchange'});

      assert.isFalse(setValuesFired);
    });
  });
});
