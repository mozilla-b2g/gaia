/* globals MockNavigatorMozMobileConnections, MocksHelper, MockPromise,
           MockSIMSlot, BaseModule */

'use strict';

require('/shared/js/lazy_loader.js');
require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
require('/shared/test/unit/mocks/mock_promise.js');
require('/shared/test/unit/mocks/mock_simslot.js');

requireApp('system/test/unit/mock_operator_variant_handler.js');
require('/shared/js/operator_variant_helper.js');
require('/shared/js/apn_helper.js');
requireApp('system/js/system.js');
requireApp('system/js/base_module.js');
requireApp('system/js/operator_variant_manager.js');

var mocksForOperatorVariantManager = new MocksHelper([
  'OperatorVariantHandler'
]).init();

suite('Operator variant manager', function() {
  mocksForOperatorVariantManager.attachTestHelpers();
  var subject;

  setup(function() {
    MockNavigatorMozMobileConnections[0].data = {
      type: 'gsm'
    };
    MockNavigatorMozMobileConnections[0].iccId = 'fake_iccid';
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
    subject._start();
    assert.isTrue(Promise.all.called);
    fakePromise.mFulfillToValue();
    assert.isTrue(subject.init.called);
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

  test('getIccCardIndex', function() {
    assert.equal(subject.getIccCardIndex('fake_iccid'), 0);
    assert.equal(subject.getIccCardIndex('no_this_iccid'), -1);
  });

  test('handle simslotupdated', function() {
    var spy = this.sinon.spy();
    this.sinon.stub(window, 'OperatorVariantHandler').returns({
      start: spy
    });
    var fakeSIMSlot =
      new MockSIMSlot(MockNavigatorMozMobileConnections[0], 0);
    subject.start();
    window.dispatchEvent(new CustomEvent('simslotupdated', {
      detail: fakeSIMSlot
    }));
    assert.isTrue(window.OperatorVariantHandler.calledWithNew());
    assert.isTrue(window.OperatorVariantHandler.calledWith(
      fakeSIMSlot.simCard, fakeSIMSlot.index));
    assert.isTrue(spy.called);
  });

  test('init', function() {
    var spy = this.sinon.spy();
    this.sinon.stub(window, 'OperatorVariantHandler').returns({
      start: spy
    });
    subject.init();
    assert.isTrue(window.OperatorVariantHandler.calledWithNew());
    assert.isTrue(window.OperatorVariantHandler.calledWith(
      MockNavigatorMozMobileConnections[0].iccId, 0));
    assert.isTrue(spy.called);
  });
});
