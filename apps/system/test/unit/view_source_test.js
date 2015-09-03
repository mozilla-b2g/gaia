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

  setup(function() {
    subject = BaseModule.instantiate('ViewSource');
    subject.start();

    innerHTML = document.body.innerHTML;
    document.body.innerHTML = ``;
  });

  teardown(function() {
    subject.stop();
    document.body.innerHTML = Sanitizer.escapeHTML`${innerHTML}`;
  });

  suite('show', function() {
    var element;

    setup(function() {
      this.sinon.stub(Service, 'query').returns({
        origin: 'app://fake.gaiamobile.org'
      });

      subject.viewsource();

      element = document.body.querySelector('.view-source');
    });

    test('creates and attaches viewer to DOM', function() {
      assert.isTrue(!!element);
    });

    test('viewer URL is correct', function() {
      assert.equal(
        element.src, 'view-source:app://fake.gaiamobile.org/index.html');
    });

    suite('touches', function() {
      test('touching the viewer does not close it', function() {
        var evt = {
          target: element,
          type: 'touchstart'
        };

        element = null;

        subject._handleTouchstart(evt);

        element = document.querySelector('.view-source');
        assert.isTrue(!!element);
      });

      test('touching outside the viewer closes it', function() {
        var evt = {
          target: window,
          type: 'touchstart'
        };

        element = null;

        subject._handleTouchstart(evt);

        element = document.querySelector('.view-source');
        assert.isNull(element);
      });
    });

    suite('hide', function() {
      test('calling into service again closes the viewer', function() {
        element = null;

        subject.viewsource();

        element = document.querySelector('.view-source');
        assert.isNull(element);
      });
    });
  });
});
