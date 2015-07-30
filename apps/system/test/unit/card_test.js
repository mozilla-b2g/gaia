/* global AppWindow, Card, MocksHelper, CardsHelper */
'use strict';

require('/shared/js/sanitizer.js');
requireApp('system/test/unit/mock_app_window.js');

var mocksForCard = new MocksHelper([
  'AppWindow'
]).init();

suite('system/Card', function() {

  function createTouchEvent(type, target, x, y) {
    var touch = document.createTouch(window, target, 1, x, y, x, y);
    var touchList = document.createTouchList(touch);

    var evt = document.createEvent('TouchEvent');
    evt.initTouchEvent(type, true, true, window,
                       0, false, false, false, false,
                       touchList, touchList, touchList);
    return evt;
  }

  function makeApp(config) {
    var appWindow = new AppWindow({
      launchTime: 4,
      name: config.name || 'dummyapp',
      manifest: {
        orientation: config.orientation || 'portrait-primary'
      },
      rotatingDegree: config.rotatingDegree || 0,
      getScreenshot: function(callback) {
        callback();
      },
      origin: config.origin || 'app://' +
              (config.name || 'dummyapp') + '.gaiamobile.org',
      url: config.url,
      blur: function() {}
    });
    appWindow.browser.element.src = appWindow.origin + '/index.html';
    return appWindow;
  }

  mocksForCard.attachTestHelpers();
  var mockManager = {
    useAppScreenshotPreviews: true,
    SWIPE_UP_THRESHOLD: 480/4
  };
  var cardsList;

  suiteSetup(function(done) {
    cardsList = document.createElement('ul');
    cardsList.id = 'cards-list';
    document.body.appendChild(cardsList);
    mockManager.cardsList = cardsList;

    requireApp('system/js/service.js');
    requireApp('system/js/base_ui.js');
    requireApp('system/js/cards_helper.js');
    requireApp('system/js/card.js', done);
  });

  suite('render > ', function() {
    suiteSetup(function(){
      this.card = new Card({
        app: makeApp({ name: 'dummyapp' }),
        manager: mockManager
      });
      this.card.render();
    });

    test('card instance properties', function() {
      // sanity check properties expected to be exposed on the instance
      assert.isDefined(this.card.app);
      assert.isDefined(this.card.instanceID);
      assert.isDefined(this.card.title);
      assert.isDefined(this.card.subTitle);
      assert.isDefined(this.card.iconValue);
      assert.isDefined(this.card.sslState);
      assert.isDefined(this.card.viewClassList);
      assert.isDefined(this.card.titleId);
      assert.isDefined(this.card.closeButtonVisibility);
      assert.isDefined(this.card.favoriteButtonVisibility);
    });

    test('exposes expected element properties', function(){
      var card = this.card;
      assert.ok(card.element, 'element node');
      assert.equal(card.element.tagName, 'LI');
      assert.ok(card.screenshotView, 'screenshotView node');
      assert.ok(card.titleNode, 'title node');
      assert.ok(card.titleId, 'title id');
      assert.ok(card.iconButton, 'iconButton');
    });

    test('has expected classes/elements', function(){
      var card = this.card;
      var header = card.element.querySelector('h1');
      assert.ok(card.element.classList.contains, '.card');
      assert.isFalse(card.element.classList.contains('browser'),
                     'no browser class for non-browser windows');
      assert.ok(card.element.querySelector('.close-button'), '.close-button');
      assert.ok(card.element.querySelector('.screenshotView'),
                '.screenshotView');
      assert.ok(header, 'h1');
      assert.ok(header.id, 'h1.id');
      assert.isFalse(card.element.classList.contains('show-subtitle'),
                     'no show-subtitle by default');
    });

    test('has expected aria values', function(){
      var card = this.card;

      assert.equal(card.screenshotView.getAttribute('role'), 'link');
      assert.equal(card.element.getAttribute('role'), 'presentation');
      assert.strictEqual(card.iconButton.getAttribute('aria-hidden'), 'true');
    });

    test('adds browser class for browser windows', function(){
      var app = makeApp({ name: 'browserwindow' });
      this.sinon.stub(app, 'isBrowser', function() {
        return true;
      });
      var card = new Card({
        app: app,
        manager: mockManager
      });
      card.render();
      assert.ok(card.element.classList.contains('browser'),
               'has browser class');
    });

    test('browser app title', function() {
      var browserCard = new Card({
        app: makeApp({ name: 'browserwindow' }),
        manager: mockManager
      });
      browserCard.app.title = 'Page title';
      this.sinon.stub(browserCard.app, 'isBrowser', function() {
        return true;
      });
      browserCard.render();
      assert.equal(browserCard.titleNode.textContent, 'Page title');
    });

    test('adds private class for private windows', function(){
      var app = makeApp({ name: 'privatewindow' });
      app.isPrivate = true;
      var card = new Card({
        app: app,
        manager: mockManager
      });
      card.render();
      assert.ok(card.element.classList.contains('private'),
               'has private class');
    });

    test('app name', function() {
      var appCard = new Card({
        app: makeApp({ name: 'otherapp' }),
        manager: mockManager
      });
      appCard.app.title = 'Some title';
      this.sinon.stub(appCard.app, 'isBrowser', function() {
        return false;
      });
      appCard.render();
      assert.equal(appCard.titleNode.textContent, 'otherapp');
    });

    test('app security for browser windows', function() {
      var browserCard = new Card({
        app: makeApp({ name: 'browserwindow' }),
        manager: mockManager
      });
      browserCard.app.title = 'Page title';
      this.sinon.stub(browserCard.app, 'isBrowser', function() {
        return true;
      });
      this.sinon.stub(browserCard.app, 'getSSLState', function() {
        return 'broken';
      });
      browserCard.render();
      assert.isTrue(browserCard.app.getSSLState.calledOnce);
      assert.equal(browserCard.sslState, 'broken');
      assert.equal(browserCard.element.dataset.ssl, 'broken');
    });
    test('browser windows display URL in their subTitle', function() {
      var browserCard = new Card({
        app: makeApp({ name: 'browserwindow' }),
        manager: mockManager
      });
      browserCard.app.config.url = 'https://someorigin.org/foo';
      this.sinon.stub(browserCard, 'getDisplayURLString', function() {
        return 'someorigin.org/foo';
      });
      this.sinon.stub(browserCard.app, 'isBrowser', function() {
        return true;
      });
      browserCard.render();
      assert.ok(browserCard.element.classList.contains('show-subtitle'),
                'show-subtitle class added');
      assert.equal(browserCard.subTitle, 'someorigin.org/foo');
    });
    test('getDisplayURLString', function() {
      var browserCard = new Card({
        app: makeApp({ name: 'browserwindow' }),
        manager: mockManager
      });
      assert.equal(browserCard.getDisplayURLString('foo'), 'foo');
      assert.equal(browserCard.getDisplayURLString('about:blank'),
                   'about:blank');
      assert.equal(
        browserCard.getDisplayURLString('http://foo.com:8080/bar?bazz#boss'),
        'foo.com:8080/bar?bazz#boss'
      );
    });

    test('subTitle when private browser splash', function() {
      var app = makeApp({
        name: 'shortname',
        origin: 'app://system.gaiamobile.org',
        url: 'app://system.gaiamobile.org/private_browser.html'
      });
      this.sinon.stub(app, 'isBrowser').returns(true);
      var appCard = new Card({
        app: app,
        manager: mockManager
      });
      appCard.render();
      assert.equal(appCard.subTitle, '');
      assert.isFalse(appCard.element.classList.contains('show-subtitle'));
    });
  });

  suite('destroy', function() {
    setup(function(){
      this.card = new Card({
        app: makeApp({ name: 'dummyapp' }),
        manager: mockManager,
        containerElement: mockManager.cardsList
      });
      this.card.render();
    });
    teardown(function() {
      mockManager.cardsList.innerHTML = '';
    });

    test('removes element from parentNode', function() {
      var cardNode = this.card.element;
      assert.ok(cardNode.parentNode, 'cardNode has parentNode when rendered');
      this.card.destroy();
      assert.ok(!cardNode.parentNode, 'cardNode has no parentNode');
      assert.equal(cardsList.childNodes.length, 0, 'cardsList has no children');
    });

    test('cleans up references', function() {
      this.card.destroy();
      assert.ok(!this.card.manager, 'card.manager reference is falsey');
      assert.ok(!this.card.app, 'card.app reference is falsey');
      assert.ok(!this.card.element, 'card.element reference is falsey');
    });
  });

  suite('Unkillable card', function() {
    setup(function(){
      this.cardNode = document.createElement('li');
      var app = makeApp({ name: 'dummyapp' });
      app.attentionWindow = true;
      this.card = new Card({
        app: app,
        manager: mockManager,
        containerElement: mockManager.cardsList,
        element: this.cardNode
      });
      this.card.render();
    });
    teardown(function() {
      mockManager.cardsList.innerHTML = '';
    });

    test('card whose app has attentionWindow should not be closed', function() {
      assert.equal(this.card.closeButtonVisibility, 'hidden');
    });
  });

  suite('killApp >', function() {
    setup(function() {
      this.card = new Card({
        app: makeApp({ name: 'dummyapp' }),
        manager: mockManager
      });
      this.card.render();
    });
    test('kills app', function() {
      var card = this.card;
      this.sinon.stub(card.app, 'kill');
      card.killApp();
      assert.ok(card.app.kill.calledOnce, 'kill was called');
    });
    test('stops event listeners', function() {
      var card = this.card;
      this.sinon.stub(card, 'handleEvent');
      card.killApp();
      var touchStartEvt = createTouchEvent('touchstart',
                                           card.element, 100, 100);
      card.element.dispatchEvent(touchStartEvt);
      assert.equal(card.handleEvent.callCount, 0, 'handleEvent not called');
    });
  });

  suite('previews > ', function() {
    suiteSetup(function(){
      this.getIconStub = sinon.stub(CardsHelper, 'getIconURIForApp',
                                    function() {
        return 1;
      });
      this.card = new Card({
        app: makeApp({ name: 'dummyapp' }),
        manager: mockManager
      });
      this.card.render();
    });
    suiteTeardown(function() {
      this.getIconStub.restore();
    });

    test('card using screenshots doesnt show icon', function() {
      var card = this.card;
      var manager = card.manager;
      manager.useAppScreenshotPreviews = true;
      card.element.dispatchEvent(new CustomEvent('onviewport'));

      assert.isFalse(card.element.classList.contains('appIconPreview'),
                    'card doesnt have appIconPreview class');
    });

    test('card with screenshots disabled shows icon', function() {
      var mockManager = {
        useAppScreenshotPreviews: false
      };

      var card = new Card({
        app: makeApp({ name: 'dummyapp-icons' }),
        manager: mockManager
      });
      card.render();

      assert.isTrue(card.element.classList.contains('appIconPreview'),
                    'card has appIconPreview class');

      var iconView = card.element.querySelector('.appIconView');
      assert.ok(iconView.style.backgroundImage.indexOf('url') > -1,
                '.appIconView element has backgroundImage value');
    });
  });

  suite('events > ', function() {
    setup(function(){
      this.card = new Card({
        app: makeApp({ name: 'dummyapp' }),
        manager: mockManager
      });
      this.card.render();
    });
    test('touch', function() {
      var card = this.card,
          element = this.card.element,
          yOffset;
      this.sinon.spy(card, 'handleEvent');
      this.sinon.spy(card, 'onCrossSlide');
      var touchStartEvt = createTouchEvent('touchstart',
                                           element, 100, 100);
      element.dispatchEvent(touchStartEvt);
      assert.ok(card.handleEvent.calledOnce, 'touchstart handled');
      assert.ok(Array.isArray(card.startTouchPosition));
      card.handleEvent.reset();

      var touchMoveEvt = createTouchEvent('touchmove',
                                           element, 90, 10);
      card.element.dispatchEvent(touchMoveEvt);
      assert.ok(card.handleEvent.calledOnce, 'touchmove handled');
      assert.ok(card.deltaX, 'deltaX');
      assert.ok(card.deltaY, 'deltaY');
      assert.ok(card.onCrossSlide.calledOnce,
                'vertical touchmove called onCrossSlide');
      yOffset = card.element.style.transform
                    .replace(/translateY\(([^\)]+)\)/, '$1');
      assert.ok(yOffset && parseInt(yOffset) < 0,
                'transform: translateY is negative');
      card.handleEvent.reset();
      assert.equal(card.element.style.transition, 'transform 0s linear 0s');


      var touchEndEvt = createTouchEvent('touchend',
                                           element, 10, 10);
      card.element.dispatchEvent(touchEndEvt);
      assert.ok(card.handleEvent.calledOnce, 'touchend handled');
      yOffset = card.element.style.transform
                    .replace(/translateY\(([^\)]+)\)/, '$1');
      assert.ok(!yOffset || yOffset === '0px');
      assert.ok(!card.element.style.transition, 'transition is removed');
    });

  });
});
