/*global bridge,
         BroadcastChannel,
         MozSettingsClient,
         MocksHelper
*/

'use strict';

require('/services/test/unit/mock_bridge.js');
require('/views/shared/test/unit/mock_broadcast_channel.js');
require('/services/js/moz_settings/moz_settings_client.js');

var MocksHelperForAttachment = new MocksHelper([
  'bridge',
  'BroadcastChannel'
]).init();

suite('MozSettingsClient >', function() {
  var clientStub;
  var APP_INSTANCE_ID = 'fake-id';

  MocksHelperForAttachment.attachTestHelpers();

  setup(function() {
    clientStub = sinon.stub({
      method: () => {}
    });

    this.sinon.stub(bridge, 'client').returns(clientStub);
  });

  suite('init', function() {
    test('throws if app instance id is not provided', function() {
      assert.throws(() => MozSettingsClient.init());
    });

    test('client is initialized', function() {
      MozSettingsClient.init(APP_INSTANCE_ID);

      sinon.assert.calledWith(bridge.client, {
        service: 'moz-settings-shim',
        endpoint: sinon.match.instanceOf(BroadcastChannel).and(
          sinon.match.has(
            'name',
            'moz-settings-shim-channel-' + APP_INSTANCE_ID
          )
        ),
        timeout: false
      });
    });
  });

  suite('mmsSizeLimitation method', function() {
    var key = 'dom.mms.operatorSizeLimitation';
    var size;

    setup(function() {
      MozSettingsClient.init(APP_INSTANCE_ID);
    });

    test('client method is called and returns valid number', function() {
      size = 1024;

      clientStub.method.withArgs('get', key).returns(Promise.resolve(size));
      MozSettingsClient.mmsSizeLimitation().then((limit) => {
        sinon.assert.calledWithMatch(
          clientStub.method,
          'get',
          key
        );

        assert.equal(limit, size);
      });
    });

    test('client method is called and returns invalid number', function() {
      var size = 'invalid';

      clientStub.method.withArgs('get', key).returns(Promise.resolve(size));
      MozSettingsClient.mmsSizeLimitation().then((limit) => {
        sinon.assert.calledWithMatch(
          clientStub.method,
          'get',
          key
        );

        assert.equal(limit, 295 * 1024);
      });
    });
  });

  suite('maxConcatenatedMessages method', function() {
    var key = 'operatorResource.sms.maxConcat';
    var length;

    setup(function() {
      MozSettingsClient.init(APP_INSTANCE_ID);
    });

    test('client method is called and returns valid number', function() {
      length = 5;

      clientStub.method.withArgs('get', key).returns(Promise.resolve(length));
      MozSettingsClient.maxConcatenatedMessages().then((limit) => {
        sinon.assert.calledWithMatch(
          clientStub.method,
          'get',
          key
        );

        assert.equal(limit, length);
      });
    });

    test('client method is called and returns invalid number', function() {
      var length = 'invalid';

      clientStub.method.withArgs('get', key).returns(Promise.resolve(length));
      MozSettingsClient.maxConcatenatedMessages().then((limit) => {
        sinon.assert.calledWithMatch(
          clientStub.method,
          'get',
          key
        );

        assert.equal(limit, 10);
      });
    });
  });
});
