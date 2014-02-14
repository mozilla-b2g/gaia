'use strict';
/* global SystemBanner, AnimationEvent */

mocha.globals(['SystemBanner']);

suite('system/SystemBanner', function() {
  var stubById;
  var fakeElement;
  var subject;

  setup(function(done) {
    fakeElement = document.createElement('div');
    fakeElement.style.cssText = 'height: 100px; display: block;';
    stubById = this.sinon.stub(document, 'getElementById')
                          .returns(fakeElement.cloneNode(true));

    document.getElementById('system-banner').innerHTML = '<p></p>' +
      '<button></button>';

    requireApp('system/js/system_banner.js', function() {
      subject = new SystemBanner();
      done();
    });
  });

  teardown(function() {
    stubById.restore();
  });

  suite('get banner', function() {
    test('generates banner element', function() {
      assert.ok(!subject._banner);
      var banner = subject.banner;
      assert.ok(subject._banner);
      assert.ok(banner.classList.contains('banner'));
    });
  });

  suite('show', function() {
    test('with no button', function() {
      subject.show('free the web');
      assert.equal(subject.banner.textContent, 'free the web');
      assert.equal(subject.banner.dataset.button, 'false');
    });

    test('with a button', function() {
      subject.show('see the web', { label: 'mozilla' });
      assert.equal(subject.banner.firstElementChild.textContent, 'see the web');
      assert.equal(subject.banner.lastElementChild.textContent, 'mozilla');
      assert.ok(subject.banner.dataset.button);
    });

    test('removes visible class after close animation', function() {
      var bannerClasses = subject.banner.classList;

      subject.show('eat the web', { label: 'btn'});
      assert.ok(bannerClasses.contains('visible'));

      var animationEnd = new AnimationEvent('animationend');
      subject.banner.dispatchEvent(animationEnd);

      assert.ok(!bannerClasses.contains('visible'));
      assert.ok(subject.banner.dataset.button);
    });
  });
});
