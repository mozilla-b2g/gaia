/* global mDBG */
'use strict';

requireApp('fling-player/js/master_debug.js');

suite('fling-player/MasterDebug', function() {

  var exp, mockWindow;

  setup(function () {
    mockWindow = {};
    mockWindow.log = mockWindow.warn = mockWindow.error = function () {};
  });

  teardown(function () {
    exp = undefined;
  });

  test('should turn off debug mode before push to moz upstream', function () {
    assert.isFalse(mDBG.isDBG(),
      'Please turn off debug mode before push to moz upstream'
    );
  });

  test('should set debug flag', function () {

    exp = true;
    mDBG.setDBG(exp);
    assert.equal(mDBG.isDBG(), exp);

    exp = false;
    mDBG.setDBG(exp);
    assert.equal(mDBG.isDBG(), exp);
  });

  suite('behavior in the debug mode', function () {

    var a = 'a';
    var b = 'b';

    setup(function () {
      exp = sinon.mock(console);
      mDBG.setDBG(true);
    });

    test('should log in the debug mode', function () {
      exp.expects('log').once().withExactArgs(a, b);
      mDBG.log(a, b);
      exp.verify();
    });

    test('should warn in the debug mode', function () {
      exp.expects('warn').once().withExactArgs(a, b);
      mDBG.warn(a, b);
      exp.verify();
    });

    test('should error in the debug mode', function () {
      exp.expects('error').once().withExactArgs(a, b);
      mDBG.error(a, b);
      exp.verify();
    });

    test('should test behavior in the debug mode', function () {

      var obj = {
        testSomething : function () {}
      };

      exp = sinon.mock(obj);

      exp.expects('testSomething').once();
      mDBG.test(obj.testSomething.bind(obj));
      exp.verify();
    });
  });

  suite('behavior not in the debug mode', function () {

    setup(function () {
      exp = sinon.mock(console);
      mDBG.setDBG(false);
    });

    test('should not log not in the debug mode', function () {
      exp.expects('log').never();
      mDBG.log('test');
      exp.verify();
    });

    test('should not warn not in the debug mode', function () {
      exp.expects('warn').never();
      mDBG.warn('test');
      exp.verify();
    });

    test('should not error not in the debug mode', function () {
      exp.expects('error').never();
      mDBG.error('test');
      exp.verify();
    });

    test('should not test behavior not in the debug mode', function () {

      var obj = {
        testSomething : function () {}
      };

      exp = sinon.mock(obj);

      exp.expects('testSomething').never();
      mDBG.test(obj.testSomething.bind(obj));
      exp.verify();
    });
  });
});
