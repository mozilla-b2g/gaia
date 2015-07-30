suite('views/notification', function() {
  'use strict';

  suiteSetup(function(done) {
    var self = this;
    requirejs(['views/notification'], function(NotificationView) {
      self.NotificationView = NotificationView;
      done();
    });
  });

  setup(function() {
    this.view = new this.NotificationView();
    this.clock = sinon.useFakeTimers();
  });

  suite('NotificationView#display()', function() {
    suite('Temporary', function() {
      test('Should add the item to the view', function() {
        assert.equal(this.view.el.getAttribute('role'), 'presentation');
        this.view.display({ text: 'l10nId' });
        var child = this.view.el.children[0];
        assert.ok(child);
        assert.equal(child.getAttribute('role'), 'status');
        assert.equal(child.getAttribute('aria-live'), 'assertive');
      });

      test('Should add `text` as textContent', function() {
        this.view.display({ text: 'l10nId' });
        var child = this.view.el.children[0];
        assert.equal(child.firstChild.getAttribute('data-l10n-id'), 'l10nId');
        assert.equal(child.getAttribute('role'), 'status');
        assert.equal(child.getAttribute('aria-live'), 'assertive');
      });

      test('Should assign className to the item element', function() {
        this.view.display({ text: 'l10nId', className: 'bar' });
        var child = this.view.el.children[0];
        assert.isTrue(child.classList.contains('bar'));
        assert.equal(child.getAttribute('role'), 'status');
        assert.equal(child.getAttribute('aria-live'), 'assertive');
      });

      test('Should remove the last non-persistent item that is in the way', function() {
        this.view.display({ text: 'l10nId' });
        var first = this.view.el.children[0];

        assert.ok(first);
        assert.equal(first.firstChild.getAttribute('data-l10n-id'), 'l10nId');

        this.view.display({ text: 'l10nId2' });
        var second = this.view.el.children[0];

        assert.ok(second);
        assert.equal(first.parentNode, null, 'not in dom');
        assert.equal(second.firstChild.getAttribute('data-l10n-id'),
          'l10nId2');
      });

      test('Should auto clear notification after 3s', function() {
        this.view.display({ text: 'l10nId' });
        var first = this.view.el.children[0];

        assert.ok(first);
        assert.equal(first.firstChild.getAttribute('data-l10n-id'), 'l10nId');

        this.clock.tick(1000);
        assert.ok(first.parentNode, 'is in dom');

        this.clock.tick(1000);
        assert.ok(first.parentNode, 'is in dom');

        this.clock.tick(1000);
        assert.equal(first.parentNode, null, 'not in dom');
      });

      test('Should not mutate the passed object', function() {
        var options = { text: 'l10nId' };

        this.view.display(options);

        assert.equal(Object.keys(options).length, 1);
        assert.equal(options.text, 'l10nId');
      });
    });

    suite('Persistent', function() {
      test('Should remain in the DOM until cleared', function() {
        var id = this.view.display({ text: 'l10nId', persistent: true });
        var el = this.view.el.children[0];

        assert.ok(el.parentNode, 'is in dom');

        this.clock.tick(1000);
        assert.ok(el.parentNode, 'is in dom');

        this.clock.tick(3000);
        assert.ok(el.parentNode, 'is in dom');

        this.view.clear(id);
        assert.ok(!el.parentNode, 'not in dom');
      });

      test('Should hide to show temporary notifications, then return', function() {
        var els = {};

        this.view.display({ text: 'l10nId', persistent: true, className: 'persistent' });
        els.persistent = this.view.el.querySelector('.persistent');

        assert.ok(els.persistent.parentNode, 'should be in DOM');
        assert.isFalse(els.persistent.classList.contains('hidden'));

        this.view.display({ text: 'l10nId', className: 'temporary' });
        els.temporary = this.view.el.querySelector('.temporary');

        assert.ok(els.temporary.parentNode, 'should be in DOM');
        assert.isTrue(els.persistent.classList.contains('hidden'));

        this.clock.tick(1000);
        assert.isTrue(els.persistent.classList.contains('hidden'));

        this.clock.tick(3000);
        assert.ok(!els.temporary.parentNode);
        assert.isFalse(els.persistent.classList.contains('hidden'));
      });

      test('Should replace first persistent item with second', function() {
        var els = {};

        this.view.display({ text: 'l10nId', persistent: true, className: 'persistent1' });
        els.persistent1 = this.view.el.querySelector('.persistent1');

        assert.ok(els.persistent1.parentNode, 'should be in DOM');

        this.view.display({ text: 'l10nId', persistent: true, className: 'persistent2' });
        els.persistent2 = this.view.el.querySelector('.persistent2');

        assert.ok(els.persistent2.parentNode, 'should be in DOM');
        assert.ok(!els.persistent1.parentNode, 'should not be in DOM');
      });
    });
  });

  suite('NotificationView#clear()', function() {
    test('Should be able to clear notifications early', function() {
      var id = this.view.display({ text: 'l10nId' });
      var el = this.view.el.children[0];

      assert.ok(el.parentNode);
      this.view.clear(id);
      assert.equal(el.parentNode, null);
    });

    test('Should not throw when attempting to clear a notification twice', function() {
      var id = this.view.display({ text: 'l10nId' });
      var el = this.view.el.children[0];

      assert.ok(el.parentNode);
      this.view.clear(id);
      assert.equal(el.parentNode, null);
      this.view.clear(id);
    });

    test('Should show hidden persistent notification', function() {
      var persistent = this.view.display({ text: 'l10nId', persistent: true });
      var els = {};

      els.persistent = this.view.el.children[0];
      assert.ok(els.persistent.parentNode, 'is in the dom');

      var temporary = this.view.display({ text: 'l10nId' });
      assert.isTrue(els.persistent.classList.contains('hidden'), 'is hidden');

      this.view.clear(temporary);
      assert.isFalse(els.persistent.classList.contains('hidden'), 'is not hidden');
    });
  });
});
