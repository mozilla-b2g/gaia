/*global MessageManager,
         MocksHelper,
         Navigation,
         LazyLoader,
         ThreadListUI
*/

'use strict';

require('/js/event_dispatcher.js');
require('/shared/js/usertiming.js');

require('/test/unit/mock_message_manager.js');
require('/test/unit/mock_navigation.js');
require('/test/unit/mock_thread_list_ui.js');

require('/shared/test/unit/mocks/mock_lazy_loader.js');

var mocksHelper = new MocksHelper([
  'MessageManager',
  'LazyLoader',
  'Navigation',
  'ThreadListUI'
]).init();

suite('Startup >', function() {
  mocksHelper.attachTestHelpers();

  suiteSetup(function(done) {
    sinon.stub(window, 'addEventListener');
    require('/js/startup.js', done);
  });

  setup(function() {
    this.sinon.stub(window, 'dispatchEvent');
    this.sinon.stub(window, 'removeEventListener');
    this.sinon.stub(LazyLoader, 'load');
    this.sinon.stub(MessageManager, 'init');
    this.sinon.stub(Navigation, 'init');
    this.sinon.stub(ThreadListUI, 'init');
    this.sinon.stub(ThreadListUI, 'renderThreads');
  });

  test('lazy loads scripts only once first page of threads is rendered',
    function() {
    window.addEventListener.withArgs('DOMContentLoaded').yield();

    sinon.assert.callOrder(
      MessageManager.init,
      Navigation.init,
      ThreadListUI.init,
      ThreadListUI.renderThreads
    );
    sinon.assert.notCalled(LazyLoader.load);

    // First page of threads loaded
    ThreadListUI.renderThreads.callArg(0);

    sinon.assert.called(LazyLoader.load);
  });

  test('lazy loads scripts immediately if first panel is not thread list',
    function() {
    this.sinon.stub(Navigation, 'getPanelName').returns('composer');
    window.addEventListener.withArgs('DOMContentLoaded').yield();

    sinon.assert.callOrder(
      LazyLoader.load,
      MessageManager.init,
      Navigation.init,
      ThreadListUI.init,
      ThreadListUI.renderThreads
    );

    // Since we've already run lazy loading we don't need to do anything once
    // first page is loaded, so no need in corresponding callback.
    sinon.assert.calledWith(
      ThreadListUI.renderThreads, undefined, sinon.match.func
    );
    sinon.assert.calledOnce(LazyLoader.load);
  });
});
