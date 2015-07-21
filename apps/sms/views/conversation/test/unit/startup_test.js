/*global ConversationView,
         Information,
         InterInstanceEventDispatcher,
         LazyLoader,
         LocalizationHelper,
         MessageManager,
         MessagingClient,
         MocksHelper,
         Navigation,
         Settings,
         Startup,
         TimeHeaders
*/

'use strict';

require('/views/shared/test/unit/mock_time_headers.js');
require('/views/shared/test/unit/mock_navigation.js');
require('/views/shared/test/unit/mock_settings.js');
require('/views/shared/test/unit/mock_inter_instance_event_dispatcher.js');
require('/views/shared/test/unit/mock_conversation.js');
require('/views/shared/test/unit/mock_information.js');
require('/views/shared/test/unit/mock_localization_helper.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/services/test/unit/messaging/mock_messaging_client.js');
require('/services/test/unit/mock_message_manager.js');
require('/views/shared/js/utils.js');
require('/views/shared/test/unit/mock_utils.js');

require('/views/conversation/js/startup.js');

var MocksHelperForInboxStartup = new MocksHelper([
  'ConversationView',
  'Information',
  'InterInstanceEventDispatcher',
  'LazyLoader',
  'LocalizationHelper',
  'MessageManager',
  'MessagingClient',
  'Navigation',
  'TimeHeaders',
  'Settings',
  'Utils'
]).init();

suite('ConversationView Startup,', function() {
  MocksHelperForInboxStartup.attachTestHelpers();

  setup(function() {
    this.sinon.spy(MessageManager, 'init');
    this.sinon.spy(Navigation, 'init');
    this.sinon.spy(ConversationView, 'init');
    this.sinon.spy(LocalizationHelper, 'init');
    this.sinon.spy(Information, 'initDefaultViews');
    this.sinon.spy(TimeHeaders, 'init');
    this.sinon.spy(Settings, 'init');
    this.sinon.spy(Navigation, 'setReady');
    this.sinon.spy(InterInstanceEventDispatcher, 'connect');
    this.sinon.stub(ConversationView, 'once');
    this.sinon.stub(LazyLoader, 'load').returns(Promise.resolve());
    this.sinon.stub(MessageManager, 'getThreads');
    this.sinon.stub(Navigation, 'isDefaultPanel');
    this.sinon.spy(MessagingClient, 'init');
  });

  suite('In default panel,', function() {
    setup(function() {
      Navigation.isDefaultPanel.returns(true);

      Startup.init();
    });

    test('correctly initializes dependencies', function(done) {
      sinon.assert.calledOnce(MessageManager.init);
      sinon.assert.calledOnce(ConversationView.init);

      // Workaround to deal with temporary shim code.
      MessageManager.getThreads.lastCall.args[0].done();
      Promise.resolve().then(
        () => sinon.assert.calledOnce(Navigation.init)
      ).then(done, done);
    });

    test('starts non-critical initializations only once view is visually ready',
    function() {
      // Lazy loading is not started yet and headers are not processed either.
      sinon.assert.notCalled(LazyLoader.load);

      ConversationView.once.withArgs('visually-loaded').yield();

      sinon.assert.calledOnce(LazyLoader.load);
    });

    test('correctly initializes lazy dependencies', function(done) {
      ConversationView.once.withArgs('visually-loaded').yield();

      LazyLoader.load.lastCall.returnValue.then(() => {
        sinon.assert.calledOnce(LocalizationHelper.init);
        sinon.assert.calledOnce(TimeHeaders.init);
        sinon.assert.calledOnce(Settings.init);
        sinon.assert.calledOnce(Navigation.setReady);
        sinon.assert.calledOnce(Information.initDefaultViews);
        sinon.assert.calledOnce(InterInstanceEventDispatcher.connect);
      }).then(done, done);
    });
  });

  suite('In a subpanel,', function() {
    setup(function() {
      Navigation.isDefaultPanel.returns(false);

      Startup.init();
    });

    test('correctly initializes dependencies', function(done) {
      sinon.assert.calledOnce(MessageManager.init);
      sinon.assert.calledOnce(ConversationView.init);

      // Workaround to deal with temporary shim code.
      MessageManager.getThreads.lastCall.args[0].done();
      Promise.resolve().then(
        () => sinon.assert.calledOnce(Navigation.init)
      ).then(done, done);
    });

    test('starts non-critical initializations right away', function() {
      sinon.assert.notCalled(ConversationView.once);
      sinon.assert.calledOnce(LazyLoader.load);
    });

    test('correctly initializes lazy dependencies', function(done) {
      LazyLoader.load.lastCall.returnValue.then(() => {
        sinon.assert.calledOnce(LocalizationHelper.init);
        sinon.assert.calledOnce(TimeHeaders.init);
        sinon.assert.calledOnce(Settings.init);
        sinon.assert.calledOnce(Navigation.setReady);
        sinon.assert.calledOnce(Information.initDefaultViews);
        sinon.assert.calledOnce(InterInstanceEventDispatcher.connect);
      }).then(done, done);
    });
  });
});
