requireLib('db.js');
requireLib('store/abstract.js')
requireLib('store/setting.js');
requireLib('app.js');

suiteGroup('Views.FirstTimeUse', function() {
  var app,
      store,
      subject;
  
  suiteSetup(function(done) {
    app = testSupport.calendar.app();

    store = app.store('Setting');

    app.db.open(done);
  });
  
  suiteSetup(function(done) {
    var div = document.createElement('div');
    div.id = 'test';
    div.innerHTML = [
      '<div id="hint-swipe-to-navigate" class="hint hide">',
      '</div>'
    ].join('');

    document.body.appendChild(div);
    
    subject = new Calendar.Views.FirstTimeUse({ app: app });

    // Force hint to show when render is called.
    store.set('showSwipeToNavigateHint', true);
    
    done();
  });
  
  suiteTeardown(function(done) {
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
  
  test('first time use should show', function(done) {
    subject.doFirstTime(function(show) {
      assert.isTrue(show, 'callback should have "show" set to true.')
      assert.isTrue(
        subject.swipeToNavigateElement.classList.contains('show'),
        'hint should be shown!'
      );

      done();
    });
  });
  
  test('first time use should be dismissed', function() {
    subject.destroy();
    assert.isTrue(
      subject.swipeToNavigateElement.classList.contains('hide'),
      'hint should be hidden!'
    );
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
