suite('views/notification', function() {
  'use strict';

  suiteSetup(function(done) {
    var self = this;
    req(['views/notification'], function(NotificationView) {
      self.NotificationView = NotificationView;
      done();
    });
  });

  setup(function() {
    this.l10n = { get: sinon.stub() };
    this.view = new this.NotificationView({ l10n: this.l10n });
    this.clock = sinon.useFakeTimers();
  });

  suite('NotificationView#display()', function() {
    suite('Temporary', function() {
      test('Should add the item to the view', function() {
        this.view.display({ text: 'foo' });
        var child = this.view.el.children[0];
        assert.ok(child);
      });

      test('Should add `text` as textContent', function() {
        this.view.display({ text: 'foo' });
        var child = this.view.el.children[0];
        assert.equal(child.textContent, 'foo');
      });

      test('Should assign className to the item element', function() {
        this.view.display({ text: 'foo', className: 'bar' });
        var child = this.view.el.children[0];
        assert.isTrue(child.classList.contains('bar'));
      });

      test('Should remove the last non-persistent item that is in the way', function() {
        this.view.display({ text: 'foo' });
        var first = this.view.el.children[0];

        assert.ok(first);
        assert.equal(first.textContent, 'foo');

        this.view.display({ text: 'bar' });
        var second = this.view.el.children[0];

        assert.ok(second);
        assert.equal(first.parentNode, null);
        assert.equal(second.textContent, 'bar');
      });

      test('Should auto clear notification after 3s', function() {
        this.view.display({ text: 'foo' });
        var first = this.view.el.children[0];

        assert.ok(first);
        assert.equal(first.textContent, 'foo');

        this.clock.tick(1000);
        assert.ok(first.parentNode, 'Should be in DOM');

        this.clock.tick(1000);
        assert.ok(first.parentNode, 'Should be in DOM');

        this.clock.tick(1000);
        assert.equal(first.parentNode, null, 'Should be removed from DOM');
      });
    });

    suite('Persistent', function() {
      test('Should remain in the DOM until cleared', function() {
        var id = this.view.display({ text: 'text', persistent: true });
        var el = this.view.el.children[0];

        assert.ok(el.parentNode, 'should be in DOM');
        this.clock.tick(1000);
        assert.ok(el.parentNode, 'should be in DOM');
        this.clock.tick(3000);
        assert.ok(el.parentNode, 'should be in DOM');

        this.view.clear(id);
        assert.ok(!el.parentNode, 'should not be in DOM');
      });

      test('Should hide to show temporary notifications, then return', function() {
        var els = {};

        this.view.display({ text: 'text', persistent: true, className: 'persistent' });
        els.persistent = this.view.el.querySelector('.persistent');

        assert.ok(els.persistent.parentNode, 'should be in DOM');
        assert.isFalse(els.persistent.classList.contains('hidden'));

        this.view.display({ text: 'text', className: 'temporary' });
        els.temporary = this.view.el.querySelector('.temporary');

        assert.ok(els.temporary.parentNode, 'should be in DOM');
        assert.isTrue(els.persistent.classList.contains('hidden'));

        this.clock.tick(4000);

        assert.ok(!els.temporary.parentNode);
        assert.isFalse(els.persistent.classList.contains('hidden'));
      });

      test('Should replace first persistent item with second', function() {
        var els = {};

        this.view.display({ text: 'text', persistent: true, className: 'persistent1' });
        els.persistent1 = this.view.el.querySelector('.persistent1');

        assert.ok(els.persistent1.parentNode, 'should be in DOM');

        this.view.display({ text: 'text', persistent: true, className: 'persistent2' });
        els.persistent2 = this.view.el.querySelector('.persistent2');

        assert.ok(els.persistent2.parentNode, 'should be in DOM');
        assert.ok(!els.persistent1.parentNode, 'should not be in DOM');
      });
    });
  });

  suite('NotificationView#clear()', function() {
    test('Should be able to clear notifications early', function() {
      var id = this.view.display({ text: 'foo' });
      var el = this.view.el.children[0];

      assert.ok(el.parentNode);
      this.view.clear(id);
      assert.equal(el.parentNode, null);
    });

    test('Should not throw when attempting to clear a notification twice', function() {
      var id = this.view.display({ text: 'foo' });
      var el = this.view.el.children[0];

      assert.ok(el.parentNode);
      this.view.clear(id);
      assert.equal(el.parentNode, null);
      this.view.clear(id);
    });

    test('Should show hidden persistent notification', function() {
      var persistent = this.view.display({ text: 'foo', persistent: true });
      var els = {};

      els.persistent = this.view.el.children[0];
      assert.ok(els.persistent.parentNode, 'is in the dom');

      var temporary = this.view.display({ text: 'foo' });
      assert.isTrue(els.persistent.classList.contains('hidden'), 'is hidden');

      this.view.clear(temporary);
      assert.isFalse(els.persistent.classList.contains('hidden'), 'is hidden');
    });
  });
});
