/* globals MockNavigatorMozMobileConnections, MocksHelper, MockPromise,
           MockSIMSlot, BaseModule, MockSIMSlotManager */

'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
require('/shared/test/unit/mocks/mock_promise.js');
require('/shared/test/unit/mocks/mock_simslot.js');
require('/shared/test/unit/mocks/mock_simslot_manager.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');

requireApp('system/test/unit/mock_operator_variant_handler.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/operator_variant_manager.js');

var mocksForOperatorVariantManager = new MocksHelper([
  'OperatorVariantHandler', 'SIMSlotManager', 'LazyLoader'
]).init();

suite('Operator variant manager', function() {
  mocksForOperatorVariantManager.attachTestHelpers();
  var subject;

  setup(function() {
    MockNavigatorMozMobileConnections[0].data = {
      type: 'gsm'
    };
    MockNavigatorMozMobileConnections[0].iccId = 'fake_iccid';
    MockNavigatorMozMobileConnections[1] = {
      iccId: null
    };
    subject = BaseModule.instantiate('OperatorVariantManager',
      {
        mobileConnections: MockNavigatorMozMobileConnections
      });
  });

  teardown(function() {
    subject.stop();
    MockNavigatorMozMobileConnections.mTeardown();
  });

  test('init should be called after all promises are done', function() {
    var fakePromise = new MockPromise();
    this.sinon.stub(Promise, 'all', function() {
      return fakePromise;
    });
    this.sinon.stub(subject, 'init');
    subject.start();
    assert.isTrue(Promise.all.called);
    fakePromise.mFulfillToValue([null, null, null, 'fxos']);
    assert.isTrue(subject.init.called);
    assert.equal(subject.deviceInfoOs, 'fxos');
  });

  suite('ensureValueUnderKeyIsArray', function() {
    var stubReadSetting;
    setup(function() {
      stubReadSetting = this.sinon.stub(subject, 'readSetting');
    });

    test('should resolve if the setting value is array', function(done) {
      var fakePromise = new MockPromise();
      stubReadSetting.returns(fakePromise);
      subject.ensureValueUnderKeyIsArray('i.am.array').then(function() {
        done();
      });
      fakePromise.mFulfillToValue([1, 2]);
    });

    test('should override if the setting value is not array', function(done) {
      var fakePromise = new MockPromise();
      var fakeWritePromise = new MockPromise();
      stubReadSetting.returns(fakePromise);
      this.sinon.stub(subject, 'writeSetting').returns(fakeWritePromise);
      subject.ensureValueUnderKeyIsArray('i.am.not.array').then(function() {
        done();
      });
      fakePromise.mFulfillToValue(1);
      fakeWritePromise.mFulfillToValue();
    });
  });

  ['simslot-updated', 'simslot-iccinfochange'].forEach(function(eventName) {
    test('handle ' + eventName, function() {
      var fakeSIMSlot = {};
      this.sinon.stub(subject, '_updateOperatorVariantHandler');
      subject.start();
      window.dispatchEvent(new CustomEvent(eventName, {
        detail: fakeSIMSlot
      }));
      assert.isTrue(
        subject._updateOperatorVariantHandler.calledWith(fakeSIMSlot));
    });
  });

  suite('_updateOperatorVariantHandler', function() {
    test('clear the operator variant handler when no simcard', function() {
      var targetIndex = 0;
      subject.operatorVariantHandlers[targetIndex] = {};
      subject._updateOperatorVariantHandler({
        index: targetIndex,
        simcard: null
      });
      assert.isNull(subject.operatorVariantHandlers[targetIndex]);
    });

    test('clear the operator variant handler when no iccinfo', function() {
      var targetIndex = 0;
      subject.operatorVariantHandlers[targetIndex] = {};
      subject._updateOperatorVariantHandler({
        index: targetIndex,
        simcard: {
          iccInfo: null
        }
      });
      assert.isNull(subject.operatorVariantHandlers[targetIndex]);
    });

    test('clear the operator variant handler when no iccid', function() {
      var targetIndex = 0;
      subject.operatorVariantHandlers[targetIndex] = {};
      subject._updateOperatorVariantHandler({
        index: targetIndex,
        simcard: {
          iccInfo: {
            iccid: null
          }
        }
      });
      assert.isNull(subject.operatorVariantHandlers[targetIndex]);
    });

    test('create and start a new operator variant handler when possible',
      function() {
        var fakeSIMSlot =
          new MockSIMSlot(MockNavigatorMozMobileConnections[0], 0);
        var spy = this.sinon.spy();
        this.sinon.stub(window, 'OperatorVariantHandler').returns({
          start: spy
        });
        subject._updateOperatorVariantHandler(fakeSIMSlot);
        assert.isTrue(window.OperatorVariantHandler.calledWithNew());
        assert.isTrue(window.OperatorVariantHandler.calledWith(
          fakeSIMSlot.simCard.iccInfo.iccid, fakeSIMSlot.index, subject));
        assert.isTrue(spy.called);
    });
  });

  test('init', function() {
    var fakeSIMSlots = [
      new MockSIMSlot(MockNavigatorMozMobileConnections[0], 0),
      new MockSIMSlot(MockNavigatorMozMobileConnections[1], 1)
    ];
    this.sinon.stub(MockSIMSlotManager, 'getSlots').returns(
      fakeSIMSlots
    );
    fakeSIMSlots[1].simCard = null;
    var spy = this.sinon.spy();
    this.sinon.stub(window, 'OperatorVariantHandler').returns({
      start: spy
    });
    subject.init();
    assert.isTrue(window.OperatorVariantHandler.calledWithNew());
    assert.isTrue(window.OperatorVariantHandler.calledWith(
      fakeSIMSlots[0].simCard.iccInfo.iccid, 0, subject));
    assert.isTrue(spy.called);
  });
});
