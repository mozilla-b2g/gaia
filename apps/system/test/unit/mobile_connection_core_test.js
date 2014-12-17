/* global MockPromise, BaseModule, MockNavigatorMozMobileConnections,
          MocksHelper, MockSIMSlotManager */
'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
require('/shared/test/unit/mocks/mock_simslot_manager.js');
require('/shared/test/unit/mocks/mock_promise.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/mobile_connection_core.js');

var mocksForMobileConnectionCore = new MocksHelper([
  'SIMSlotManager'
]).init();

suite('system/MobileConnectionCore', function() {
  mocksForMobileConnectionCore.attachTestHelpers();
  var subject;

  setup(function() {
    subject = BaseModule.instantiate('MobileConnectionCore', 
      MockNavigatorMozMobileConnections);
    subject.start();
  });

  teardown(function() {
    subject.stop();
  });
  suite('SimSettingsHelper', function() {
    test('Should init sim setting helper if DSDS', function() {
      var spy = this.sinon.spy();
      var fakePromise = new MockPromise();
      this.sinon.stub(BaseModule, 'lazyLoad').returns(fakePromise);
      this.sinon.stub(MockSIMSlotManager, 'isMultiSIM').returns(true);
      subject._start();
      window.SimSettingsHelper = {
        start: spy
      };
      fakePromise.mFulfillToValue();
      assert.isDefined(subject.simSettingsHelper);
      assert.isTrue(spy.called);
    });

    test('Should not init sim setting helper if not DSDS', function() {
      this.sinon.stub(MockSIMSlotManager, 'isMultiSIM').returns(false);
      subject.stop();
      subject.start();
      assert.isUndefined(subject.simSettingsHelper);
    });
  });
});
