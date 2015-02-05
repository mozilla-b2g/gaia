/* global AppWindow, Card, MocksHelper, CardsHelper */
'use strict';

require('/shared/js/tagged.js');
requireApp('system/test/unit/mock_app_window.js');

var mocksForCard = new MocksHelper([
  'AppWindow'
]).init();

suite('system/Card', function() {

  function makeApp(config) {
    return new AppWindow({
      launchTime: 4,
      name: config.name || 'dummyapp',
      frame: document.createElement('div'),
      iframe: document.createElement('iframe'),
      manifest: {
        orientation: config.orientation || 'portrait-primary'
      },
      rotatingDegree: config.rotatingDegree || 0,
      requestScreenshotURL: function() {
        return null;
      },
      getScreenshot: function(callback) {
        callback();
      },
      origin: config.origin || 'http://' +
              (config.name || 'dummyapp') + '.gaiamobile.org',
      blur: function() {}
    });
  }

  mocksForCard.attachTestHelpers();
  var mockManager = {
    useAppScreenshotPreviews: true
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
    });

    test('has expected aria values', function(){
      var card = this.card;

      assert.equal(card.screenshotView.getAttribute('role'), 'link');
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

  suite('orientation >', function() {
    var cards = {};
    var orientationDegrees = {
      'landscape-primary' : 90,
      'portrait-primary' : 0,
      'portrait-secondary' : 270,
      'landscape-secondary' : 180
    };
    suiteSetup(function() {
      for (var orientation in orientationDegrees) {
        cards[orientation] = new Card({
          manager: mockManager,
          app: makeApp({
            'orientation': orientation,
            'rotatingDegree': orientationDegrees[orientation]
          })
        });
      }
    });

    teardown(function() {
      this.cards = null;
    });

    function testForCardOrientation(orientation) {
      return function() {
        var card = cards[orientation];
        card.render();
        var orientationNode = card.screenshotView;

        card.element.dispatchEvent(new CustomEvent('onviewport'));
        assert.isTrue(
          orientationNode.classList.contains(
            'rotate-'+orientationDegrees[orientation]
          ),'corrent orientation in classList');
      };
    }

    test('cardsview defines a landscape-primary app',
         testForCardOrientation('landscape-primary')
    );
    test('cardsview defines a landscape-secondary app',
         testForCardOrientation('landscape-secondary')
    );
    test('cardsview defines a portrait app in portrait-primary',
         testForCardOrientation('portrait-primary')
    );
    test('cardsview defines a portrait-secondary app',
         testForCardOrientation('portrait-secondary')
    );
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

  suite('move > ', function() {
    var realIW;
    suiteSetup(function() {
      realIW = window.innerWidth;
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        get: function() { return 320; }
      });
    });

    suiteTeardown(function() {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        get: function() { return realIW; }
      });
    });

    setup(function(){
      this.card = new Card({
        app: makeApp({ name: 'dummyapp' }),
        manager: mockManager
      });
      this.card.render();
      this.card.position = 0;
      this.card.manager.position = 0;
    });

    test('should apply a transform', function() {
      this.card.move(100, 0);
      var style = this.card.element.style;
      var expected = 'translateX(100px)';
      assert.equal(style.transform, expected);
    });

    test('but trick gecko by always keeping it barely in the viewport',
    function() {
      this.card.move(400, 0);
      var style = this.card.element.style;
      var expected = 'translateX(236.799px)';
      assert.equal(style.transform, expected);

      var dataset = this.card.element.dataset;
      assert.equal(dataset.positionX, 400);
      assert.equal(dataset.keepLayerDelta, 163.201);
    });
  });
});
