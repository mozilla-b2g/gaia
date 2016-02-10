/* global OperatorIcon, MocksHelper, MockMobileOperator,
          MockL10n, MockNavigatorMozMobileConnections,
          MockMutationObserver */
'use strict';

requireApp('system/shared/test/unit/mocks/mock_service.js');
requireApp('system/shared/test/unit/mocks/mock_mutation_observer.js');
require('/shared/test/unit/mocks/mock_mobile_operator.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/base_icon.js');
requireApp('system/js/operator_icon.js');
requireApp('system/shared/test/unit/mocks/mock_simslot.js');
requireApp('system/shared/test/unit/mocks/mock_simslot_manager.js');
requireApp(
  'system/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
require('/shared/test/unit/mocks/mock_l10n.js');

var mocksForOperatorIcon = new MocksHelper([
  'Service',
  'MobileOperator',
  'MutationObserver'
]).init();

suite('system/OperatorIcon', function() {
  var subject;
  var realL10n;

  mocksForOperatorIcon.attachTestHelpers();

  setup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    subject = new OperatorIcon({
      mobileConnections: MockNavigatorMozMobileConnections
    });
    this.sinon.stub(subject, 'publish');
    subject.start();
    subject.element = document.createElement('div');
  });

  teardown(function() {
    navigator.mozL10n = realL10n;
    subject.stop();
  });

  test('Update the icon should always show it', function() {
    this.sinon.stub(subject, 'show');
    subject.update();
    assert.isTrue(subject.show.called);
  });

  test('Mutation observer callbacks should publish widthchanged', function() {
    subject.publish.restore();
    subject.onrender();
    this.sinon.stub(subject, 'publish');
    MockMutationObserver.mLastObserver.mTriggerCallback();
    assert.isTrue(subject.publish.calledWith('widthchanged'));
    MockMutationObserver.mLastObserver.mTriggerCallback();
    assert.isTrue(subject.publish.calledOnce);
  });

  suite('operator name', function() {
    setup(function() {
      subject.manager.mobileConnections[0].voice = {
        connected: true,
        network: {
          shortName: 'Fake short',
          longName: 'Fake long',
          mnc: '10' // VIVO
        },
        cell: {
          gsmLocationAreaCode: 71 // BA
        }
      };
    });

    suite('single sim', function() {
      var conn;
      setup(function() {
        conn = MockNavigatorMozMobileConnections[1];
        MockNavigatorMozMobileConnections.mRemoveMobileConnection(1);
      });
      teardown(function() {
        MockNavigatorMozMobileConnections.mAddMobileConnection(conn, 1);
      });

      test('Connection without region', function() {
        MockMobileOperator.mOperator = 'Orange';
        subject.update();
        var label_content = MockL10n.getAttributes(subject.element);
        assert.include(label_content.args.operator, 'Orange');
      });

      test('Connection with region', function() {
        MockMobileOperator.mOperator = 'Orange';
        MockMobileOperator.mRegion = 'PR';
        subject.update();
        var label_content = MockL10n.getAttributes(subject.element);
        assert.include(label_content.args.operator, 'Orange');
        assert.include(label_content.args.operator, 'PR');
      });
    });

    suite('multiple sims', function() {
      test('Connection without region', function() {
        MockMobileOperator.mOperator = 'Orange';
        subject.update();
        var label_content = MockL10n.getAttributes(subject.element);
        assert.equal(undefined, label_content.args.operator);
      });

      test('Connection with region', function() {
        MockMobileOperator.mOperator = 'Orange';
        MockMobileOperator.mRegion = 'PR';
        subject.update();
        var label_content = MockL10n.getAttributes(subject.element);
        assert.equal(undefined, label_content.args.operator);
        assert.equal(undefined, label_content.args.operator);
      });
    });
  });
});
