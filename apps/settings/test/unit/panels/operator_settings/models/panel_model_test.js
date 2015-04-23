'use strict';

suite('PanelModel', function() {
  var PanelModel;
  var mockConn;
  var mockHardwareSupportMode = {};

  var realGetSupportedNetworkInfo;
  var realMozMobileConnections;

  var panelModel;

  var modules = [
    'panels/operator_settings/models/panel_model'
  ];

  setup(function(done) {
    mockConn = {
      voice: {
        type: 'gsm'
      },
      addEventListener: sinon.stub()
    };
    realMozMobileConnections = navigator.mozMobileConnections;
    navigator.mozMobileConnections = [mockConn];

    realGetSupportedNetworkInfo = window.getSupportedNetworkInfo;
    window.getSupportedNetworkInfo = function(conn, callback) {
      callback(mockHardwareSupportMode);
    };

    testRequire(modules, (_PanelModel) => {
      PanelModel = _PanelModel;
      panelModel = PanelModel(mockConn);
      done();
    });
  });

  teardown(function() {
    window.getSupportedNetworkInfo = realGetSupportedNetworkInfo;
    navigator.mozMobileConnections = realMozMobileConnections;
  });

  suite('_hardwareSupportedMode', function() {
    suite('should be gsm', function() {
      ['gsm', 'wcdma', 'lte'].forEach(function(type) {
        test(type, function() {
          mockHardwareSupportMode = {
            [type]: true
          };
          panelModel = PanelModel(mockConn);
          assert.equal(panelModel._hardwareSupportedMode, 'gsm');
        });
      });
    });

    suite('should be cdma', function() {
      ['evdo', 'cdma'].forEach(function(type) {
        test(type, function() {
          mockHardwareSupportMode = {
            [type]: true
          };
          panelModel = PanelModel(mockConn);
          assert.equal(panelModel._hardwareSupportedMode, 'cdma');
        });
      });
    });
  });

  suite('_voiceType', function() {
    var mockVoiceType = 'mockVoiceType';

    test('should be the type reported from mobile connection', function() {
      mockConn.voice.type = mockVoiceType;
      panelModel = PanelModel(mockConn);
      assert.equal(panelModel._voiceType, mockVoiceType);
    });

    test('_voiceType should change when mobile connection emits voicechange',
      function() {
        mockConn.voice.type = mockVoiceType;
        mockConn.addEventListener.args[0][1]();
        assert.equal(panelModel._voiceType, mockVoiceType);
    });
  });

  suite('connectingMode', function() {
    suite('when voice type is available', function() {
      ['gprs', 'edge', 'umts', 'hsdpa', 'hsupa',
       'hspa', 'hspa+', 'lte', 'gsm'].forEach(function(type) {
        test(type, function() {
          panelModel._voiceType = type;
          assert.equal(panelModel.connectingMode, 'gsm');
        });
      });

      ['is95a', 'is95b', '1xrtt', 'evdo0',
       'evdoa', 'evdob', 'ehrpd'].forEach(function(type) {
        test(type, function() {
          panelModel._voiceType = type;
          assert.equal(panelModel.connectingMode, 'cdma');
        });
      });
    });

    suite('when voice type is unavailable', function() {
      ['gsm', 'wcdma', 'lte'].forEach(function(type) {
        test(type, function() {
          mockHardwareSupportMode = {
            [type]: true
          };
          panelModel = PanelModel(mockConn);
          panelModel._voiceType = null;
          assert.equal(panelModel.connectingMode, 'gsm');
        });
      });

      ['evdo', 'cdma'].forEach(function(type) {
        test(type, function() {
          mockHardwareSupportMode = {
            [type]: true
          };
          panelModel = PanelModel(mockConn);
          panelModel._voiceType = null;
          assert.equal(panelModel.connectingMode, 'cdma');
        });
      });
    });
  });
});
