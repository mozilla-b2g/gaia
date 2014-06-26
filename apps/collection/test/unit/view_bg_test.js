'use strict';
/* global ViewBgImage */
/* global Promise */

require('/shared/js/l10n.js');

suite('bg image > ', function() {
  var subject;
  var serverResponse;

  function setServerResponse(data) {
    serverResponse = {
      checksum: data.checksum,
      response: {
        image: {
          data: data.src
        }
      }
    };
  }

  // Stub eme api
  window.eme = {
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

  test('no change if checksum matches', function(done) {
    // mock collection with bg1
    var mockCollection = {
      background: {
        src: 'foo',
        checksum: 'foo'
      }
    };

    // set server response
    setServerResponse({
      checksum: 'foo',
      src: 'bar'
    });

    // mock ViewBgImage.drawBackground
    this.sinon.stub(subject, 'drawBackground', function mockDraw(bg) {
      if (this.drawBackground.callCount === 2) {
        assert.equal(bg.src, 'foo');
        done();
      }
    });

    /* jshint -W031 */
    new subject(mockCollection);
  });

  test('change if no checksum match', function(done) {
    // mock collection with bg1
    var mockCollection = {
      background: {
        src: 'foo',
        checksum: 'foo'
      }
    };

    // set server response
    setServerResponse({
      checksum: 'bar',
      src: 'bar'
    });

    // mock ViewBgImage.drawBackground
    this.sinon.stub(subject, 'drawBackground', function mockDraw(bg) {
      if (this.drawBackground.callCount === 2) {
        assert.equal(bg.src, 'bar');
        done();
      }
    });

    /* jshint -W031 */
    new subject(mockCollection);
  });

  test('ViewBgImage image response has isFullSize param', function(done) {
    // mock collection with bg1
    var mockCollection = {
      background: {
        src: 'foo',
        checksum: 'foo'
      }
    };

    // set server response
    setServerResponse({
      checksum: 'bar',
      src: 'bar'
    });

    // mock ViewBgImage.drawBackground
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
