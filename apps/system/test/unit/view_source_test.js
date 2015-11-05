/* global Service, BaseModule, Sanitizer */
'use strict';

require('/js/service.js');
require('/js/browser_frame.js');
require('/js/base_module.js');
require('/js/view_source.js');

require('/shared/js/sanitizer.js');

suite('system/ViewSource', function() {
  var subject;
  var innerHTML;
  var element;

  setup(function() {
    subject = BaseModule.instantiate('ViewSource');
    subject.start();

    innerHTML = document.body.innerHTML;
    document.body.innerHTML = `<div id="screen"></div>`;
  });

  teardown(function() {
    subject.stop();
    document.body.innerHTML = Sanitizer.escapeHTML`${innerHTML}`;
  });

  suite('show', function() {
    setup(function() {
      this.sinon.stub(Service, 'query').returns({
        config: {
          url: 'app://fake.gaiamobile.org'
        }
      });

      subject.viewsource();

      element = document.body.querySelector('.view-source');
    });

    test('creates and attaches viewer to DOM', function() {
      assert.isTrue(!!element);
    });

    test('viewer URL is correct', function() {
      var iframe = element.querySelector('iframe');
      assert.equal(
        iframe.src, 'view-source:app://fake.gaiamobile.org/');
    });

    test('z-index set', function() {
      assert.equal(element.dataset.zIndexLevel, 'view-source');
    });

    test('class list set', function() {
      assert.equal(element.classList, 'view-source');
    });

    test('attaches to #screen element', function() {
      var screen = document.body.querySelector('#screen');
      assert.equal(element.parentNode, screen);
    });

    test('calling into service again closes the viewer', function() {
      element = null;

      subject.viewsource();

      element = document.querySelector('.view-source');
      assert.isNull(element);
    });

    test('calling into service a third-time creates a new viewer', function() {
      subject.viewsource();
      subject.viewsource();

      var newElement = document.querySelector('.view-source');
      assert.notEqual(element, newElement);
    });

    suite('header', function() {
      var header;
      var h1;
      var button;

      setup(function() {
        header = element.querySelector('gaia-header');
        h1 = header.querySelector('h1');
        button = header.querySelector('button');
      });

      test('has <h1> element', function() {
        var h1 = header.querySelector('h1');
        assert.isTrue(!!h1);
      });

      test('<h1> element has l10n ID', function() {
        if (h1) {
          assert.equal(h1.dataset.l10nId, 'viewSourceHeader');
        }
      });

      test('header element has [action=\'close\'] attribute set', function() {
        if (h1) {
          assert.equal(header.getAttribute('action'), 'close');
        }
      });

      test('tapping close button closes viewer', function() {
        var event = new CustomEvent('action');
        header.dispatchEvent(event);

        element = document.querySelector('.view-source');
        assert.isNull(element);
      });
    });

    suite('event handling', function() {
      ['home', 'holdhome', 'sleep', 'lockscreen-appopened'].forEach(
      function(evtName) {
        test('\'' + evtName + '\' event closes viewer', function() {
          var event = new CustomEvent(evtName);
          window.dispatchEvent(event);

          element = document.querySelector('.view-source');
          assert.isNull(element);
        });
      });
    });
  });

  suite('window sizing', function() {
    var dimension;
    var value;

    setup(function() {
      this.sinon.stub(Service, 'query', function(param) {
        if (param === 'getTopMostWindow') {
          return {config: {url: 'asdf'}};
        }
        return dimension === param && value;
      });
    });

    test('width set correctly', function() {
      dimension = 'LayoutManager.width';
      value = 300;

      subject.viewsource();
      element = document.body.querySelector('.view-source');

      assert.equal(element.style.width, value + 'px');
    });

    test('height set correctly', function() {
      dimension = 'getHeightFor';
      value = 200;

      subject.viewsource();
      element = document.body.querySelector('.view-source');

      assert.equal(element.style.height,
                   'calc(' + value + 'px - var(--statusbar-height))');
    });

    test('iframe sized correctly', function() {
      subject.viewsource();

      var iframe = element.querySelector('iframe');
      assert.equal(iframe.style.height,
                   'calc(' + value + 'px - var(--statusbar-height) - 50px)');
    });

    test('resizes when "system-resize" event received', function() {
      dimension = 'getHeightFor';
      value = 200;

      subject.viewsource();
      element = document.body.querySelector('.view-source');

      value = 150;

      var systemResize = new CustomEvent('system-resize');
      window.dispatchEvent(systemResize);

      assert.equal(element.style.height,
                   'calc(' + value + 'px - var(--statusbar-height))');
    });
  });
});
