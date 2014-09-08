'use strict';

/* globals MocksHelper, MockLinkHtml, ImageLoader, UIEvent */

require('/shared/js/contacts/utilities/image_loader.js');

requireApp('contacts/test/unit/mock_link.html.js');
require('/shared/test/unit/mocks/mock_image.js');

var mocksHelperForImageLoader = new MocksHelper([
  'Image'
]).init();

suite('Image Loader Test Suite >', function() {

  var mocksHelper = mocksHelperForImageLoader;
  var imageSpy, imgLoader;
  mocksHelper.attachTestHelpers();

  setup(function() {
    imageSpy = this.sinon.spy(window, 'Image');
  });

  suite('imgsLoading balance >', function() {

    var stopSpy, item;

    suiteSetup(function() {
      document.body.innerHTML = MockLinkHtml;
      item = document.querySelector('#friends-list');
      imgLoader = new ImageLoader('#mainContent',
                                  '.block-item:not([data-uuid="#uid#"])');
    });

    setup(function() {
      stopSpy = this.sinon.spy(window, 'stop');
    });

    suiteTeardown(function() {
      imgLoader.destroy();
    });

    function simulateImageCallback(evt) {
      imgLoader.defaultLoad(item);
      imageSpy.lastCall.thisValue.triggerEvent(evt);
    }

    function dispatchScroll() {
      var event = new UIEvent('scroll', {
        view: window,
        detail: 0
      });
      document.querySelector('#mainContent').dispatchEvent(event);
    }

    test('defaultLoadImage calls new Image()', function() {
      imgLoader.defaultLoad(item);
      sinon.assert.calledOnce(imageSpy);
    });

    test('item marked as visited', function() {
      simulateImageCallback('onload');
      assert.equal('true', item.dataset.visited);

      simulateImageCallback('onabort');
      assert.equal('false', item.dataset.visited);

      simulateImageCallback('onerror');
      assert.equal('false', item.dataset.visited);
    });

    test('window.stop() not called without scroll event', function() {
      simulateImageCallback('onload');
      sinon.assert.callCount(stopSpy, 0);

      simulateImageCallback('onabort');
      sinon.assert.callCount(stopSpy, 0);

      simulateImageCallback('onerror');
      sinon.assert.callCount(stopSpy, 0);
    });

    test('window.stop() called with one pending request', function() {
      imgLoader.defaultLoad(item);
      dispatchScroll();
      sinon.assert.callCount(stopSpy, 1);
    });

    test('window.stop() not called after onload', function() {
      imgLoader.defaultLoad(item);
      imageSpy.lastCall.thisValue.triggerEvent('onload');
      dispatchScroll();
      sinon.assert.callCount(stopSpy, 0);
    });

    test('window.stop() not called after onabort and onerror', function() {
      imgLoader.defaultLoad(item);
      imageSpy.lastCall.thisValue.triggerEvent('onabort');
      dispatchScroll();
      sinon.assert.callCount(stopSpy, 0);

      imgLoader.defaultLoad(item);
      imageSpy.lastCall.thisValue.triggerEvent('onerror');
      dispatchScroll();
      sinon.assert.callCount(stopSpy, 0);
    });

    test('window.stop() not called after onload and onerror', function() {
      imgLoader.defaultLoad(item);
      imageSpy.lastCall.thisValue.triggerEvent('onload');
      imgLoader.defaultLoad(item);
      imageSpy.lastCall.thisValue.triggerEvent('onerror');
      dispatchScroll();
      sinon.assert.callCount(stopSpy, 0);
    });

    test('image loader not called anymore after unloading', function() {
      var containerSpy = this.sinon.spy(document.querySelector('#mainContent'),
                                       'removeEventListener');
      var documentSpy = this.sinon.spy(document, 'removeEventListener');
      imgLoader.defaultLoad(item);
      imgLoader.unload();
      sinon.assert.callCount(documentSpy, 1);
      sinon.assert.callCount(containerSpy, 1);
      documentSpy.restore();
      containerSpy.restore();
    });

    test('image loader not called anymore after pausing', function() {
      var containerSpy = this.sinon.spy(document.querySelector('#mainContent'),
                                       'removeEventListener');
      var documentSpy = this.sinon.spy(document, 'removeEventListener');
      imgLoader.defaultLoad(item);
      window.dispatchEvent(new CustomEvent('image-loader-pause'));
      sinon.assert.callCount(documentSpy, 1);
      sinon.assert.callCount(containerSpy, 1);
      documentSpy.restore();
      containerSpy.restore();
    });

  });

  suite('imgsLoader resuming >', function() {

    suiteSetup(function() {
      document.body.innerHTML =
        '<ol>' +
          '<li><span data-type="img" data-src="http://www.a.com"></span></li>' +
        '</ol>';
      imgLoader = new ImageLoader('ol', 'li');
    });

    suiteTeardown(function() {
      imgLoader.destroy();
    });

    test('resuming calls new Image()', function() {
      window.dispatchEvent(new CustomEvent('image-loader-resume'));
      sinon.assert.calledOnce(imageSpy);
    });

  });

});
