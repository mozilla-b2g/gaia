'use strict';
/* global SystemBanner, AnimationEvent, MocksHelper */

require('/shared/test/unit/mocks/mock_lazy_loader.js');

var mocks = new MocksHelper([
  'LazyLoader'
]).init();

suite('system/SystemBanner', function() {

  var stubById;
  var fakeElement;
  var subject;
  mocks.attachTestHelpers();

  setup(function(done) {
    fakeElement = document.createElement('div');
    fakeElement.id = 'fake-element';
    fakeElement.style.cssText = 'height: 100px; display: block;';
    stubById = this.sinon.stub(document, 'getElementById')
                          .returns(fakeElement.cloneNode(true));

    requireApp('system/js/system_banner.js', function() {
      subject = new SystemBanner();
      subject.getBanner().then(function(banner) {
        // Stub gaia-toast functionality.
        banner.show = function() {};
        banner.hide = function() {};

        // Stub SystemBanner.getBanner to return immediately.
        this.sinon.stub(subject, 'getBanner', function() {
          return {
            then: function(fn) {
              fn(banner);
            }
          };
        });

        done();
      }.bind(this));
    }.bind(this));
  });

  teardown(function() {
    stubById.restore();
  });

  suite('get banner', function() {
    test('generates banner element', function() {
      var banner = subject._banner;
      assert.ok(banner);
      assert.ok(banner.classList.contains('banner'));
    });
  });


  suite('show', function() {

    test('with no button', function() {
      var banner = subject._banner;
      subject.show('free_the_web');
      assert.equal(banner.querySelector('.messages').firstElementChild
        .getAttribute('data-l10n-id'), 'free_the_web');
      assert.equal(banner.querySelectorAll('.button').length, 0);
    });

    test('with a button', function() {
      var banner = subject._banner;
      subject.show('see_the_web', { label: 'mozillaL10nId' });
      assert.equal(banner.querySelector('.messages p')
        .getAttribute('data-l10n-id'), 'see_the_web');
      assert.equal(banner.querySelector('.buttons .button')
        .getAttribute('data-l10n-id'), 'mozillaL10nId');
    });
  });

  suite('hide', function() {

    test('removes visible class after close animation', function() {
      var banner = subject._banner;
      subject.show('eat_the_web');
      assert.ok(subject._showing);
      assert.equal(banner.parentNode.id, 'fake-element');
      subject.hide();
      assert.notOk(subject._showing);
      var animationEnd = new AnimationEvent('animationend');
      banner.dispatchEvent(animationEnd);
      assert.notOk(banner.parentNode);
    });
  });
});
