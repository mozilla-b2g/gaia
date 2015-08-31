/*global InboxView,
         InterInstanceEventDispatcher,
         LazyLoader,
         MessageManager,
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
require('/views/shared/test/unit/mock_inbox.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/services/test/unit/mock_message_manager.js');

require('/views/inbox/js/startup.js');

var MocksHelperForInboxStartup = new MocksHelper([
  'InboxView',
  'InterInstanceEventDispatcher',
  'LazyLoader',
  'MessageManager',
  'Navigation',
  'Settings',
  'TimeHeaders'
]).init();

suite('InboxView Startup', function() {
  MocksHelperForInboxStartup.attachTestHelpers();

  setup(function() {
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

    Startup.init();
  });

  test('correctly initializes dependencies', function() {
    sinon.assert.calledOnce(MessageManager.init);
    sinon.assert.calledOnce(Navigation.init);
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
});
