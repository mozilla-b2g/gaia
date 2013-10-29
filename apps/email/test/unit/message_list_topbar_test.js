/*global requireApp, suite, setup, testConfig, test, assert,
  MockL10n, document, sinon, teardown, suiteSetup, suiteTeardown */

requireApp('email/js/alameda.js');
requireApp('email/test/config.js');
requireApp('email/test/unit/mock_l10n.js');

suite('MessageListTopbar', function() {
  var subject, el, scrollContainer, newEmailCount,
      MessageListTopbar, mozL10n;

  suiteSetup(function(done) {
    testConfig(
      {
        suiteTeardown: suiteTeardown,
        done: done,
        defines: {
          'l10n!': function() {
            return MockL10n;
          }
        }
      },
      ['message_list_topbar', 'l10n!'],
      function(mlt, l) {
        MessageListTopbar = mlt;
        mozL10n = l;
      }
    );
  });

  setup(function() {
    // Called before each of the suites below
    //
    // Mock the HTML
    el = document.createElement('div');
    el.classList.add(MessageListTopbar.CLASS_NAME);
    el.classList.add('collapsed');

    scrollContainer = {};
    newEmailCount = 5;
    subject = new MessageListTopbar(scrollContainer, newEmailCount);
  });

  suite('#constructor', function() {
    test('should have been initialized appropriately', function() {
      assert.deepEqual(subject._scrollContainer, scrollContainer);
      assert.deepEqual(subject._newEmailCount, newEmailCount);
    });
  });

  suite('#decorate', function() {
    var spy;

    setup(function() {
      spy = sinon.spy(subject, 'updateNewEmailCount');
    });

    teardown(function() {
      subject.updateNewEmailCount.restore();
    });

    test('should set _el appropriately', function() {
      subject.decorate(el);
      assert.equal(subject._el, el);
    });

    test('should update its new email count appropriately', function() {
      subject.decorate(el);
      sinon.assert.calledOnce(spy);
    });

    test('should set a click listener on the element', function() {
      sinon.stub(subject, '_onclick');
      subject.decorate(el);
      el.click();
      sinon.assert.calledOnce(subject._onclick);
      subject._onclick.restore();
    });
  });

  suite('#render', function() {
    setup(function() {
      subject.decorate(el);
    });

    test('should show _el', function() {
      assert.equal(el.classList.contains('collapsed'), true);
      subject.render();
      assert.equal(el.classList.contains('collapsed'), false);
    });

    test('should call destroy after DISAPPEARS_AFTER_MILLIS', function(done) {
      MessageListTopbar.DISAPPEARS_AFTER_MILLIS = 0;
      sinon.stub(subject, 'destroy', function() {
        sinon.assert.calledOnce(subject.destroy);
        subject.destroy.restore();
        done();
      });

      subject.render();
    });
  });

  suite('#destroy', function() {
    setup(function() {
      sinon.stub(subject, '_onclick');
      subject.decorate(el);
      subject.render();
    });

    teardown(function() {
      subject._onclick.restore();
    });

    test('should hide _el', function() {
      assert.equal(el.classList.contains('collapsed'), false);
      subject.destroy();
      assert.equal(el.classList.contains('collapsed'), true);
    });

    test('should empty the element', function() {
      assert.notEqual(el.textContent, '');
      subject.destroy();
      assert.equal(el.textContent, '');
    });

    test('should release its internal data', function() {
      assert.notEqual(subject._el, undefined);
      subject.destroy();
      assert.equal(subject._el, undefined);
    });

    test('should remove the click listener on _el', function() {
      subject.destroy();
      el.click();
      sinon.assert.notCalled(subject._onclick);
    });
  });

  suite('#updateNewEmailCount', function() {
    test('should update email count', function() {
      assert.equal(subject._newEmailCount, 5);
      subject.updateNewEmailCount(10);
      assert.equal(subject._newEmailCount, 15);
    });

    test('should update textContent', function() {
      subject._el = el;
      assert.equal(subject._el.textContent, '');
      subject.updateNewEmailCount();
      assert.equal(
          subject._el.textContent,
          mozL10n.get('new-emails', { n: 5 })
      );
    });
  });
});
