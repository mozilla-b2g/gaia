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
    var fakeMcc = 123;

    setup(function() {
      realMobileOperator = window.MobileOperator;
      window.navigator.mozMobileConnections[0].voice = {
        network: {
          mcc: fakeMcc
        }
      };
      window.MobileOperator = {
        BRAZIL_MCC:
          window.navigator.mozMobileConnections[0].voice.network.mcc,
        BRAZIL_CELLBROADCAST_CHANNEL: fakeMessageID
      };
    });

    teardown(function() {
      window.MobileOperator = realMobileOperator;
    });

    test('and if it\'s Brazil mcc, will send out event', function(done) {
      window.addEventListener('cellbroadcastmsgchanged', function cb() {
        window.removeEventListener('cellbroadcastmsgchanged', cb);
        done();
      });
      subject.show({
        message: {
          messageId: fakeMessageID,
          body: {}
        },
        serviceId: 0,
      });
    });

    test('return while message is CMAS', function() {
      this.sinon.stub(CarrierInfoNotifier, 'show');

      subject.show({
        message: {
          messageId: 4370,
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
