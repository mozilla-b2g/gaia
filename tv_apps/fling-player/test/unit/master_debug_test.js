/* global MasterDebug */
'use strict';

requireApp('fling-player/js/master_debug.js');
requireApp('fling-player/js/video_player.js');

suite('fling-player/MasterDebug', function() {

  var exp, masterDBG, locDBG;

  teardown(function () {
    masterDBG = locDBG = null;
  });

  test('AAA', function () {
    //console.log('AAA', new VideoPlayer());
  });

  suite('MasterDebug behavior', function () {

    test('should report right debug mode', function () {

      exp = undefined;
      masterDBG = new MasterDebug();
      assert.equal(masterDBG.isDBG(), exp);

      exp = true;
      masterDBG = new MasterDebug();
      assert.equal(masterDBG.isDBG(), exp);

      exp = false;
      masterDBG = new MasterDebug();
      assert.equal(masterDBG.isDBG(), exp);
    });

    test('should new local debug controller', function () {
      masterDBG = new MasterDebug();
      locDBG = MasterDebug.newLocDBG(true);
      assert.isTrue(locDBG instanceof MasterDebug.LocalDebug);
    });
  });

  suite('LocalDebug behavior', function () {

    test('should follow master debug mode', function () {

      exp = true;
      masterDBG = new MasterDebug(exp);
      locDBG = MasterDebug.newLocDBG(!exp);
      assert.equal(locDBG.isDBG(), exp);

      exp = false;
      masterDBG = new MasterDebug(exp);
      locDBG = MasterDebug.newLocDBG(!exp);
      assert.equal(locDBG.isDBG(), exp);
    });

    test('should report own debug mode if no master', function () {

      exp = true;
      masterDBG = new MasterDebug();
      locDBG = MasterDebug.newLocDBG(exp);
      assert.equal(locDBG.isDBG(), exp);

      exp = false;
      masterDBG = new MasterDebug();
      locDBG = MasterDebug.newLocDBG(exp);
      assert.equal(locDBG.isDBG(), exp);
    });

    test('should log in the debug mode', function () {

      var a = 'a', b = 'b';

      exp = sinon.mock(window);
      masterDBG = new MasterDebug();
      locDBG = MasterDebug.newLocDBG(true);

      exp.expects('log').once().withExactArgs();
      locDBG.log();
      exp.verify();

      exp.expects('log').once().withExactArgs(a, b);
      locDBG.log(a, b);
      exp.verify();
    });

    test('should not log not in the debug mode', function () {

      var a = 'a', b = 'b';

      exp = sinon.mock(window);
      masterDBG = new MasterDebug();
      locDBG = MasterDebug.newLocDBG(false);

      exp.expects('log').never();
      locDBG.log();
      exp.verify();

      exp.expects('log').never();
      locDBG.log(a, b);
      exp.verify();
    });

    test('should warn in the debug mode', function () {

      var a = 'a', b = 'b';

      exp = sinon.mock(window);
      masterDBG = new MasterDebug();
      locDBG = MasterDebug.newLocDBG(true);

      exp.expects('warn').once().withExactArgs();
      locDBG.warn();
      exp.verify();

      exp.expects('warn').once().withExactArgs(a, b);
      locDBG.warn(a, b);
      exp.verify();
    });

    test('should not warn not in the debug mode', function () {

      var a = 'a', b = 'b';

      exp = sinon.mock(window);
      masterDBG = new MasterDebug();
      locDBG = MasterDebug.newLocDBG(false);

      exp.expects('warn').never();
      locDBG.warn();
      exp.verify();

      exp.expects('warn').never();
      locDBG.warn(a, b);
      exp.verify();
    });

    test('should error in the debug mode', function () {

      var a = 'a', b = 'b';

      exp = sinon.mock(window);
      masterDBG = new MasterDebug();
      locDBG = MasterDebug.newLocDBG(true);

      exp.expects('error').once().withExactArgs();
      locDBG.error();
      exp.verify();

      exp.expects('error').once().withExactArgs(a, b);
      locDBG.error(a, b);
      exp.verify();
    });

    test('should not error not in the debug mode', function () {

      var a = 'a', b = 'b';

      exp = sinon.mock(window);
      masterDBG = new MasterDebug();
      locDBG = MasterDebug.newLocDBG(false);

      exp.expects('error').never();
      locDBG.error();
      exp.verify();

      exp.expects('error').never();
      locDBG.error(a, b);
      exp.verify();
    });

    test('should test behavior in the debug mode', function () {

      var obj = {
        behavior : function () {}
      };

      exp = sinon.mock(obj);
      masterDBG = new MasterDebug();
      locDBG = MasterDebug.newLocDBG(true);

      exp.expects('behavior').once();
      locDBG.test();
      exp.verify();
    });

    test('should not test behavior not in the debug mode', function () {

      var obj = {
        behavior : function () {}
      };

      exp = sinon.mock(obj);
      masterDBG = new MasterDebug();
      locDBG = MasterDebug.newLocDBG(false);

      exp.expects('behavior').never();
      locDBG.test();
      exp.verify();
    });
  });
});