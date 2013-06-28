requireLib('db.js');
requireLib('store/abstract.js');
requireLib('store/setting.js');
requireLib('views/first_time_use.js');
requireLib('app.js');

suite('Views.FirstTimeUse', function() {
  var app,
      store,
      subject;

  setup(function(done) {
    app = testSupport.calendar.app();

    store = app.store('Setting');

    app.db.open(done);
  });

  setup(function(done) {
    subject = new Calendar.Views.FirstTimeUse({ app: app });

    var div = document.createElement('div');
    div.id = 'test';
    div.innerHTML =
      '<div id="' +
      subject.SWIPE_TO_NAVIGATE_ELEMENT_ID +
      '" class="hint hide"></div>';

    document.body.appendChild(div);

    done();
  });

  teardown(function(done) {
    var el = document.getElementById('test');
    el.parentNode.removeChild(el);
    testSupport.calendar.clearStore(
      app.db,
      ['settings'],
      function() {
        app.db.close();
        done();
      }
    );
  });

  suite('#doFirstTime(show = true)', function() {
    setup(function() {
      // Force hint to show when render is called.
      store.set(subject.SWIPE_TO_NAVIGATE_HINT_KEY, true);
    });

    test('first time use should show', function(done) {
      subject.doFirstTime(function(show) {
        assert.isTrue(show, 'callback should have "show" set to true.');
        assert.isTrue(
          subject.swipeToNavigateElement.classList.contains('show'),
          'hint should be shown!'
        );

        done();
      });
    });
  });

  suite('#destroy', function() {
    setup(function(done) {
      // Force hint to show when render is called.
      store.set(subject.SWIPE_TO_NAVIGATE_HINT_KEY, true);
      // Show the hint as required by our dismissal test.
      subject.doFirstTime(function(show) {
        done();
      });
    });

    test('first time use should be dismissed', function() {
      subject.destroy();
      assert.isTrue(
        subject.swipeToNavigateElement.classList.contains('hide'),
        'hint should be hidden!'
      );
      subject.destroy();
      assert.isTrue(
        subject._swipeToNavigateElement === null,
        'cached reference should be null!'
      );
    });
  });

  suite('#doFirstTime(show = false)', function() {
    setup(function() {
      // Force hint to remain hidden when render is called.
      store.set(subject.SWIPE_TO_NAVIGATE_HINT_KEY, false);
    });

    test('first time use should _not_ be shown', function(done) {
      subject.doFirstTime(function(show) {
        assert.isFalse(show, 'callback should have "show" set to false.');
        assert.isFalse(
          subject.swipeToNavigateElement.classList.contains('show'),
          'hint should never show more than once!'
        );
        done();
      });
    });
  });

});
