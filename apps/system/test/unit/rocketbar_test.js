'use strict';

requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
mocha.globals(['Rocketbar']);

var mocksForRocketBar = new MocksHelper([
  'SettingsListener'
]).init();

suite('system/Rocketbar', function() {
  var stubById;
  var fakeEvt;
  var fakeElement;

  mocksForRocketBar.attachTestHelpers();
  setup(function(done) {
    fakeElement = document.createElement('div');
    fakeElement.style.cssText = 'height: 100px; display: block;';
    stubById = this.sinon.stub(document, 'getElementById')
                          .returns(fakeElement.cloneNode(true));
    requireApp('system/js/rocketbar.js', done);
  });

  teardown(function() {
    stubById.restore();
  });

  suite('render', function() {
    test('shown should be true', function() {
      Rocketbar.render();
      assert.equal(Rocketbar.shown, true);
      Rocketbar.hide();
    });

    test('only renders once', function() {
      var eventListenerStub = this.sinon.stub(window.document.body,
        'addEventListener');
      Rocketbar.render();
      Rocketbar.render();
      assert.isTrue(eventListenerStub.withArgs('keyboardchange').calledOnce);
      Rocketbar.hide();
    });

    test('resets the value', function() {
      Rocketbar.searchInput.value = 'foo';
      Rocketbar.render();
      assert.equal(Rocketbar.searchInput.value, '');
      Rocketbar.hide();
    });

    test('fires the rocketbarshown event', function() {
      var called = false;
      window.addEventListener('rocketbarshown', function() {
        called = true;
      });
      Rocketbar.render();
      assert.equal(called, true);
      Rocketbar.hide();
    });

    test('posts a message to clear', function() {
      var message;
      Rocketbar._port = {
        postMessage: function(msg) {
          message = msg;
        }
      };
      Rocketbar.render();
      assert.equal('clear', message.action);
      Rocketbar.hide();
    });

    test('loads the search app', function() {
      var searchAppStub = this.sinon.stub(Rocketbar, 'loadSearchApp')
                          .returns(true);
      Rocketbar.render();
      Rocketbar.searchBar.dispatchEvent(
        new CustomEvent('transitionend')
      );
      assert.equal(true, searchAppStub.calledWith());
      Rocketbar.hide();
      searchAppStub.restore();
    });
  });

  suite('hide', function() {
    test('shown should be false', function() {
      Rocketbar.render();
      Rocketbar.hide();
      assert.equal(Rocketbar.shown, false);
    });

    test('keyboardchange listener is removed', function() {
      var eventListenerStub = this.sinon.stub(window.document.body,
        'removeEventListener');
      Rocketbar.render();
      Rocketbar.hide();
      assert.isTrue(eventListenerStub.withArgs('keyboardchange').calledOnce);
    });

   test('blurs the input', function() {
      var inputBlurStub = this.sinon.stub(Rocketbar.searchInput, 'blur')
                          .returns(true);
      Rocketbar.render();
      Rocketbar.hide();
      assert.equal(true, inputBlurStub.calledWith());
      inputBlurStub.restore();
    });

    test('fires the rocketbarhidden event', function() {
      var called = false;
      window.addEventListener('rocketbarhidden', function() {
        called = true;
      });
      Rocketbar.render();
      Rocketbar.hide();
      assert.equal(called, true);
    });
  });
});
