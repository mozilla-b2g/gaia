'use strict';

var assert = require('assert');

var TARGET_APP = 'app://sms.gaiamobile.org';

marionette('mozPhoneNumberService: ', function() {
  var client = marionette.client({
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false
    }
  });

  var fuzzyMatchTests = [
    ['123', '123', true, 'match same number'],
    ['abcdef', '222333', true, 'normalize first numer match'],
    ['1234567', '1234568', false, 'different numbers fail'],
    ['1234567', '123456---', false, 'invalid number not match valid one'],
    ['111', undefined, false, 'missing second argument not match'],
    [undefined, '222', false, 'missing first argument not match'],
    [null, '', true, 'missing argument matched empty string'],
    ['+552155555555', '2155555555', true, 'internationalize'],
    ['aaa123456789', 'zzzzz123456789', true, 'substring matching in effect']
  ];

  setup(function() {
    client.apps.launch(TARGET_APP);
    client.apps.switchToApp(TARGET_APP);
  });

  test('test fuzzy matches', function() {
    var results = client.executeAsyncScript(function(tests) {
      var remaining = tests.length;
      var results = new Array(tests.length);

      function testComplete() {
        if (--remaining <= 0) {
          marionetteScriptFinished(results);
        }
      }

      tests.forEach(function(data, i) {
        var req = navigator.mozPhoneNumberService.fuzzyMatch(data[0], data[1]);
        req.onsuccess = function() {
          results[i] = data[2] === req.result;
          testComplete();
        };
        req.onerror = function(e) {
          results[i] = '' + (e ? e.name : 'UnknownError');
          testComplete();
        };
      });
    }, [fuzzyMatchTests]);

    assert.equal(fuzzyMatchTests.length, results.length,
                 'should have the same number of tests and results');

    results.forEach(function(result, i) {
      if (typeof result === 'string') {
        assert.ok(false, 'Gecko failure: ' + result +
                  ': ' + fuzzyMatchTests[i][3]);
      } else {
        assert.ok(result, fuzzyMatchTests[i][3]);
      }
    });
  });
});
