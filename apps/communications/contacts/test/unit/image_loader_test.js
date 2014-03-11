'use strict';

/* globals MocksHelper, MockLinkHtml, ImageLoader, UIEvent */

requireApp('communications/contacts/test/unit/mock_link.html.js');
requireApp('communications/contacts/test/unit/mock_image.js');
requireApp('communications/contacts/js/utilities/image_loader.js');

var mocksHelperForImageLoader = new MocksHelper([
  'Image'
]).init();

suite('Image Loader Test Suite >', function() {

  var imgLoader, item;
  var mocksHelper = mocksHelperForImageLoader;

  suiteSetup(function() {
    mocksHelper.suiteSetup();

    document.body.innerHTML = MockLinkHtml;
    item = document.querySelector('#friends-list');
    imgLoader = new ImageLoader('#mainContent',
                                '.block-item:not([data-uuid="#uid#"])');
  });

  suiteTeardown(function() {
    mocksHelper.suiteTeardown();
  });

  suite('imgsLoading balance >', function() {

    var imageSpy, stopSpy;

    setup(function() {
      imageSpy = this.sinon.spy(window, 'Image');
      stopSpy = this.sinon.spy(window, 'stop');
      mocksHelper.setup();
    });

    teardown(function() {
      mocksHelper.teardown();
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

  });

});
