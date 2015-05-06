/* global DownloadIcon */
'use strict';

requireApp('system/js/service.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/base_icon.js');
requireApp('system/js/download_icon.js');

suite('system/DownloadIcon', function() {
  var subject, MockDownload;

  setup(function() {
    MockDownload = {
      id: 'this-is-a-fake-uuid',
      pause: this.sinon.spy(),
      onstatechange: this.sinon.spy(),
      state: 'downloading'
    };
    subject = new DownloadIcon();
    subject.start();
    subject.element = document.createElement('div');
  });

  teardown(function() {
    subject.stop();
  });

  test('Start a new download', function() {
    subject.handle(MockDownload);
    MockDownload.state = 'downloading';
    MockDownload.onstatechange({
      download: MockDownload
    });
    assert.isTrue(subject.isVisible());
  });

  test('Stop the download', function() {
    subject.handle(MockDownload);
    MockDownload.state = 'downloading';
    MockDownload.onstatechange({
      download: MockDownload
    });

    MockDownload.state = 'stopped';
    MockDownload.onstatechange({
      download: MockDownload
    });
    assert.isFalse(subject.isVisible());
  });

  test('Finalize the download', function() {
    subject.handle(MockDownload);
    MockDownload.state = 'finalized';
    MockDownload.onstatechange({
      download: MockDownload
    });
    assert.isFalse(subject.isVisible());
  });

  suite('Download count inc/dec', function() {
    test('incrementing should display the icon', function() {
      subject.incDownloads();
      assert.isTrue(subject.isVisible());
    });
    test('incrementing then decrementing should not display the icon',
      function() {
      subject.incDownloads();
      subject.decDownloads();
      assert.isFalse(subject.isVisible());
    });
    test('incrementing twice then decrementing once should display the icon',
      function() {
      subject.incDownloads();
      subject.incDownloads();
      subject.decDownloads();
      assert.isTrue(subject.isVisible());
    });
    test('incrementing then decrementing twice should not display the icon',
      function() {
      subject.incDownloads();
      subject.decDownloads();
      subject.decDownloads();
      assert.isFalse(subject.isVisible());
    });

    /* JW: testing that we can't have a negative counter */
    // These tests are currently failing and have been
    // temporarily disabled as per Bug 838993.
    // They should be fixed and re-enabled as soon as possible as per
    // Bug 840500.
    test('incrementing then decrementing twice then incrementing should ' +
         'display the icon', function() {
      subject.incDownloads();
      subject.decDownloads();
      subject.decDownloads();
      subject.incDownloads();
      assert.isTrue(subject.isVisible());
    });
  });
});
