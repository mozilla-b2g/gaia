/* global LockScreenConnectionStatesSIMWidget */
'use strict';

requireApp('system/lockscreen/js/stream/process.js');
requireApp('system/lockscreen/js/stream/stream.js');
requireApp('system/lockscreen/js/component/lockscreen_basic_component.js');
requireApp('system/lockscreen/js/widgets/connection_states/' +
    'lockscreen_connection_states_widget.js');
requireApp('system/lockscreen/js/widgets/connection_states/' +
    'lockscreen_connection_states_sim_widget.js');

suite('LockScreenConnectionStatesSIMWidget> ', function() {
  setup(function() {
  });

  test(`fetch service ID would fetch it`,
  function() {
    var stubGet = this.sinon.spy(function(key) {
      return {
        then: function(cb) {
          cb('fakeID');
        }
      };
    });
    var method = LockScreenConnectionStatesSIMWidget
      .prototype.fetchTelephonyServiceId;
    var mockThis = {
      resources: {
        telephonyDefaultServiceId: ''
      },
      _settingsCache: {
        get: stubGet
      }
    };
    method.call(mockThis);
    assert.isTrue(stubGet.calledWith('ril.telephony.defaultServiceId'));
    assert.equal('fakeID', mockThis.resources.telephonyDefaultServiceId);
  });
});
