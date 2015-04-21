/* global MocksHelper, BaseModule */
'use strict';

requireApp('system/test/unit/mock_lazy_loader.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/lock_screen_launcher.js');


var mocksForLockScreenLauncher = new MocksHelper([
  'LazyLoader' 
]).init();

suite('system/LockScreenLauncher', function() {
  var subject, instance;
  mocksForLockScreenLauncher.attachTestHelpers();

  setup(function() {
    instance = {
      start: this.sinon.spy(),
      openApp: this.sinon.spy()
    };
    window.LockScreenWindowManager = function() {};
    this.sinon.stub(window, 'LockScreenWindowManager', function() {
      return instance;
    });
    subject = BaseModule.instantiate('LockScreenLauncher');
  });

  teardown(function() {
    window.LockScreenWindowManager = null;
    subject.stop();
  });

  test('Should launch lockscreen', function(done) {
    subject.launch().then(function() {
      assert.isTrue(window.LockScreenWindowManager.calledWithNew());
      assert.isTrue(instance.start.called);
      assert.isTrue(instance.openApp.called);
      done();
    });
  });

  test('Should launch lockscreen', function(done) {
    subject.standby().then(function() {
      assert.isTrue(window.LockScreenWindowManager.calledWithNew());
      assert.isTrue(instance.start.called);
      done();
    });
  });
});