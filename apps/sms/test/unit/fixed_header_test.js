/*global loadBodyHTML, FixedHeader */

'use strict';

requireApp('sms/js/fixed_header.js');

suite('FixedHeader >', function() {
  var viewSelector = '#threads-container';
  var headerSelector = '#threads-header-container';

  var header;
  var view;

  setup(function() {
    loadBodyHTML('/index.html');
    this.sinon.useFakeTimers();

    header = document.querySelector(headerSelector);
    view = document.querySelector(viewSelector);

    // we don't have CSS so we must force the scroll here
    view.style.overflow = 'scroll';
    view.style.height = '50px';
  });

  test('before init, empty list, call updateHeaderContent', function() {
    FixedHeader.updateHeaderContent();
    assert.equal(header.textContent, '');
    assert.ok(header.classList.contains('no-fixed-header'));
  });

  suite('init >', function() {
    setup(function() {
      FixedHeader.init(viewSelector,
                       headerSelector,
                       'header');

      this.sinon.clock.tick();
    });

    test('empty list, we don\'t have a fixed header', function() {
      assert.equal(header.textContent, '');
      assert.ok(header.classList.contains('no-fixed-header'));
    });

    suite('longer list', function() {
      setup(function() {
        var mockThreadListMarkup = '';
        for (var i = 1; i < 50; i++) {
          mockThreadListMarkup +=
            '<header>header ' + i + '</header>' +
            '<ul>' +
              '<li>this is a thread</li>' +
              '<li>this is another thread</li>' +
            '</ul>';
        }

        view.innerHTML = mockThreadListMarkup;
        header.classList.add('no-fixed-header');
      });

      test('call refresh, should have the first header', function() {
        FixedHeader.refresh();
        this.sinon.clock.tick();

        assert.equal(header.textContent, 'header 1');
        assert.isFalse(header.classList.contains('no-fixed-header'));
      });

      test('call updateHeaderContent, should have the new header', function() {
        FixedHeader.refresh();
        this.sinon.clock.tick();

        view.querySelector('header').textContent = 'new header';
        FixedHeader.updateHeaderContent();
        assert.equal(header.textContent, 'new header');
        assert.isFalse(header.classList.contains('no-fixed-header'));
      });

      test('hide the header then call updateHeaderContent',
      function() {
        FixedHeader.refresh();
        this.sinon.clock.tick();

        header.classList.add('no-fixed-header');
        FixedHeader.updateHeaderContent();
        assert.equal(header.textContent, 'header 1');
        assert.isFalse(header.classList.contains('no-fixed-header'),
          'should show the header');
      });

      test('scroll then call refresh, should have a fixed header', function() {
        // we don't want to react to scroll events in that test
        view.removeEventListener('scroll', FixedHeader.refresh);
        view.scrollTop = 200;
        FixedHeader.refresh();
        this.sinon.clock.tick();

        assert.ok(header.textContent);
        assert.isFalse(header.classList.contains('no-fixed-header'));
      });

      test('scroll without calling refresh, should have a fixed header',
      function(done) {
        var clock = this.sinon.clock;

        view.addEventListener('scroll', function onscroll() {
          view.removeEventListener('scroll', onscroll);
          clock.tick();
          assert.ok(header.textContent);
          assert.isFalse(header.classList.contains('no-fixed-header'));
          done();
        });

        view.scrollTop = 200;
      });
    });

    suite('longer list with only one header', function() {
      setup(function() {
        var mockThreadListMarkup = '<header>header</header><ul>';

        for (var i = 1; i < 50; i++) {
          mockThreadListMarkup += '<li>this is a thread</li>';
        }

        mockThreadListMarkup += '</ul>';

        view.innerHTML = mockThreadListMarkup;
        header.classList.add('no-fixed-header');
      });

      test('call refresh, should have the first header', function() {
        FixedHeader.refresh();
        this.sinon.clock.tick();

        assert.equal(header.textContent, 'header');
        assert.isFalse(header.classList.contains('no-fixed-header'));
      });

      test('scroll without calling refresh, should have a fixed header',
      function(done) {
        var clock = this.sinon.clock;

        view.addEventListener('scroll', function onscroll() {
          view.removeEventListener('scroll', onscroll);
          clock.tick();
          assert.equal(header.textContent, 'header');
          assert.isFalse(header.classList.contains('no-fixed-header'));
          done();
        });

        view.scrollTop = 200;
      });
    });

  });
});
