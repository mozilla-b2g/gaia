/* global TutorialUtils, MockPromise, MockEventTarget */
'use strict';

require('/shared/test/unit/mocks/mock_event_target.js');
require('/shared/test/unit/mocks/mock_promise.js');

suite('TutorialUtils >', function() {
  var fakeFetchPromise;

  function MockVideoElement() {}

  suiteSetup(function(done) {
    loadBodyHTML('/index.html');

    MockVideoElement.prototype = Object.create(MockEventTarget.prototype);
    MockVideoElement.prototype.nodeName = 'VIDEO';

    requireApp('ftu/js/tutorial_utils.js', done);
  });

  suiteTeardown(function() {
    document.body.innerHTML = '';
  });

  setup(function() {
    fakeFetchPromise = new MockPromise();
    this.sinon.stub(window, 'fetch').returns(fakeFetchPromise);
  });

  test('sanity test TutorialUtils', function() {
    assert.equal(typeof TutorialUtils, 'object');
    assert.equal(typeof TutorialUtils.loadMedia, 'function');
    assert.equal(typeof TutorialUtils.loadAndPlayMedia, 'function');
    assert.equal(typeof TutorialUtils.fileExists, 'function');
    assert.equal(typeof TutorialUtils.Sequence, 'function');
  });

  suite('fileExists', function() {
    test('fileExists resolves success with boolean result', function(done) {
      TutorialUtils.fileExists('/fake/resource').then((result) => {
        assert.isTrue(result);
      }).then(done, (ex) => { done(ex); });
      fakeFetchPromise.mFulfillToValue({
        'ok': true,
        'status': 200
      });
    });

    test('fileExists resolves error with boolean result', function(done) {
      TutorialUtils.fileExists('/fake/resource').then((result) => {
        assert.isFalse(result);
      }).then(done, (ex) => { done(ex); });
      fakeFetchPromise.mRejectToError({ });
    });
  });

  suite('getBestAssetForDirection', function() {
    var filesExist = {
      'resource.mp4': true,
      'resource-rtl.mp4': true,
      'resource2.mp4': true,
      'resource2-ltr.mp4': true,
    };
    setup(function() {
      this.sinon.stub(TutorialUtils, 'fileExists', function(path) {
        return Promise.resolve(filesExist[path]);
      });
    });
    teardown(function() {
      document.dir = '';
    });

    test('default dir, no ltr asset', function(done) {
      TutorialUtils.getBestAssetForDirection('resource.mp4').then((result) => {
        assert.equal(result, 'resource.mp4');
      }).then(done, (ex) => { done(ex); });
    });

    test('RTL dir, with rtl asset', function(done) {
      document.dir = 'rtl';
      TutorialUtils.getBestAssetForDirection('resource.mp4').then((result) => {
        assert.equal(result, 'resource-rtl.mp4');
      }).then(done, (ex) => { done(ex); });
    });

    test('default dir, has ltr asset', function(done) {
      TutorialUtils.getBestAssetForDirection('resource2.mp4').then((result) => {
        assert.equal(result, 'resource2-ltr.mp4');
      }).then(done, (ex) => { done(ex); });
    });
  });

  suite('media handling', function() {
    var mediaElement;
    setup(function() {
      mediaElement = new MockVideoElement();
      mediaElement.nodeName = 'VIDEO';
      mediaElement.load = this.sinon.stub();
    });

    test('loadMedia resolves on load success', function(done) {
      TutorialUtils.loadMedia(mediaElement, 'fake/resource.mp4')
      .then((evt) => {
        assert.ok(evt, 'loadMedia promise resolved with an event');
      }).then(done, (ex) => { done(ex); });

      var fakeEvent = { type: 'canplay' };
      mediaElement.dispatchEvent(fakeEvent);
    });

    test('loadMedia resolves on load failure', function(done) {
      TutorialUtils.loadMedia(mediaElement, 'fake/resource.mp4')
      .then((evt) => {
        assert.ok(evt, 'loadMedia promise resolved with an event');
      }).then(done, (ex) => { done(ex); });

      var fakeEvent = { type: 'error' };
      mediaElement.dispatchEvent(fakeEvent);
    });

    test('loadMediaAndPlay', function(done) {
      this.sinon.stub(TutorialUtils, 'loadMedia', function() {
        return Promise.resolve({});
      });
      mediaElement.play = this.sinon.stub();

      TutorialUtils.loadAndPlayMedia(mediaElement, 'fake/resource.mp4')
      .then((evt) => {
        assert.ok(mediaElement.play.calledOnce);
      }).then(done, (ex) => { done(ex); });
    });
  });

});
