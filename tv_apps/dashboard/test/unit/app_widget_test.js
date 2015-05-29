/* globals AppWidget */

require('/js/app_widget.js');


suite('AppWidget', function() {
  'use strict';

  var subject;
  var frameData = {
    manifestURL: 'url1',
    widget: 'widgetName1',
    url: 'about:blank',
    position: 'up'
  };
  var upPanel;

  setup(function() {
    upPanel = document.createElement('div');
    upPanel.id = 'up-panel';
    document.body.appendChild(upPanel);

    subject = new AppWidget(frameData);
  });

  teardown(function() {
    document.body.removeChild(upPanel);
  });

  suite('creation > ', function() {
    test('should init frame inside up-panel', function() {
      assert.equal(upPanel.firstChild, subject.iframe);
    });

    test('should init frame with appropriate mozapp attributes', function() {
      var iframe = subject.iframe;
      assert.equal(iframe.getAttribute('mozbrowser'), 'true');
      assert.equal(iframe.getAttribute('remote'), 'true');
      assert.equal(iframe.getAttribute('mozapp'), frameData.manifestURL);
      assert.equal(iframe.src, frameData.url);
    });
  });

  suite('toggleExpand() >', function() {
    setup(function() {
      subject.toggleExpand(true);
    });

    test('should add hash "expand" when expanding', function() {
      var hash = subject.iframe.src.split('#')[1];
      assert.equal(hash, 'expand');
    });

    test('should remove hash "expand" when shrinking', function() {
      subject.toggleExpand(false);
      // We have to confirm toggleExpand leaves a '#' in url to prevent reload.
      // (thus split() shoul return an array of two strings).
      var hash = subject.iframe.src.split('#')[1];
      assert.equal(hash, '');
    });
  });

  suite('focus() > ', function () {
    test('should focus its iframe', function() {
      var spy = this.sinon.spy(subject.iframe, 'focus');
      subject.focus();
      assert.isTrue(spy.calledOnce);
    });
  });
});
