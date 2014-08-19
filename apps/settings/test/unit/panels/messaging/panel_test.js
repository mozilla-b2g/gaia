'use strict';

suite('Messaging panel', function() {
  var mockSettingsPanel;
  var mockSIMSlotManager;
  var mockMessaging;
  var messagingPanel;

  var modules = [
    'panels/messaging/panel',
    'shared_mocks/mock_simslot_manager',
    'shared_mocks/mock_mobile_operator',
    'unit/mock_messaging',
    'unit/mock_settings_panel',
    'unit/mock_settings_service'
  ];

  var map = {
    '*': {
      'shared/simslot_manager': 'shared_mocks/mock_simslot_manager',
      'shared/mobile_operator': 'shared_mocks/mock_mobile_operator',
      'modules/messaging': 'unit/mock_messaging',
      'modules/settings_panel': 'unit/mock_settings_panel',
      'modules/settings_service': 'unit/mock_settings_service'
    }
  };

  setup(function(done) {
    testRequire(modules, map, function(MessagingPanel, MockSIMSlotManager,
      MockMobileOperator, MockMessaging, MockSettingsPanel,
      MockSettingsService) {
        mockMessaging = MockMessaging;
        mockSIMSlotManager = MockSIMSlotManager;
        mockSettingsPanel = MockSettingsPanel;
        mockSettingsPanel.mInnerFunction = function(options) {
          var obj = {};
          for (var key in options) {
            obj[key] = options[key];
          }
          return obj;
        };
        messagingPanel = MessagingPanel();
        done();
    });
  });

  suite('onInit', function() {
    var fakePanel = document.createElement('div');

    suite('when DSDS', function() {
      setup(function() {
        this.sinon.stub(mockSIMSlotManager, 'isMultiSIM').returns(true);
        this.sinon.stub(mockMessaging, 'injectCBSTemplate');
      });

      test('do nothing', function(done) {
        Promise.resolve(messagingPanel.onInit(fakePanel))
        .then(function() {
          assert.isFalse(mockMessaging.injectCBSTemplate.called);
        }).then(done, done);
      });
    });

    suite('when single SIM', function() {
      setup(function() {
        this.sinon.stub(mockSIMSlotManager, 'isMultiSIM').returns(false);
        this.sinon.stub(mockMessaging, 'injectCBSTemplate');
        this.sinon.stub(mockMessaging.initCBS, 'bind');
        this.sinon.stub(mockMessaging.disableItems, 'bind');
        this.sinon.stub(messagingPanel._updateSmsc, 'bind');
        this.sinon.stub(messagingPanel, '_initDeliveryReportSettings');
      });

      test('do following operations', function(done) {
        Promise.resolve(messagingPanel.onInit(fakePanel))
        .then(function() {
          assert.isTrue(mockMessaging.injectCBSTemplate.called);
          assert.isTrue(mockMessaging.initCBS.bind.calledWith(
            mockMessaging, fakePanel, 0));
          assert.isTrue(mockMessaging.disableItems.bind.calledWith(
            mockMessaging, fakePanel));
          assert.isTrue(messagingPanel._updateSmsc.bind.calledWith(
            null, 0));
          assert.isTrue(messagingPanel._initDeliveryReportSettings.called);
        }).then(done, done);
      });
    });
  });

  suite('onBeforeShow', function() {
    var fakePanel = document.createElement('div');

    setup(function() {
      this.sinon.stub(mockSIMSlotManager, 'isMultiSIM').returns(true);
      this.sinon.stub(mockMessaging.disableItems, 'bind');
      this.sinon.stub(messagingPanel, '_showDsds');
      this.sinon.stub(messagingPanel, '_initDeliveryReportSettings');
      this.sinon.stub(messagingPanel._initCarrierNames, 'bind');
      this.sinon.stub(messagingPanel._bindSimcardsClickEvent, 'bind');
    });

    test('will do following operations', function(done) {
      Promise.resolve(messagingPanel.onBeforeShow(fakePanel))
      .then(function() {
        assert.isTrue(mockMessaging.disableItems.bind.calledWith(
          mockMessaging, fakePanel));
        assert.isTrue(messagingPanel._showDsds.called);
        assert.isTrue(messagingPanel._initDeliveryReportSettings.called);
        assert.isTrue(messagingPanel._initCarrierNames.bind.called);
        assert.isTrue(messagingPanel._bindSimcardsClickEvent.bind.called);
      }).then(done, done);
    });
  });
});
