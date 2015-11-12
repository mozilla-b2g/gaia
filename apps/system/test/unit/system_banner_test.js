'use strict';
/* global SystemBanner, AnimationEvent, MocksHelper, MockL10n */

require('/shared/test/unit/mocks/mock_l10n.js');
require('/test/unit/mock_lazy_loader.js');

var mocks = new MocksHelper([
  'LazyLoader'
]).init();

suite('system/SystemBanner', function() {
  var realL10n;

  var stubById;
  var fakeElement;
  var subject;
  mocks.attachTestHelpers();

  setup(function(done) {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

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
    navigator.mozL10n = realL10n;
    realL10n = null;
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
      assert.equal(banner.querySelector('.messages p')
        .getAttribute('data-l10n-id'), 'free_the_web');
      assert.equal(banner.querySelectorAll('.button').length, 0);

      subject.show([
        'free_the_web',
        { id: 'l10n-key', args: { arg: 'l10n-args' } },
        { raw: 'raw-text' }
      ]);

      var messages = banner.querySelectorAll('.messages p');
      assert.lengthOf(messages, 3);
      assert.equal(messages[0].dataset.l10nId, 'free_the_web');
      assert.deepEqual(
        messages[1].dataset,
        { l10nId: 'l10n-key', l10nArgs: '{"arg":"l10n-args"}' }
      );
      assert.isFalse(messages[2].hasAttribute('data-l10n-id'));
      assert.equal(messages[2].textContent, 'raw-text');
    });

    test('with a button', function() {
      var banner = subject._banner;
      subject.show('see_the_web', { label: 'mozillaL10nId' });
      assert.equal(banner.querySelector('.messages p')
        .getAttribute('data-l10n-id'), 'see_the_web');
      var button = banner.querySelector('.buttons .button');
      assert.equal(button.getAttribute('data-l10n-id'), 'mozillaL10nId');

      subject.show(
        'see_the_web', { label: { id: 'l10n-key', args: { arg: 'l10n-args' } } }
      );
      button = banner.querySelector('.buttons .button');
      assert.equal(button.dataset.l10nId, 'l10n-key');
      assert.equal(button.dataset.l10nArgs, '{"arg":"l10n-args"}');

      subject.show(
        'see_the_web', { label: { raw: 'raw-text' } }
      );
      button = banner.querySelector('.buttons .button');
      assert.isFalse(button.hasAttribute('data-l10n-id'));
      assert.equal(button.textContent, 'raw-text');
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
