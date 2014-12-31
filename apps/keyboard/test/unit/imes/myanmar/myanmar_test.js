/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

requireApp('keyboard/test/unit/setup_engine.js');
requireApp('keyboard/js/imes/myanmar/myanmar.js');

suite('myanmar.js', function() {

  var engine;

  var BACKSPACE = 8;
  var outputString = '';
  var glue = {
    sendKey: function(key) {
      outputString = outputString + String.fromCharCode(key);
    },
    sendString: sinon.stub(),
    setUpperCase: sinon.stub(),
    replaceSurroundingText: function(str, index, num) {
      assert.equal(num+index, 0);
      outputString = str;
    },
    getNumberOfCandidatesPerRow: function() {
      return 0;
    }
  };

  setup(function() {
    outputString = '';
    this.sinon.spy(glue, 'replaceSurroundingText');
  });

  teardown(function() {
    glue.replaceSurroundingText.reset();
  });

  test('Init', function() {
    assert.isDefined(window.InputMethods.myanmar);
    engine = window.InputMethods.myanmar;
    engine.init(glue);
  });

  test('Input VowelSE', function() {
    outputString = '';
    engine.click('\u1031'.charCodeAt(0));
    assert.equal(outputString, '\u200B\u1031');
  });

  function runTest(rules, action) {
    rules.forEach(function(rule, index) {
      test('case ' + index, function() {
        engine.surroundingtextChange({beforeString:rule.input, afterString:''});
        action();
        assert.ok(glue.replaceSurroundingText.called);
        assert.equal(outputString, rule.result);
      });
    });
  }

  suite('Add rules', function() {
    runTest([
      { input:'\u1025\u102E', result: '\u1026' },
      { input:'\u1025\u103A', result: '\u1009\u103A' },
      { input:'\u101E\u103C\u1031\u102C\u103A', result: '\u102A' }
    ], sinon.stub());
  });

  suite('Swap rules', function() {
    runTest([
      // p1 + p2 => p2 + p1
      { input:'\u103E\u103B', result: '\u103B\u103E'},
      { input:'\u103D\u103B', result: '\u103B\u103D'},
      { input:'\u1036\u102E', result: '\u102E\u1036'},
      { input:'\u102F\u102D', result: '\u102D\u102F'},
      { input:'\u103A\u1037', result: '\u1037\u103A'},
      { input:'\u1037\u102E', result: '\u102E\u1037'},
      { input:'\u1036\u1032', result: '\u1032\u1036'},
      { input:'\u1031\u103B', result: '\u103B\u1031'},
      // p1 + p2 + p3 => p2 + p3 + p1
      { input:'\u1031\u1039\u1000', result: '\u1039\u1000\u1031'},
      // p1 + p2 + p3 => p3 + p1 + p2
      { input:'\u103D\u1031\u103C', result: '\u103C\u103D\u1031'},
      { input:'\u103D\u103E\u103C', result: '\u103C\u103D\u103E'},
      { input:'\u103E\u1031\u103B', result: '\u103B\u103E\u1031'},
      // p1 + p2 + p3 => p3 + p2
      { input:'\u200B\u1031\u1000', result: '\u1000\u1031'},
      // p1 + p2 + p3 + p4 => p4 + p1 + p2 + p3
      { input:'\u103D\u103E\u1031\u103C', result: '\u103C\u103D\u103E\u1031'}
    ], sinon.stub());
  });

  suite('Delete rules', function() {
    runTest([
      { input:'\u1039\u1019\u1031', result: '\u1031\u1039' },
      { input:'\u1019\u1031', result: '\u200B\u1031' },
      { input:'\u103B\u1031', result: '\u1031' },
      { input:'\u1039\u1019', result: '' },
      { input:'\u200B\u1031', result: '' },
    ], function() {
      engine.click(BACKSPACE);
    });
  });

});
