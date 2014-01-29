/* global mocha, SimLock */
'use strict';

mocha.globals(['SimLock', 'SIMSlotManager']);

suite('SimLock', function() {
  var realSIMSlotManager;

  suiteSetup(function() {
    realSIMSlotManager = window.SIMSlotManager;
    window.SIMSlotManager = {};
  });

  suiteTeardown(function() {
    window.SIMSlotManager = realSIMSlotManager;
  });

  suite('SIMSlotManager is not ready', function() {
    suiteSetup(function(done) {
      requireApp('system/js/sim_lock.js', done);
    });

    setup(function() {
      this.sinon.stub(SimLock, 'init');
    });

    test('simslotready event is registered', function() {
      window.dispatchEvent(new window.CustomEvent('simslotready'));
      assert.isTrue(SimLock.init.called);
    });
  });
});
