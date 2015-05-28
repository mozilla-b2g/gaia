/*global ConversationView,
         Information,
         InterInstanceEventDispatcher,
         LazyLoader,
         LocalizationHelper,
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
require('/views/shared/test/unit/mock_conversation.js');
require('/views/shared/test/unit/mock_information.js');
require('/views/shared/test/unit/mock_localization_helper.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
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
  'Navigation',
  'TimeHeaders',
  'Settings',
  'Utils'
]).init();

suite('ConversationView Startup', function() {
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
    this.sinon.spy(Navigation, 'toDefaultPanel');
    this.sinon.spy(InterInstanceEventDispatcher, 'connect');
    this.sinon.stub(ConversationView, 'once');
    this.sinon.stub(LazyLoader, 'load').returns(Promise.resolve());
    this.sinon.stub(MessageManager, 'getThreads');

    var gaiaHeader = document.createElement('gaia-header');
    gaiaHeader.setAttribute('no-font-fit', '');
    document.body.appendChild(gaiaHeader);

    Startup.init();
  });

  test('correctly initializes dependencies', function(done) {
    sinon.assert.calledOnce(MessageManager.init);
    sinon.assert.calledOnce(Navigation.init);
    sinon.assert.calledOnce(ConversationView.init);

    window.location.hash = 'param1=1&param2=2';

    // Workaround to deal with temporary shim code.
    MessageManager.getThreads.lastCall.args[0].done();
    Promise.resolve().then(() => {
      sinon.assert.calledWithExactly(
        Navigation.toDefaultPanel,
        Utils.params('#param1=1&param2=2')
      );
    }).then(done, done);
  });

  test('starts non-critical initializations only once view is visually ready',
  function() {
    // Lazy loading is not started yet and headers are not processed either.
    sinon.assert.notCalled(LazyLoader.load);
    assert.isTrue(
      document.querySelectorAll('gaia-header[no-font-fit]').length > 0
    );

    ConversationView.once.withArgs('visually-loaded').yield();

    sinon.assert.calledOnce(LazyLoader.load);
    assert.isTrue(
      document.querySelectorAll('gaia-header[no-font-fit]').length === 0
    );
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
