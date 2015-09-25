'use strict';

suite('ApnEditorSession', function() {
  var map = {
    '*': {
      'panels/apn_editor/apn_editor_const': 'MockApnEditorConst',
      'modules/apn/apn_settings_manager': 'MockApnSettingsManager'
    }
  };

  var modules = [
    'panels/apn_editor/apn_editor_session',
    'MockApnEditorConst',
    'MockApnSettingsManager'
  ];

  suiteSetup(function(done) {
    var requireCtx = testRequire([], map, function() {});

    define('MockApnSettingsManager', function() {
      return {
        addApn: function(serviceId, apnSetting) {
          return;
        }
      };
    }.bind(this));

    define('MockApnEditorConst', function() {
      return {
        APN_PROPERTIES: [
          'apn', 'user', 'password', 'proxy', 'port',
          'mmsc', 'mmsproxy', 'mmsport', 'authtype','types',
          'protocol', 'roaming_protocol', 'mtu'
        ],
        VALUE_CONVERTERS: {
          'TO_STRING': {
            'types': function(types) {
              if (types && Array.isArray(types) && types.length) {
                return types.join(', ');
              } else {
                return 'default';
              }
            }
          },
          'TO_DATA': {
            'types': function(string) {
              return string.split(',').map((str) => str.trim());
            }
          }
        }
      };
    });

    requireCtx(modules,
      function(ApnEditorSession, MockApnEditorConst, MockApnSettingsManager) {
        this.ApnEditorSession = ApnEditorSession;
        this.MockApnEditorConst = MockApnEditorConst;
        this.MockApnSettingsManager = MockApnSettingsManager;
        done();
    }.bind(this));
  });

  suite('commit', function() {
    setup(function() {
      this.spyAddApn = this.sinon.spy(this.MockApnSettingsManager, 'addApn');
      this.inputElements = {
        apn: { value: 'TestApn' },
        user: { value: 'Test Name' }
      };
      this.apnEditorSession = this.ApnEditorSession(
        'id12345', 'new', this.inputElements);
    });

    test('a new APN with one APN Type', function() {
      this.inputElements.types = { value: 'default' };
      this.apnEditorSession.commit();

      assert(this.spyAddApn.calledWith(
        'id12345', 
        { apn: 'TestApn', types: ['default'], user: 'Test Name' }
      ), 'not calling with the correct arguments');
    });

    test('new APNs with three APN Types', function() {
      this.inputElements.types = { value: 'default,mms,supl' };
      this.apnEditorSession.commit();

      assert(this.spyAddApn.callCount === 3);
      assert(this.spyAddApn.getCall(0).calledWith(
        'id12345', { apn: 'TestApn', types: ['default'], user: 'Test Name' }
      ), '1st time not calling with the correct arguments');
      assert(this.spyAddApn.getCall(1).calledWith(
        'id12345', { apn: 'TestApn', types: ['mms'], user: 'Test Name' }
      ), '2nd time not calling with the correct arguments');
      assert(this.spyAddApn.getCall(2).calledWith(
        'id12345', { apn: 'TestApn', types: ['supl'], user: 'Test Name' }
      ), '3rd time not calling with the correct arguments');
    });

    teardown(function() {
      this.spyAddApn.reset();
    });

  });
});
