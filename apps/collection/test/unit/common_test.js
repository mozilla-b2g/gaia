'use strict';
/* global MockXMLHttpRequest */
/* global Promise */

require('/js/common.js');

requireApp('collection/test/unit/mock_xmlhttprequest.js');

var mocksHelper = new MocksHelper([
  'XMLHttpRequest'
]);
mocksHelper.init();

suite('common.js > ', function() {
  mocksHelper.attachTestHelpers();

  function createImageBlob() {
    var data = ['some stuff'];
    var properties = {
      type: 'image/jpg'
    };

    return new Blob(data, properties);
  }

  var subject = null;
  var eme_checksum = 'eme_checksum';

  suiteSetup(function() {
    subject = window.Common;

    // Stub eme api for now
    window.eme = {
      log: console.log,
      api: {
        Search: {
          bgimage: function() {
            return Promise.resolve({
              'checksum': eme_checksum,
              'response': {
                'image': {
                  'MIMEType': 'image/jpeg',
                  'data': 'eme_image_data'
                }
              }
            });
          }
        }
      }
    };
  });

  test('choose correct background ratio', function() {
    assert.equal(subject.chooseBackgroundRatio(1), 1);
    assert.equal(subject.chooseBackgroundRatio(1.51), 1.5);
    assert.equal(subject.chooseBackgroundRatio(1.9), 1.5);
    assert.equal(subject.chooseBackgroundRatio(2.24), 2);
    assert.equal(subject.chooseBackgroundRatio(2.251), 2.25);
    assert.equal(subject.chooseBackgroundRatio(3), 2.25);
  });

  test('mozilla background fails when no categoryId', function(done) {
    var mockCollection = {
      categoryId: null
    };

    subject.getMozBackground(mockCollection).then(
      function () {
        done(new Error('expected failure (no categoryId)'));
      }, function() {
        done();
      });
  });

  test('gets background from mozilla cdn',
    function(done) {
      var mockCollection = {
        categoryId: 289  // Social
      };

      subject.getBackground(mockCollection).then(
        function(bg) {
          assert.equal(bg.checksum, 'mozilla');
          done();
        });

      MockXMLHttpRequest.mSendOnLoad({
        response: createImageBlob()
      });
  });

  test('gets E.me background when cdn image fails',
    function(done) {
      var mockCollection = {
        categoryId: 249 // Weather
      };

      var original = subject.getMozBackground;
      subject.getMozBackground = function stub() {
        return Promise.reject('error');
      };

      subject.getBackground(mockCollection).then(
        function(bg) {
          assert.equal(bg.checksum, eme_checksum);
          done();
        });


      subject.getMozBackground = original;
    });

  test('E.me background changes if checksum changes',
    function(done) {
      var originalSrc = 'my_background_src';

      var mockCollection = {
        categoryId: 249, // Weather
        background: {
          checksum: 'my_checksum',
          src: originalSrc
        }
      };

      // getting background again should result in no-change of src
      subject.getEmeBackground(mockCollection)
        .then((background) => {
          assert.notEqual(background.src, originalSrc);
          done();
        });
    });

  test('E.me background does not change if checksum does not change',
    function(done) {
      var originalSrc = 'originalSrc';

      var mockCollection = {
        categoryId: 249, // Weather
        background: {
          checksum: eme_checksum,
          src: originalSrc
        }
      };

      // getting background again should result in no-change of src
      subject.getEmeBackground(mockCollection)
        .then((background) => {
          assert.equal(background.src, originalSrc);
          done();
        });
    });
});
