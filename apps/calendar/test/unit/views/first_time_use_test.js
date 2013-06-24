requireLib('app.js');

suiteGroup('Views.FirstTimeUse', function() {
  var store,
      subject;
  
  setup(function() {
    var div = document.createElement('div');
    div.id = 'test';
    div.innerHTML = [
      '<div id="hint-swipe-to-navigate" class="hint hide">',
      '</div>'
    ].join('');

    document.body.appendChild(div);

    app = testSupport.calendar.app();
    store = app.store('Setting');
    subject = new Calendar.Views.FirstTimeUse({ app: app });
    
    // Force hint to show when render is called.
    store.set(subject.SWIPE_TO_NAVIGATE_HINT_KEY, true);
  });
  
  teardown(function() {
    var el = document.getElementById('test');
    el.parentNode.removeChild(el);
  });
  
  test('first time use', function() {
    subject.render();
    assert.isTrue(
      subject.swipeToNavigateElement.classList.contains('show'),
      'hint should be shown!'
    );
    
    subject.destroy();
    assert.isTrue(
      subject.swipeToNavigateElement.classList.contains('hide'),
      'hint should be hidden!'
    );
    
    subject.render();
    assert.isFalse(
      subject.swipeToNavigateElement.classList.contains('show'),
      'hint should never show more than once!'
    );
  });
  
});
