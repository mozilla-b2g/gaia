requireApp('calendar/test/unit/helper.js', function() {
  requireLib('utils/input_parser.js');
  requireLib('views/event_base.js');
  requireLib('views/view_event.js');
  requireLib('models/account.js');
  requireLib('models/calendar.js');
  requireLib('models/event.js');
});

suite('views/event_base', function() {

  var subject;
  var app;
  var triggerEvent;

  function hasClass(value) {
    return subject.element.classList.contains(value);
  }

  suiteSetup(function() {
    triggerEvent = testSupport.calendar.triggerEvent;
  });

  teardown(function() {
    var el = document.getElementById('test');
    el.parentNode.removeChild(el);
    delete app._providers.Test;
  });

  setup(function() {
    var div = document.createElement('div');
    div.id = 'test';
    div.innerHTML = [
      '<div id="event-test">',
        '<button class="primary">primary</button>',
        '<button class="cancel">cancel</button>',
      '</div>'
    ].join('');

    document.body.appendChild(div);
    app = testSupport.calendar.app();

    var selectors = {
      element: '#event-test',
      cancelButton: '#event-test .cancel',
      primaryButton: '#event-test .primary'
    };
    Calendar.Views.EventBase.prototype.selectors = selectors;

    subject = new Calendar.Views.EventBase({
      app: app
    });
  });

  test('initialization', function() {
    assert.instanceOf(subject, Calendar.View);
    assert.instanceOf(subject, Calendar.Views.EventBase);

    assert.ok(subject._els, 'has elements');
  });

  test('.primaryButton', function() {
    assert.ok(subject.primaryButton);
  });

  test('.cancelButton', function() {
    assert.ok(subject.cancelButton);
  });

  test('.fieldRoot', function() {
    assert.ok(subject.fieldRoot);
    assert.equal(subject.fieldRoot, subject.element);
  });

  test('.uiSelector', function() {
    assert.ok(subject.uiSelector);
  });

  test('#returnTop', function(done) {
    assert.ok(subject.returnTop);

    subject._returnTo = '/foo';
    subject._updateUI = function() {
      assert.equal(subject._returnTo, '/foo');
      assert.equal(subject._returnTop, '/foo');
    };
    subject.dispatch({params: {}});

    subject._returnTo = '/bar';
    subject._updateUI = function() {
      assert.equal(subject._returnTo, '/bar');
      assert.equal(subject._returnTop, '/foo');
    };
    subject.dispatch({params: {}});

    var fetchReturnTop = subject.returnTop();
    subject._returnTo = '/bar';
    subject._updateUI = function() {
      assert.equal(subject._returnTo, '/bar');
      assert.equal(subject._returnTop, '/bar');
      done();
    };
    subject.dispatch({params: {}});
  });

});
