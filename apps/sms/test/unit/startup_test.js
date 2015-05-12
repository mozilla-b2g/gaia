/*global MessageManager,
         MocksHelper,
         Navigation,
         LazyLoader,
         ThreadListUI,
         App
*/

'use strict';

require('/js/event_dispatcher.js');
require('/js/app.js');

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
  var container, originalMozHasPendingMessage;

  mocksHelper.attachTestHelpers();

  suiteSetup(function(done) {
    originalMozHasPendingMessage = navigator.mozHasPendingMessage;
    navigator.mozHasPendingMessage = () => {};

    sinon.stub(window, 'addEventListener');
    require('/js/startup.js', done);
  });

  suiteTeardown(function() {
    navigator.mozHasPendingMessage = originalMozHasPendingMessage;
    window.addEventListener.restore();
  });

  setup(function() {
    this.sinon.stub(window, 'dispatchEvent');
    this.sinon.stub(window, 'removeEventListener');
    this.sinon.stub(navigator, 'mozHasPendingMessage').returns(false);
    this.sinon.stub(LazyLoader, 'load').returns(Promise.reject());
    this.sinon.stub(MessageManager, 'init');
    this.sinon.stub(Navigation, 'init');
    this.sinon.stub(ThreadListUI, 'init');
    this.sinon.spy(ThreadListUI, 'renderThreads');
    this.sinon.stub(Navigation, 'on');
    this.sinon.stub(Navigation, 'off');
    this.sinon.stub(Navigation, 'isDefaultPanel');
    this.sinon.spy(Navigation, 'toDefaultPanel');
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
    Navigation.isDefaultPanel.returns(true);

    window.addEventListener.withArgs('DOMContentLoaded').yield();

    // Render threads immediately
    sinon.assert.callOrder(
      MessageManager.init,
      Navigation.init,
      Navigation.toDefaultPanel,
      ThreadListUI.init,
      ThreadListUI.renderThreads
    );
    sinon.assert.notCalled(LazyLoader.load);
    assert.isTrue(
      container.querySelector('gaia-header').hasAttribute('no-font-fit'),
      '<gaia-header> elements are not initialized yet'
    );

    // First page of threads loaded
    ThreadListUI.renderThreads.callArg(0);

    // Lazy load the rest of scripts only once first page of threads is loaded
    sinon.assert.called(LazyLoader.load);

    assert.isFalse(
      container.querySelector('gaia-header').hasAttribute('no-font-fit'),
      '<gaia-header> elements are initialized'
    );
  });

  test('if first panel is not default one', function(done) {
    Navigation.isDefaultPanel.returns(false);

    window.addEventListener.withArgs('DOMContentLoaded').yield();

    sinon.assert.callOrder(
      MessageManager.init,
      Navigation.init,
      LazyLoader.load
    );
    sinon.assert.notCalled(Navigation.toDefaultPanel);
    sinon.assert.notCalled(ThreadListUI.init);
    sinon.assert.notCalled(ThreadListUI.renderThreads);

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

    sinon.assert.callOrder(ThreadListUI.init, ThreadListUI.renderThreads);

    // Since we've already run lazy loading we don't need to do anything once
    // first page is loaded, so no need in corresponding callback.
    sinon.assert.calledWith(ThreadListUI.renderThreads, undefined);

    // App is marked is ready only when all threads are loaded
    sinon.assert.notCalled(App.setReady);
    ThreadListUI.renderThreads.lastCall.returnValue.then(() => {
      sinon.assert.calledOnce(App.setReady);
    }).then(done, done);
  });

  test('if has pending "notification" system message', function(done) {
    Navigation.isDefaultPanel.returns(true);
    navigator.mozHasPendingMessage.withArgs('notification').returns(true);

    window.addEventListener.withArgs('DOMContentLoaded').yield();

    sinon.assert.callOrder(
      MessageManager.init,
      Navigation.init,
      LazyLoader.load
    );
    sinon.assert.notCalled(Navigation.toDefaultPanel);
    sinon.assert.notCalled(ThreadListUI.init);
    sinon.assert.notCalled(ThreadListUI.renderThreads);

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

    sinon.assert.callOrder(ThreadListUI.init, ThreadListUI.renderThreads);

    // Since we've already run lazy loading we don't need to do anything once
    // first page is loaded, so no need in corresponding callback.
    sinon.assert.calledWith(ThreadListUI.renderThreads, undefined);

    // App is marked is ready only when all threads are loaded
    sinon.assert.notCalled(App.setReady);
    ThreadListUI.renderThreads.lastCall.returnValue.then(() => {
      sinon.assert.calledOnce(App.setReady);
    }).then(done, done);
  });
});
