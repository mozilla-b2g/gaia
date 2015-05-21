'use strict';
/* global ViewBgImage */
/* global Promise */

require('/shared/js/l10n.js');

suite('bg image > ', function() {
  var subject;
  var serverResponse;

  // Stub eme api
  window.eme = {
    log: function() {},
    init: function() {
      return Promise.resolve();
    },
    api: {
      Search: {
        bgimage: function() {
          return Promise.resolve(serverResponse);
        }
      }
    }
  };

  // Mock Common
  window.Common = {
    getBackground: function(collection) {
      return Promise.resolve(collection.background);
    }
  };

  setup(function(done) {
    loadBodyHTML('/view.html');

    require('/js/view_bg.js', function() {
      subject = ViewBgImage;
      done();
    });
  });

  teardown(function() {
    serverResponse = {};
  });

  test('adds isFullSize flag after getBackground', function(done) {
    var mockCollection = {
      background: {
        src: 'foo',
        checksum: 'foo'
      }
    };

    assert.isUndefined(mockCollection.background.isFullSize);

    this.sinon.stub(subject, 'drawBackground', function mockDraw(bg) {
      if (this.drawBackground.callCount === 1) {
        assert.isUndefined(bg.isFullSize);
      } else {
        assert.isTrue(bg.isFullSize);
        done();
      }
    });

    /* jshint -W031 */
    new subject(mockCollection);
  });
});
