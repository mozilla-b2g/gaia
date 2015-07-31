'use strict';

/* global Icon, GridIconRenderer, MocksHelper */
/* global require, suite, test, assert, sinon */

require('/shared/elements/gaia_grid/js/grid_icon_renderer.js');
require('/shared/test/unit/mocks/mock_image.js');

require('/shared/js/homescreens/icon.js');

var mocksHelperForIcon = new MocksHelper([
  'Image'
]).init();

suite('icon.js >', function() {

  mocksHelperForIcon.attachTestHelpers();

  test('it sets the background size when there is not an icon', function() {
    var element = document.createElement('img');
    var subject = new Icon(element);
    subject.render();

    var backgroundSize = element.style.backgroundSize;
    assert.isTrue(backgroundSize.contains(subject.size / 10));
  });

  test('it sets the background image when there is an icon', function() {
    var fakeBlob = new Blob([], {type: 'image/png'});
    var fakeURL = URL.createObjectURL(fakeBlob);
    sinon.stub(URL, 'createObjectURL').returns(fakeURL);

    var realPromise = window.Promise;
    window.Promise = function() {
      return {
        then: function(resolve) {
          resolve(fakeBlob);
        }
      };
    };

    var imageSpy = this.sinon.spy(window, 'Image');

    var element = document.createElement('img');
    var subject = new Icon(element, 'http://myweb/xxx.png');
    subject.render();

    sinon.stub(GridIconRenderer.prototype, 'favicon', function() {
      return {
        then: function(resolve) {
          resolve(fakeBlob);
        }
      };
    });

    imageSpy.lastCall.thisValue.triggerEvent('onload');

    var backgroundImage = element.style.backgroundImage;
    assert.equal(backgroundImage, 'url(\"' + fakeURL + '\")');

    window.Promise = realPromise;
    GridIconRenderer.prototype.favicon.restore();
    URL.createObjectURL.restore();
  });

});
