/*jshint maxlen:false, sub:true*/
/*global MocksHelper, Overlay*/
'use strict';

require('/shared/test/unit/mocks/mock_lazy_loader.js');
requireApp('/gallery/js/overlay.js');

var mocksHelper = new MocksHelper([
  'LazyLoader'
]).init();

suite('overlay', function() {

  mocksHelper.attachTestHelpers();

  var real$;
  
  var selectors;

  setup(function() {
    selectors = {};
  });

  suiteSetup(function() {
    real$ = window.$;

    window.$ = function(selector) {
      return (selectors[selector] = selectors[selector] || {
        addEventListener: sinon.spy(),
        removeEventListener: sinon.spy(),
        classList: {
          add: sinon.spy(),
          remove: sinon.spy()
        },
        setAttribute: sinon.spy()
      });
    };

    window.picking = false;
  });

  suiteTeardown(function() {
    window.$ = real$;
  });

  suite('hide', function() {
    test('Should set `Overlay.current` to `null`', function() {
      Overlay.current = 'not `null`';
      Overlay.hide();
      assert.equal(Overlay.current, null);
    });

    test('Should add "hidden" to #overlay classList', function() {
      Overlay.hide();
      assert.ok(selectors['overlay'].classList.add.calledWith('hidden'));
    });
  });

  suite('show', function() {
    test('Should set `Overlay.current` to `foo`', function() {
      Overlay.show('foo');
      assert.equal(Overlay.current, 'foo');
    });

    test('Should add "hidden" to #overlay-camera-button', function() {
      Overlay.show('foo');
      assert.ok(selectors['overlay-camera-button'].classList.add.calledWith('hidden'));
    });

    test('Should add "hidden" to #overlay-cancel-button', function() {
      Overlay.show('foo');
      assert.ok(selectors['overlay-cancel-button'].classList.add.calledWith('hidden'));
    });

    test('Should add "hidden" to #overlay-menu', function() {
      Overlay.show('foo');
      assert.ok(selectors['overlay-menu'].classList.add.calledWith('hidden'));
    });

    test('Should call `Overlay.hide` if `id` is `null`', function() {
      var realHide = Overlay.hide;
      Overlay.hide = sinon.spy();
      Overlay.show(null);
      assert.ok(Overlay.hide.called);
      Overlay.hide = realHide;
    });

    test('Should set "data-l10n-id" attribute on #overlay-title for a valid overlay `id`',
      function() {
        Overlay.show('nocard');
        assert.ok(selectors['overlay-title'].setAttribute.calledWith('data-l10n-id'));
      }
    );

    test('Should set "data-l10n-id" attribute on #overlay-text for a valid overlay `id`',
      function() {
        Overlay.show('nocard');
        assert.ok(selectors['overlay-text'].setAttribute.calledWith('data-l10n-id'));
      }
    );

    test('Should *NOT* set "data-l10n-id" attribute on #overlay-title for an invalid overlay `id`',
      function() {
        Overlay.show('foo');
        assert.ok(!selectors['overlay-title']);
      }
    );

    test('Should *NOT* set "data-l10n-id" attribute on #overlay-text for an invalid overlay `id`',
      function() {
        Overlay.show('foo');
        assert.ok(!selectors['overlay-text']);
      }
    );
  });

  suite('addEventListener', function() {
    test('Should add event listener to #overlay', function() {
      Overlay.addEventListener('foo', 'bar');
      assert.ok(selectors['overlay'].addEventListener.calledWith('foo', 'bar'));
    });
  });

  suite('removeEventListener', function() {
    test('Should remove event listener from #overlay', function() {
      Overlay.removeEventListener('foo', 'bar');
      assert.ok(selectors['overlay'].removeEventListener.calledWith('foo', 'bar'));
    });
  });

});
