/*global bridge,
         BroadcastChannel,
         MockMozMobileConnections,
         MocksHelper,
         MozMobileConnectionsShim,
         MozSettingsShim
*/

'use strict';

require('/services/test/unit/mock_bridge.js');
require('/services/test/unit/mock_moz_mobile_connections.js');
require('/services/test/unit/moz_settings/mock_moz_settings_shim.js');
require('/views/shared/test/unit/mock_broadcast_channel.js');
require('/services/js/bridge_service_mixin.js');
require('/services/js/moz_mobile_connections/moz_mobile_connections_shim.js');

var MocksHelperForAttachment = new MocksHelper([
  'bridge',
  'BroadcastChannel',
  'MozMobileConnections',
  'MozSettingsShim'
]).init();

suite('MozMobileConnectionsShim >', function() {
  var serviceStub;

  const APP_ID = 'fake-app-id';

  MocksHelperForAttachment.attachTestHelpers();

  suiteSetup(function() {
    serviceStub = sinon.stub({
      method: () => {},
      listen: () => {}
    });

    sinon.spy(window, 'BroadcastChannel');
    sinon.stub(bridge, 'service').returns(serviceStub);
  });

  setup(function() {
    MozMobileConnectionsShim.init(APP_ID, MockMozMobileConnections);
  });

  test('bridge service is correctly initialized', function() {
    sinon.assert.calledOnce(bridge.service);
    sinon.assert.calledWith(bridge.service, 'moz-mobile-connections-shim');
    sinon.assert.calledTwice(serviceStub.listen);
    sinon.assert.calledWith(
      serviceStub.listen,
      sinon.match.instanceOf(BroadcastChannel)
    );

    sinon.assert.calledWith(
      BroadcastChannel,
      'moz-mobile-connections-shim-channel-' + APP_ID
    );
  });

  suite('methods for wrapping up API', function() {
    suite('getServiceIdByIccId', function() {
      test('returns the correct id', function() {
        assert.equal(MozMobileConnectionsShim.getServiceIdByIccId('SIM 1'), 0);
        assert.equal(MozMobileConnectionsShim.getServiceIdByIccId('SIM 2'), 1);
        assert.isNull(MozMobileConnectionsShim.getServiceIdByIccId('SIM 3'));
      });
    });

    suite('switchMmsSimHandler', function() {
      setup(function() {
        this.sinon.stub(MozSettingsShim, 'set');
      });

      test('serviceId is null', function(done) {
        MozMobileConnectionsShim.switchMmsSimHandler('SIM 3').then(() => {
          throw new Error('Resolve should not be called');
        }, (err) => {
          assert.equal(err, 'NoSimCardError');
        }).then(done, done);
      });

      test('mozMobileConnection is already registered', function(done) {
        MockMozMobileConnections[0].data.state = 'registered';

        MozMobileConnectionsShim.switchMmsSimHandler('SIM 1').then(() => {
          // No need to set the default serviceId
          sinon.assert.notCalled(MozSettingsShim.set);
        }).then(done, done);
      });

      test('switch sim and return when state is ready', function(done) {
        this.sinon.stub(MockMozMobileConnections[0], 'addEventListener');
        this.sinon.stub(MockMozMobileConnections[0], 'removeEventListener');
        MockMozMobileConnections[0].data.state = 'searching';

        MozMobileConnectionsShim.switchMmsSimHandler('SIM 1').then(() => {
          sinon.assert.calledWith(MozSettingsShim.set, {
            'ril.mms.defaultServiceId': 0,
            'ril.data.defaultServiceId': 0
          });
          sinon.assert.called(MockMozMobileConnections[0].removeEventListener);
        }).then(done, done);

        // Change target connection state to registered and invoke the event
        MockMozMobileConnections[0].data.state = 'registered';
        MockMozMobileConnections[0].addEventListener.yield();
      });
    });
  });
});
