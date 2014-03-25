/**
 * Tests for the shared scroll detector helper
 * TODO: Shared code unit tests should not be in gallery
 * Bug #841422 has been filed to move these tests
 */

'use strict';

/* global loadBodyHTML, StickyHeader */

require('/shared/js/sticky_header.js');
require('/shared/test/unit/load_body_html_helper.js');

suite('shared/js/sticky_header.js', function() {
  var scrollable;
  var sticky;
  var instance;

  setup(function() {
    loadBodyHTML('./sticky_header_test.html');

    scrollable = document.getElementById('scrollable');

    // Create 10 headers.
    for (var i = 0; i < 10; i++) {
      var header = document.createElement('header');
      header.id = 'header_' + i;

      scrollable.appendChild(header);

      // Create 10 lines of content.
      for (var j = 0; j < 10; j++) {
        var row = document.createElement('div');
        scrollable.appendChild(row);
      }
    }

    sticky = document.createElement('div');
    sticky.id = 'sticky';
    sticky.style.top = scrollable.offsetTop +
                       scrollable.firstElementChild.offsetTop + 'px';

    instance = new StickyHeader(scrollable, sticky);
  });

  teardown(function() {
    instance = null;
  });

  suite('Global', function() {
    test('StickyHeader exists', function() {
      assert.ok(StickyHeader);
    });

    test('StickyHeader has a refresh method', function() {
      assert.ok(instance.refresh);
    });
  });

  suite('Background image is updated', function() {
    function scrollAndCheckBackgroundImage(scrollTop, src, done) {
      scrollable.addEventListener('scroll', function onScroll(e) {
        scrollable.removeEventListener('scroll', onScroll);

        checkBackgroundImage(src);
        done && done();
      });

      scrollable.scrollTop = scrollTop;
    }

    function checkBackgroundImage(src) {
      assert.equal(sticky.style.backgroundImage,
                   src ? '-moz-element(#' + src + ')' : '');
    }

    setup(function() {
      instance = new StickyHeader(scrollable, sticky);
    });

    teardown(function() {
      instance = null;
    });

    test('No Scroll: background empty', function() {
      checkBackgroundImage('');
    });

    test('Start scroll: background set to the first header', function(done) {
      scrollAndCheckBackgroundImage(10, 'header_0', done);
    });

    test('Scroll 639: background set to the first header', function(done) {
      scrollAndCheckBackgroundImage(639, 'header_0', done);
    });

    test('Scroll 640: background set to the second header', function(done) {
      scrollAndCheckBackgroundImage(640, 'header_1', done);
    });

    test('Scroll 639: background set to the second header', function(done) {
      scrollAndCheckBackgroundImage(639, 'header_0', done);
    });

    test('Append/Remove a new header and checks updates', function() {
      var newHeader = document.createElement('header');
      newHeader.id = 'header_new';
      scrollable.insertBefore(newHeader, scrollable.firstElementChild);
      checkBackgroundImage('');

      instance.refresh();

      checkBackgroundImage('header_new');

      scrollable.removeChild(newHeader);

      checkBackgroundImage('header_new');

      instance.refresh();

      checkBackgroundImage('header_0');
    });

    test('Scroll 1280: background set to the second header', function() {
      scrollAndCheckBackgroundImage(1280, 'header_2');
    });

    test('Scroll 1280: background set to the first header', function() {
      var header2 = document.getElementById('header_2');
      header2.hidden = true;
      scrollAndCheckBackgroundImage(1280, 'header_1');
      delete header2.hidden;
    });
  });
});
