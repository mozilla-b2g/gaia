/*global MessageManager,
         MocksHelper,
         Navigation,
         LazyLoader,
         InboxView,
         App
*/

'use strict';

require('/shared/js/event_dispatcher.js');
require('/views/shared/js/app.js');

require('/services/test/unit/mock_message_manager.js');
require('/views/shared/test/unit/mock_navigation.js');
require('/views/shared/test/unit/mock_inbox.js');

require('/shared/test/unit/mocks/mock_lazy_loader.js');

var mocksHelper = new MocksHelper([
  'MessageManager',
  'LazyLoader',
  'Navigation',
  'InboxView'
]).init();

suite('Startup >', function() {
  var container;

  mocksHelper.attachTestHelpers();

  suiteSetup(function(done) {
    sinon.stub(window, 'addEventListener');
    require('/views/shared/js/startup.js', done);
  });

  suiteTeardown(function() {
    window.addEventListener.restore();
  });

  setup(function() {
    this.sinon.stub(window, 'dispatchEvent');
    this.sinon.stub(window, 'removeEventListener');
    this.sinon.stub(LazyLoader, 'load').returns(Promise.reject());
    this.sinon.stub(MessageManager, 'init');
    this.sinon.stub(Navigation, 'init');
    this.sinon.stub(InboxView, 'init');
    this.sinon.spy(InboxView, 'renderThreads');
    this.sinon.stub(Navigation, 'on');
    this.sinon.stub(Navigation, 'off');
    this.sinon.stub(App, 'setReady');

    container = document.createElement('div');
    container.innerHTML = `
      <gaia-header no-font-fit></gaia-header>
    `;
    document.body.appendChild(container);
  });

  teardown(function() {
    container.remove();
  });

  test('if target panel is default one', function() {
    window.addEventListener.withArgs('DOMContentLoaded').yield();

    // Render threads immediately
    sinon.assert.callOrder(
      MessageManager.init,
      Navigation.init,
      InboxView.init,
      InboxView.renderThreads
    );
    sinon.assert.notCalled(LazyLoader.load);
    assert.isTrue(
      container.querySelector('gaia-header').hasAttribute('no-font-fit'),
      '<gaia-header> elements are not initialized yet'
    );

    // First page of threads loaded
    InboxView.renderThreads.callArg(0);

    // Lazy load the rest of scripts only once first page of threads is loaded
    sinon.assert.called(LazyLoader.load);

    assert.isFalse(
      container.querySelector('gaia-header').hasAttribute('no-font-fit'),
      '<gaia-header> elements are initialized'
    );
  });

  test('if first panel is not default one', function(done) {
    this.sinon.stub(Navigation, 'getPanelName').returns('composer');
    window.addEventListener.withArgs('DOMContentLoaded').yield();

    sinon.assert.callOrder(
      MessageManager.init,
      Navigation.init,
      LazyLoader.load
    );
    sinon.assert.notCalled(InboxView.init);
    sinon.assert.notCalled(InboxView.renderThreads);

    sinon.assert.calledOnce(LazyLoader.load);

    assert.isFalse(
      container.querySelector('gaia-header').hasAttribute('no-font-fit'),
      '<gaia-header> elements are initialized'
    );

    // Threads should start rendering only once target panel is ready
    Navigation.on.withArgs('navigated').yield();

    // We should listen only for the first "navigated" event
    var onNavigatedHandler =
      Navigation.on.withArgs('navigated').getCall(0).args[1];
    sinon.assert.calledWith(Navigation.off, 'navigated', onNavigatedHandler);

    sinon.assert.callOrder(InboxView.init, InboxView.renderThreads);

    // Since we've already run lazy loading we don't need to do anything once
    // first page is loaded, so no need in corresponding callback.
    sinon.assert.calledWith(InboxView.renderThreads, undefined);

    // App is marked is ready only when all threads are loaded
    sinon.assert.notCalled(App.setReady);
    InboxView.renderThreads.lastCall.returnValue.then(() => {
      sinon.assert.calledOnce(App.setReady);
    }).then(done, done);
  });
});
