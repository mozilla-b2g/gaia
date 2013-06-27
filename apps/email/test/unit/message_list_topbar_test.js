require('/shared/js/l10n.js');

requireApp('email/js/message_list_topbar.js');
requireApp('email/test/unit/mock_l10n.js');

suite('MessageListTopbar', function() {
  var subject, el, scrollContainer, newEmailCount, nativeMozL10n;

  setup(function() {
    nativeMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    // Mock the HTML
    el = document.createElement('div');
    el.classList.add(MessageListTopbar.CLASS_NAME);
    el.classList.add('collapsed');

    scrollContainer = {};
    newEmailCount = 5;
    subject = new MessageListTopbar(scrollContainer, newEmailCount);
  });

  teardown(function() {
    navigator.mozL10n = nativeMozL10n;
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
      subject.decorate(el);
      subject.render();
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
      sinon.stub(subject, '_onclick');
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
          navigator.mozL10n.get('new-emails', { n: 5 })
      );
    });
  });
});
