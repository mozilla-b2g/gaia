/*
 * Thumbnail Item tests
 */
'use strict';

require('/shared/js/l10n.js');
require('/shared/js/template.js');
require('/shared/js/media/media_utils.js');
requireApp('/video/test/unit/mock_l10n.js');
requireApp('/video/js/thumbnail_item.js');

suite('Thumbnail Item Unit Tests', function() {
  var nativeMozL10n;
  suiteSetup(function() {
    nativeMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    MediaUtils._ = MockL10n.get;
  });

  suiteTeardown(function() {
    navigator.mozL10n = nativeMozL10n;
  });

  suite('#test object creation', function() {
    test('#empty video object', function() {
      try {
        new ThumbnailItem();
        assert.fail('undefined or null videoitem should not be ok.');
      } catch (ex) {
        assert.ok('correct behavior caught');
      }
    });
  });

  suite('#error handling', function() {
    var videodata;

    suiteSetup(function() {
      videodata = {
        metadata: {
          title: 'Small webm',
          duration: 5.568,
          width: 560,
          height: 320,
          watched: false
        },
        type: 'video/webm',
        date: 1375873140000,
        size: 229455,
        name: 'dummy-file-name'
      };
    });

    setup(function() {
      delete ThumbnailItem.Template;
    });

    test('#without template', function() {
      try {
        var thumbnail = new ThumbnailItem(videodata);
        assert.fail('htmlNode should throw error without template.');
      } catch (ex) {
        assert.ok('expected error caught.');
      }
    });

    test('#partial fields of template inexistent', function() {
      var dummyDiv = document.createElement('div');
      dummyDiv.innerHTML = '<!--' +
        '<li class="thumbnail">' +
        '  <div class="inner">' +
        '  </div>' +
        '</li>' +
        '-->';

      ThumbnailItem.Template = new Template(dummyDiv);
      var thumbnail = new ThumbnailItem(videodata);
      var domNode = thumbnail.htmlNode;
      thumbnail.updatePoster(new Blob(['empty-image'], {'type': 'image/jpeg'}));
      assert.ok('it is ok without any fields');
    });

    test('#empty template', function() {
      var dummyDiv = document.createElement('div');
      dummyDiv.innerHTML = '<!-- empty -->';

      ThumbnailItem.Template = new Template(dummyDiv);
      try {
        var thumbnail = new ThumbnailItem(videodata);
        assert.fail('htmlNode should throw error without element in template.');
      } catch (ex) {
        assert.ok('expected error caught.');
      }
    });
  });

  suite('#rendering', function() {
    var videodata;
    var thumbnail;
    var domNode;

    suiteSetup(function() {
      videodata = {
        metadata: {
          title: 'Small webm',
          duration: 5.568,
          width: 560,
          height: 320,
          watched: false
        },
        type: 'video/webm',
        date: 1375873140000,
        size: 229455,
        name: 'dummy-file-name'
      };

      var dummyDiv = document.createElement('div');
      dummyDiv.innerHTML = '<!--' +
        '<li class="thumbnail">' +
        '  <div class="inner">' +
        '    <div class="img"></div>' +
        '    <div class="unwatched ${unwatched}"></div>' +
        '    <div class="details">' +
        '      <span class="title">${title}</span>' +
        '      <span class="duration-text after ' +
                     'line-break">${duration-text}</span>' +
        '      <span class="size-text after">${size-text}</span>' +
        '      <span class="type-text after">${type-text}</span>' +
        '    </div>' +
        '  </div>' +
        '</li>' +
        '-->';

      ThumbnailItem.Template = new Template(dummyDiv);
      thumbnail = new ThumbnailItem(videodata);
      domNode = thumbnail.htmlNode;
    });

    test('#unwatched', function() {
      assert.isDefined(domNode);
      var unwatchedNode = domNode.querySelector('.unwatched');
      // it is is unwatched now.
      assert.isFalse(unwatchedNode.hidden);
    });

    test('#title', function() {
      var titleNode = domNode.querySelector('.title');
      assert.equal(titleNode.textContent, 'Small webm');
    });

    test('#duration-text', function() {
      var durationNode = domNode.querySelector('.duration-text');
      assert.equal(durationNode.textContent, '00:05');
    });

    test('#size-text', function() {
      var sizeNode = domNode.querySelector('.size-text');
      assert.equal(sizeNode.textContent, '224 byteUnit-KB');
    });

    test('#type-text', function() {
      var typeNode = domNode.querySelector('.type-text');
      assert.equal(typeNode.textContent, 'webm');
    });
  });

  suite('#api tests', function() {
    var videodata;
    var thumbnail;
    var domNode;

    suiteSetup(function() {
      videodata = {
        metadata: {
          title: 'Small webm',
          duration: 5.568,
          width: 560,
          height: 320,
          watched: false,
          poster: new Blob(['empty-image'], {'type': 'image/jpeg'})
        },
        type: 'video/webm',
        date: 1375873140000,
        size: 229455,
        name: 'dummy-file-name'
      };

      var dummyDiv = document.createElement('div');
      dummyDiv.innerHTML = '<!--' +
        '<li class="thumbnail">' +
        '  <div class="inner">' +
        '    <div class="img"></div>' +
        '    <div class="unwatched ${unwatched}"></div>' +
        '    <div class="details">' +
        '      <span class="title">${title}</span>' +
        '      <span class="duration-text after ' +
                     'line-break">${duration-text}</span>' +
        '      <span class="size-text after">${size-text}</span>' +
        '      <span class="type-text after">${type-text}</span>' +
        '    </div>' +
        '  </div>' +
        '</li>' +
        '-->';

      ThumbnailItem.Template = new Template(dummyDiv);
      thumbnail = new ThumbnailItem(videodata);
      domNode = thumbnail.htmlNode;
    });

    test('#addTapListener and fired', function(done) {
      function testFunc(video) {
        assert.deepEqual(video, videodata);
        thumbnail.removeTapListener(testFunc);
        done();
      }
      thumbnail.addTapListener(testFunc);
      domNode.click();
    });

    test('#removeTapListener and fired', function(done) {
      function testFunc(video) {
        assert.fail('event should not fired.');
      }
      thumbnail.addTapListener(testFunc);
      thumbnail.removeTapListener(testFunc);
      domNode.click();
      window.setTimeout(done);
    });

    test('#addTapListener, empty argument', function() {
      thumbnail.addTapListener();
      assert.ok('everything should be ok');
    });

    test('#removeTapListener, empty argument', function() {
      thumbnail.removeTapListener();
      assert.ok('everything should be ok');
    });

    test('#addTapListener, object listener', function(done) {
      function testFunc(video) {
        assert.deepEqual(video, videodata);
        thumbnail.removeTapListener(testFunc);
        done();
      }
      thumbnail.addTapListener({handleEvent: testFunc});
      domNode.click();
    });

    test('#overflow', function() {
      var evt = new Event('overflow');
      thumbnail.detailNode.dispatchEvent(evt);
      assert.ok('everything should be ok');
    });

    test('#htmlNode', function() {
      assert.equal(thumbnail.htmlNode, domNode);
    });

    test('#data', function() {
      assert.deepEqual(thumbnail.data, videodata);
    });

    test('#watched', function() {
      thumbnail.setWatched(false);
      var node = domNode.querySelector('.unwatched');
      assert.isFalse(node.hidden);
      thumbnail.setWatched(true);
      assert.isTrue(node.hidden);
    });

    test('#updatePoster', function() {
      var blob = new Blob(['empty-image'], {'type': 'image/jpeg'});
      thumbnail.updatePoster(blob);
      var node = domNode.querySelector('.img');
      assert.notEqual(node.style.backgroundImage, '');
      thumbnail.updatePoster(null);
      assert.equal(node.style.backgroundImage,
        'url("style/images/default_thumbnail.png")');
    });
  });
});
