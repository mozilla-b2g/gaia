'use strict';

/* global CpuManager, CpuWakeLockManager */

require('/js/wake_lock_manager.js');
require('/js/cpu_manager.js');

suite('CpuManager', function() {
  var realMozPower;
  var manager;
  var stubCpuWakeLockManager;

  setup(function() {
    realMozPower = navigator.mozPower;
    var mockMozPower = {
      cpuSleepAllowed: true
    };

    Object.defineProperty(navigator, 'mozPower', {
      configurable: true,
      get: function() {
        return mockMozPower;
      }
    });

    stubCpuWakeLockManager = this.sinon.stub(CpuWakeLockManager.prototype);
    this.sinon.stub(window, 'CpuWakeLockManager')
      .returns(stubCpuWakeLockManager);

    manager = new CpuManager();
    manager.start();
  });

  teardown(function() {
    manager.stop();
    assert.isTrue(stubCpuWakeLockManager.stop.calledOnce);

    Object.defineProperty(navigator, 'mozPower', {
      configurable: true,
      get: function() {
        return realMozPower;
      }
    });
  });

  test('onwakelockchange', function() {
    stubCpuWakeLockManager.onwakelockchange(true);

    assert.isFalse(navigator.mozPower.cpuSleepAllowed);
  });
});
