'use strict';
/* global CellBroadcastSystem, MocksHelper, MockNavigatorMozMobileConnections,
          CarrierInfoNotifier
 */

requireApp('system/js/carrier_info_notifier.js');
requireApp('system/js/cell_broadcast_system.js');
require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
require('/shared/js/l10n.js');

var mocksForCBS = new MocksHelper([
  'NavigatorMozMobileConnections'
]).init();

suite('system/CellBroadcastSystem', function() {

  var subject;
  var realMozMobileConnections;

  mocksForCBS.attachTestHelpers();

  suiteSetup(function() {
    realMozMobileConnections = navigator.mozMobileConnections;
    navigator.mozMobileConnections = MockNavigatorMozMobileConnections;
  });

  suiteTeardown(function() {
    navigator.mozMobileConnections = realMozMobileConnections;
  });

  setup(function() {
    subject = new CellBroadcastSystem();
  });

  suite('settingsChangedHandler', function() {
    test('dispatches cellbroadcastmsgchanged event', function(done) {
      window.addEventListener('cellbroadcastmsgchanged', function cb() {
        window.removeEventListener('cellbroadcastmsgchanged', cb);
        done();
      });
      subject.settingsChangedHandler({
        settingValue: [true, true]
      });
    });
  });

  suite('show', function() {
    var realMobileOperator;
    var fakeMessageID = 0;
    var fakeMcc = [123, 456];

    setup(function() {
      this.sinon.stub(CarrierInfoNotifier, 'show');
      this.sinon.stub(window, 'dispatchEvent');
      [0, 1].forEach((id) => {
        var conn = new window.MockMobileconnection();
        conn.voice = {
          network: {
            mcc: fakeMcc[id]
          }
        };

        window.navigator.mozMobileConnections.mAddMobileConnection(conn, id);
      });

      realMobileOperator = window.MobileOperator;
      window.MobileOperator = {
        BRAZIL_MCC:
          window.navigator.mozMobileConnections[0].voice.network.mcc,
        BRAZIL_CELLBROADCAST_CHANNEL: fakeMessageID
      };
    });

    teardown(function() {
      window.MobileOperator = realMobileOperator;
    });

    test('if SIM1 is Brazil mcc, will send out event', function() {
      subject.show({
        message: {
          messageId: fakeMessageID,
          cdmaServiceCategory: null,
          body: {},
          serviceId: 0
        }
      });

      sinon.assert.called(window.dispatchEvent);
      sinon.assert.notCalled(CarrierInfoNotifier.show);
    });

    test('if SIM 2 is not Brazil mcc, will not send out event', function() {
      subject.show({
        message: {
          messageId: fakeMessageID,
          cdmaServiceCategory: null,
          body: {},
          serviceId: 1
        }
      });

      sinon.assert.notCalled(window.dispatchEvent);
      sinon.assert.called(CarrierInfoNotifier.show);
    });

    test('return while message is GSM CMAS', function() {
      subject.show({
        message: {
          messageId: 4370,
          cdmaServiceCategory: null,
          body: {}
        },
        serviceId: 0,
      });

      sinon.assert.notCalled(CarrierInfoNotifier.show);
    });

    test('return while message is CDMA CMAS', function() {
      subject.show({
        message: {
          messageId: 0,
          cdmaServiceCategory: 4096,
          body: {}
        },
        serviceId: 0,
      });

      sinon.assert.notCalled(CarrierInfoNotifier.show);
    });
  });

  suite('_hasCBSDisabled', function() {
    suite('with any disabled CBS item', function() {
      setup(function() {
        subject._settingsDisabled = [true, false];
      });

      test('we would get true', function() {
        assert.isTrue(subject._hasCBSDisabled());
      });
    });

    suite('without any disabled CBS item', function() {
      setup(function() {
        subject._settingsDisabled = [false, false];
      });

      test('we would get false', function() {
        assert.isFalse(subject._hasCBSDisabled());
      });
    });
  });
});
