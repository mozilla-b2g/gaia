/* globals TaskManagerUtils, MocksHelper, Service */

'use strict';

requireApp('system/js/task_manager_utils.js');

require('/shared/test/unit/mocks/mock_service.js');
require('/shared/js/event_safety.js');

suite('TaskManagerUtils >', function() {

  var mocks = new MocksHelper([
    'Service',
  ]).init();
  mocks.attachTestHelpers();

  test('getDisplayUrlForApp', function() {
    [
      // if the topmost frame contains an app, don't display the URL:
      { origin: 'http://example.com',
        frameSrc: 'app://someapp',
        expected: '' },
      // browser should show the URL without the protocol:
      { origin: 'http://google.com/',
        isBrowser: true,
        expected: 'google.com/' },
      { origin: 'https://foo.com:8080/bar?bazz#boss',
        isBrowser: true,
        expected: 'foo.com:8080/bar?bazz#boss' },
      { origin: 'app://system.gaiamobile.org/private_browser.html',
        isBrowser: true,
        expected: '' },
      // normal apps should display nothing:
      { origin: 'app://foo.gaiamobile.org/bar',
        expected: '' },
    ].forEach((data) => {
      assert.equal(
        TaskManagerUtils.getDisplayUrlForApp({
          origin: data.origin,
          getFrameForScreenshot() {
            if (data.frameSrc) {
              return { src: data.frameSrc };
            }
          },
          isBrowser() { return data.isBrowser; },
          config: { url: data.origin },
        }),
        data.expected
      );
    });
  });

  suite('loadAppIcon', function() {
    test('loadAppIcon successfully', function(done) {
      var ICON_URL = 'ICON_URL';
      var SIZE = 100;
      var renderSpy;
      var el = document.createElement('div');
      el.classList.add('pending');
      window.Icon = function(el, originalUrl) {
        assert.equal(originalUrl, ICON_URL);
        this.renderBlob = (blob, options) => {
          options.onLoad();
        };
        renderSpy = sinon.spy(this, 'renderBlob');
      };
      TaskManagerUtils.loadAppIcon({
        getSiteIconUrl(size) {
          return Promise.resolve({ originalUrl: ICON_URL });
        },
      }, el, SIZE).then(() => {
        assert.ok(renderSpy.calledOnce);
        assert.equal(renderSpy.firstCall.args[1].size, SIZE);
        assert.ok(!el.classList.contains('pending'));
      }).then(done, done);
    });

    test('loadAppIcon fails', function(done) {
      var SIZE = 100;
      var el = document.createElement('div');
      el.classList.add('pending');

      window.Icon = sinon.stub();

      TaskManagerUtils.loadAppIcon({
        getSiteIconUrl(size) {
          return Promise.resolve(null);
        },
      }, el, SIZE).then(() => {
        assert.ok(window.Icon.notCalled);
        assert.ok(!el.classList.contains('pending'));
      }).then(done, done);
    });
  });

  suite('waitForAppToClose', function() {
    test('null app waits for nothing', function(done) {
      var safetyStub = this.sinon.stub(window, 'eventSafety');
      TaskManagerUtils.waitForAppToClose(null).then(() => {
        assert.ok(safetyStub.notCalled);
        done();
      }).catch(done);
    });

    test('homescreen app waits for homescrenclosed', function(done) {
      var safetyStub = this.sinon.stub(window, 'eventSafety')
        .returns(Promise.resolve());
      TaskManagerUtils.waitForAppToClose({ isHomescreen: true }).then(() => {
        assert.ok(safetyStub.calledOnce);
        assert.equal(safetyStub.firstCall.args[1], 'homescreenclosed');
        done();
      }).catch(done);
    });


    test('normal app waits for appclosed', function(done) {
      var safetyStub = this.sinon.stub(window, 'eventSafety')
        .returns(Promise.resolve());
      TaskManagerUtils.waitForAppToClose({ isHomescreen: false }).then(() => {
        assert.ok(safetyStub.calledOnce);
        assert.equal(safetyStub.firstCall.args[1], 'appclosed');
        done();
      }).catch(done);
    });
  });

  test('waitForScreenToBeReady: orientation and resize', function(done) {
    var clock = this.sinon.useFakeTimers();
    var screenshotSpy = sinon.spy();
    Service.mockQueryWith('defaultOrientation', 'portrait-primary');
    Service.mockQueryWith('fetchCurrentOrientation', 'landscape-primary');
    Service.mockQueryWith('AppWindowManager.getActiveWindow', {
      getScreenshot(cb) {
        screenshotSpy();
        cb();
      }
    });
    Service.mockQueryWith('keyboardEnabled', true);

    var safetySpy = this.sinon.spy(window, 'eventSafety');

    TaskManagerUtils.waitForScreenToBeReady().then(() => {
      assert.equal(safetySpy.getCall(0).args[1], 'keyboardhidden');
      assert.equal(safetySpy.getCall(1).args[1], 'resize');
      assert.ok(screenshotSpy.calledOnce);
    }).then(done, done);
    clock.tick(1000);
  });

  test('waitForScreenToBeReady: no orientation or resize', function(done) {
    var clock = this.sinon.useFakeTimers();
    var screenshotSpy = sinon.spy();
    Service.mockQueryWith('defaultOrientation', 'landscape-primary');
    Service.mockQueryWith('fetchCurrentOrientation', 'landscape-primary');
    Service.mockQueryWith('AppWindowManager.getActiveWindow', {
      getScreenshot(cb) {
        screenshotSpy();
        cb();
      }
    });
    Service.mockQueryWith('keyboardEnabled', false);

    var safetySpy = this.sinon.spy(window, 'eventSafety');

    TaskManagerUtils.waitForScreenToBeReady().then(() => {
      assert.ok(!safetySpy.called);
      assert.ok(screenshotSpy.calledOnce);
    }).then(done, done);
    clock.tick(1000);
  });

});
