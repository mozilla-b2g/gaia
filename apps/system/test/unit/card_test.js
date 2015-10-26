/* global AppWindow, Card, MocksHelper, MockPromise, Icon,
   TaskManagerUtils, SwipeToKillMotion */
'use strict';

require('/shared/js/sanitizer.js');
requireApp('system/test/unit/mock_app_window.js');
require('/shared/test/unit/mocks/mock_promise.js');
require('/shared/js/homescreens/icon.js');

var mocksForCard = new MocksHelper([
  'AppWindow'
]).init();

suite('system/Card', function() {

  function makeApp(config) {
    var appWindow = new AppWindow({
      launchTime: 4,
      title: config.title,
      name: config.name || 'dummyapp',
      manifest: {
        orientation: config.orientation || 'portrait-primary'
      },
      isPrivate: config.isPrivate,
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
    if (config.isBrowser) {
      appWindow.isBrowser = () => config.isBrowser;
    }
    return appWindow;
  }

  mocksForCard.attachTestHelpers();
  var mockManager;
  var cardsList;
  var iconDataURI = 'data:image/png;base64,abc+';
  var getIconPromise;

  suiteSetup(function(done) {
    cardsList = document.createElement('ul');
    cardsList.id = 'cards-list';
    document.body.appendChild(cardsList);

    requireApp('system/js/service.js');
    requireApp('system/js/base_ui.js');
    requireApp('system/js/task_manager_utils.js');
    requireApp('system/js/card.js', done);
  });

  setup(function() {
    getIconPromise = new MockPromise();
    this.sinon.stub(AppWindow.prototype, 'getSiteIconUrl')
                   .returns(getIconPromise);
    mockManager = {
      SWIPE_UP_THRESHOLD: 480/4,
      cardsList: cardsList
    };

    this.sinon.stub(Icon.prototype, 'renderBlob', function() {
      this.elem.style.backgroundImage = 'url(' + this.uri + ')';
    });
  });
  teardown(function() {
    cardsList.innerHTML = '';
    if (getIconPromise.then.called) {
      getIconPromise.mFulfillToValue({originalUrl: iconDataURI, blob: {}});
    }
  });

  suite('render > ', function() {

    test('does nothing when stayInvisible is set', function() {
      var card = new Card(makeApp({
        name: 'anyapp',
        title: 'sometitle'
      }), { stayInvisible: true });

      assert.equal(card.element.style.display, 'none');
      assert.equal(card.title, undefined);
    });

    test('adds browser class for browser windows', function(){
      var card = new Card(makeApp({
        name: 'browserapp',
        isBrowser: true,
        title: 'Page title'
      }));

      assert.ok(card.element.classList.contains('browser'),
               'has browser class');
      assert.equal(
        card.element.querySelector('.title').textContent,
        card.app.title);
      assert.ok(!card.element.classList.contains('.private'));
    });

    test('adds private class for private windows', function(){
      var card = new Card(makeApp({
        name: 'privatewindow',
        isBrowser: true,
        isPrivate: true
      }));

      assert.ok(card.element.classList.contains('private'));
    });

    test('calls loadAppIcon', function(){
      this.sinon.stub(TaskManagerUtils, 'loadAppIcon')
        .returns(Promise.resolve());

      var card = new Card(makeApp({ name: 'app' }));

      assert.ok(TaskManagerUtils.loadAppIcon.called);
      assert.equal(TaskManagerUtils.loadAppIcon.firstCall.args[0], card.app);
    });

    test('unkillable card', function(){
      var app = makeApp({
        name: 'privatewindow',
        isBrowser: true,
        isPrivate: true
      });
      app.attentionWindow = true; // makes the card unkillable
      var card = new Card(app);

      assert.equal(
        card.element.querySelector('.close-button').style.visibility,
        'hidden');
    });

    test('app security for browser windows', function() {
      var app = makeApp({
        name: 'browserwindow',
        isBrowser: true
      });
      app.getSSLState = () => 'broken';
      var card = new Card(app);

      assert.equal(card.element.dataset.ssl, 'broken');
    });

    test('browser windows display URL in their subTitle', function() {
      var app = makeApp({
        name: 'browserwindow',
        isBrowser: true
      });
      app.config.url = 'https://someorigin.org/foo';
      var card = new Card(app);
      this.sinon.stub(TaskManagerUtils, 'getDisplayUrlForApp')
        .returns('someorigin.org/foo');

      assert.ok(card.element.classList.contains('show-subtitle'));
      assert.equal(
        card.element.querySelector('.subtitle-url').textContent,
        'someorigin.org/foo');
    });

  });

});

suite('system/SwipeToKillMotion', function() {
  var motion, el, setTranslateY;
  var currentY;

  setup(function() {
    el = document.createElement('div');
    setTranslateY = this.sinon.stub();
    currentY = 0;
    motion = new SwipeToKillMotion(el, {
      setTranslateY(newY) {
        currentY = newY;
        setTranslateY(currentY);
      }
    });
  });

  teardown(function() {

  });

  function touch(subtype, x, y) {
    var evt = new CustomEvent('touch' + subtype);
    evt.touches = evt.targetTouches = [];
    if (arguments.length > 1) {
      evt.touches.push({
        clientX: x, clientY: y
      });
    }
    return evt;
  }

  test('swipe up to kill', function() {
    var dropStub = this.sinon.stub();
    var willDragStub = this.sinon.stub();
    el.addEventListener('card-dropped', dropStub);
    el.addEventListener('card-will-drag', willDragStub);

    motion.el.dispatchEvent(touch('start', 0, 0));
    motion.el.dispatchEvent(touch('move', 0, -10));
    assert.isTrue(motion.activelyDragging);
    assert.equal(currentY, '-10px');
    motion.el.dispatchEvent(touch('move', 0, -20));
    motion.el.dispatchEvent(touch('move', 0, -30));
    motion.el.dispatchEvent(touch('move', 0, -40));
    motion.el.dispatchEvent(touch('end'));
    assert.isFalse(motion.activelyDragging);

    assert.equal(currentY, '-200%');
    assert.isTrue(dropStub.calledOnce);
    assert.isTrue(dropStub.firstCall.args[0].detail.willKill);
    assert.isTrue(willDragStub.calledOnce);
  });

  test('swipe up but without enough velocity', function() {
    var dropStub = this.sinon.stub();
    el.addEventListener('card-dropped', dropStub);

    motion.el.dispatchEvent(touch('start', 0, 0));
    motion.el.dispatchEvent(touch('move', 0, -10));
    motion.el.dispatchEvent(touch('move', 0, -20));
    motion.el.dispatchEvent(touch('move', 0, -20));
    motion.el.dispatchEvent(touch('move', 0, -10));
    motion.el.dispatchEvent(touch('end'));

    assert.equal(currentY, '0px');
    assert.isTrue(dropStub.calledOnce);
    assert.isFalse(dropStub.firstCall.args[0].detail.willKill);
  });

  test('touch events are intercepted by the card', function() {
    var touchEvent = touch('start', 0, 0);
    this.sinon.spy(touchEvent, 'stopPropagation');
    motion.el.dispatchEvent(touchEvent);
    assert.isTrue(touchEvent.stopPropagation.called);
  });

  test('swipe up, but event canceled', function() {
    var dropStub = this.sinon.stub();
    el.addEventListener('card-will-drag', (evt) => {
      evt.preventDefault();
    });

    motion.el.dispatchEvent(touch('start', 0, 0));
    motion.el.dispatchEvent(touch('move', 0, -10));
    assert.equal(currentY, '0px');
    motion.el.dispatchEvent(touch('move', 0, -20));
    motion.el.dispatchEvent(touch('move', 0, -30));
    motion.el.dispatchEvent(touch('move', 0, -40));
    motion.el.dispatchEvent(touch('end'));

    assert.equal(currentY, '0px');
    assert.isFalse(dropStub.calledOnce); // no drop event expected
  });

  test('click while dragging should be ignored', function() {
    motion.el.dispatchEvent(touch('start', 0, 0));
    motion.el.dispatchEvent(touch('move', 0, -10));
    motion.el.dispatchEvent(touch('move', 0, -20));
    motion.el.dispatchEvent(touch('move', 0, -30));

    var click = new CustomEvent('click', { cancelable: true });
    this.sinon.spy(click, 'stopPropagation');
    motion.el.dispatchEvent(click);
    assert.isTrue(click.defaultPrevented);
    assert.isTrue(click.stopPropagation.called);
  });

});
