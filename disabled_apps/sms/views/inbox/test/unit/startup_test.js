/*global App,
         ConversationClient,
         Drafts,
         InboxView,
         InterInstanceEventDispatcher,
         LazyLoader,
         MessageManager,
         MocksHelper,
         Navigation,
         Settings,
         Startup,
         TimeHeaders,
         Utils
*/

'use strict';

require('/views/shared/test/unit/mock_time_headers.js');
require('/views/shared/test/unit/mock_navigation.js');
require('/views/shared/test/unit/mock_settings.js');
require('/views/shared/test/unit/mock_inter_instance_event_dispatcher.js');
require('/views/shared/test/unit/mock_inbox.js');
require('/views/shared/test/unit/mock_app.js');
require('/views/shared/js/utils.js');
require('/views/shared/test/unit/mock_utils.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/services/test/unit/mock_message_manager.js');
require('/services/test/unit/mock_drafts.js');
require('/services/test/unit/conversation/mock_conversation_client.js');

require('/views/inbox/js/startup.js');

var MocksHelperForInboxStartup = new MocksHelper([
  'App',
  'ConversationClient',
  'Drafts',
  'InboxView',
  'InterInstanceEventDispatcher',
  'LazyLoader',
  'MessageManager',
  'Navigation',
  'Settings',
  'TimeHeaders',
  'Utils'
]).init();

suite('InboxView Startup', function() {
  MocksHelperForInboxStartup.attachTestHelpers();

  setup(function() {
    this.sinon.spy(App, 'setReady');
    this.sinon.spy(MessageManager, 'init');
    this.sinon.spy(Navigation, 'init');
    this.sinon.spy(InboxView, 'init');
    this.sinon.spy(InboxView, 'renderThreads');
    this.sinon.spy(TimeHeaders, 'init');
    this.sinon.spy(Settings, 'init');
    this.sinon.spy(Navigation, 'setReady');
    this.sinon.spy(InterInstanceEventDispatcher, 'connect');
    this.sinon.stub(InboxView, 'once');
    this.sinon.stub(LazyLoader, 'load').returns(Promise.resolve());
    this.sinon.stub(ConversationClient, 'init');
    this.sinon.spy(Utils, 'initializeShimHost');
    this.sinon.stub(Drafts, 'init');

    Startup.init();
  });

  test('correctly initializes dependencies', function() {
    sinon.assert.calledWith(Utils.initializeShimHost, App.instanceId);
    sinon.assert.calledWith(ConversationClient.init, App.instanceId);
    sinon.assert.calledOnce(MessageManager.init);
    sinon.assert.calledOnce(Navigation.init);
    sinon.assert.calledOnce(Drafts.init);
    sinon.assert.calledOnce(InboxView.init);
    sinon.assert.calledOnce(InboxView.renderThreads);
  });

  test('starts non-critical initializations only once view is visually ready',
  function() {
    // Lazy loading is not started yet and headers are not processed either.
    sinon.assert.notCalled(LazyLoader.load);

    InboxView.once.withArgs('visually-loaded').yield();

    sinon.assert.calledOnce(LazyLoader.load);
  });

  test('correctly initializes lazy dependencies', function(done) {
    InboxView.once.withArgs('visually-loaded').yield();

    LazyLoader.load.lastCall.returnValue.then(() => {
      sinon.assert.calledOnce(TimeHeaders.init);
      sinon.assert.calledOnce(Settings.init);
      sinon.assert.calledOnce(Navigation.setReady);
      sinon.assert.calledOnce(InterInstanceEventDispatcher.connect);
    }).then(done, done);
  });

  test('app is marked as ready only on fully loaded', function() {
    InboxView.once.withArgs('visually-loaded').yield();

    sinon.assert.notCalled(App.setReady);

    InboxView.once.withArgs('fully-loaded').yield();

    sinon.assert.calledOnce(App.setReady);
  });
});
