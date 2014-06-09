/* global AppWindow, MocksHelper, TaskCard */
'use strict';

requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_trusted_ui_manager.js');

var mocksForCard = new MocksHelper([
  'AppWindow',
  'TrustedUIManager'
]).init();

suite('system/TaskCard', function() {

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
    attentionScreenApps: [],
    useAppScreenshotPreviews: true,
    cardsList: document.getElementById('cards-list')
  };

  suiteSetup(function(done) {
    requireApp('system/js/system.js');
    requireApp('system/js/base_ui.js');
    requireApp('system/js/cards_helper.js');
    requireApp('system/js/card.js');
    requireApp('system/js/task_card.js', done);
  });

  suite('render > ', function() {
    suiteSetup(function(){
      this.card = new TaskCard({
        app: makeApp({ name: 'dummyapp' }),
        manager: mockManager
      });
      this.enterTMStub = sinon.stub(this.card.app, 'enterTaskManager');
      this.leaveTMStub = sinon.stub(this.card.app, 'leaveTaskManager');
      this.card.render();
    });
    suiteTeardown(function() {
      this.enterTMStub.restore();
      this.leaveTMStub.restore();
    });

    test('exposes expected element properties', function(){
      var card = this.card;
      assert.ok(card.element, 'element node');
      assert.equal(card.element.tagName, 'LI');
      assert.ok(card.headerContent, 'headerContent node');
      assert.ok(card.footerContent, 'footerContent node');
      assert.ok(card.footerMenu, 'footerMenu node');
    });

    test('has expected classes/elements', function(){
      var card = this.card;
      assert.ok(card.element.classList.contains, '.card');
      assert.ok(card.element.querySelector('.close-button'), '.close-button');
      assert.ok(card.element.querySelector('.favorite-button'),
                                           '.favorite-button');
      assert.ok(card.element.querySelector('h1'), 'h1');
    });

    test('enter/leaveTaskManager', function(){
      this.card.destroy();
      assert.isTrue(this.enterTMStub.calledOnce,
                    'enterTaskManager called once');
      assert.isTrue(this.leaveTMStub.calledOnce,
                    'leaveTaskManager called once');
    });
  });
  suite('applyStyle > ', function() {
    setup(function() {
      this.card = new TaskCard({
        app: makeApp({ name: 'dummyapp' }),
        _windowWidth: 320,
        _windowHeight: 480,
        manager: mockManager
      });
      this.card.render();
      this.stub = sinon.stub(this.card.app, 'applyStyle');
    });

    test('only scale the appWindow', function() {
      var card = this.card;
      card.applyStyle({ MozTransform: 'scale(0.3)' });

      assert.equal(card.element.style.MozTransform.indexOf('scale'), -1,
                    'no scale transform on the card element');
      var applyStyleCall = this.stub.getCall(0);
      assert.ok(applyStyleCall.args[0].MozTransform.contains('scale'),
                    'scale transform on the appWindow element');
      this.stub.reset();
    });
    test('only vertically shift the appWindow', function() {
      var card = this.card;
      this.card.applyStyle({
        MozTransform: 'translateY(100%) translateX(50px)'
      });
      assert.equal(card.element.style.MozTransform.indexOf('translateY'), -1,
                    'no translateY transform on the card element');
      var applyStyleCall = this.stub.getCall(0);
      assert.ok(applyStyleCall.args[0].MozTransform.contains('translateY'),
                    'translateY transform on the appWindow element');
      assert.ok(card.element.style.MozTransform.contains('translateX'),
                    'translateX transform on the card element');
      assert.ok(applyStyleCall.args[0].MozTransform.contains('translateX'),
                    'translateX transform on the appWindow element');
    });
    test('dont change zIndex on the appWindow', function() {
      var card = this.card;
      this.card.applyStyle({ zIndex: '123' });
      assert.equal(card.element.style.zIndex, '123',
                  'zIndex set on the card element');
      assert.ok(!card.app.element.style.zIndex,
                'no zIndex property on the appWindow element');
    });
  });

});
