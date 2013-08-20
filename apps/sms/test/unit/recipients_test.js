'use strict';

requireApp('system/test/unit/mock_gesture_detector.js');

requireApp('sms/js/recipients.js');
requireApp('sms/js/utils.js');

requireApp('sms/test/unit/mock_dialog.js');
requireApp('sms/test/unit/mock_utils.js');

var mocksHelperForRecipients = new MocksHelper([
  'Dialog',
  'GestureDetector',
  'Utils'
]);

mocksHelperForRecipients.init();

suite('Recipients', function() {
  var recipients;
  var fixture;
  var mocksHelper = mocksHelperForRecipients;

  suiteSetup(function() {
    mocksHelper.suiteSetup();
  });

  suiteTeardown(function() {
    mocksHelper.suiteTeardown();
  });

  function isValid(candidate, value) {
    return (candidate.name === value || candidate.number === value);
  }


  setup(function() {
    loadBodyHTML('/index.html');

    mocksHelper.setup();

    this.sinon.spy(Recipients.prototype, 'render');
    this.sinon.spy(Recipients.View.prototype, 'render');
    this.sinon.spy(Recipients.View.prototype, 'visible');
    this.sinon.spy(Element.prototype, 'scrollIntoView');

    recipients = new Recipients({
      outer: 'messages-to-field',
      inner: 'messages-recipients-list',
      template: new Utils.Template('messages-recipient-tmpl')
    });

    fixture = {
      name: 'foo',
      number: '999',
      email: 'a@b.com',
      source: 'none',
      // Mapped to node attr, not true boolean
      editable: 'true',

      // Disambiguation 'display' attributes
      type: 'Type',
      separator: ' | ',
      carrier: 'Carrier'
    };
  });

  teardown(function() {
    mocksHelper.teardown();
    recipients = null;
    fixture = null;
  });


  suite('List', function() {
    test('Recipients', function() {
      assert.ok(Recipients);
      assert.ok(Recipients.prototype.add);
      assert.ok(Recipients.prototype.update);
      assert.ok(Recipients.prototype.remove);
      assert.ok(Recipients.prototype.render);
      assert.ok(Recipients.prototype.on);
      assert.ok(Recipients.prototype.off);
      assert.ok(Recipients.prototype.emit);
    });


    test('recipients.add() 1 ', function() {
      var recipient;

      recipients.add(fixture);
      recipient = recipients.list[0];
      assert.deepEqual(recipient, fixture);
    });

    test('recipients.add() 2 ', function() {
      recipients.add({
        number: '999'
      });
      recipients.add({
        number: '777'
      });

      assert.equal(recipients.length, 2);
      assert.ok(isValid(recipients.list[0], '999'));
      assert.ok(isValid(recipients.list[1], '777'));
    });

    test('recipients.add() allows dups ', function() {
      recipients.add({
        number: '999'
      });
      recipients.add({
        number: '999'
      });

      assert.equal(recipients.length, 2);
      assert.ok(isValid(recipients.list[0], '999'));
      assert.ok(isValid(recipients.list[1], '999'));
    });

    test('recipients.add() [invalid] >', function() {
      try {
        recipients.add({});
        assert.ok(false);
      } catch (e) {
        assert.equal(e.message, 'recipient entry missing number');
      }
    });


    test('recipients.remove(recipient) ', function() {
      var recipient;

      recipients.add(fixture);
      recipient = recipients.list[0];

      assert.deepEqual(recipient, fixture);
      assert.ok(isValid(recipient, '999'));

      recipients.remove(recipient);
      assert.equal(recipients.length, 0);

      assert.ok(recipients.render.calledTwice);
    });

    test('recipients.remove(nonexistant) ', function() {
      var recipient;

      recipients.add(fixture);
      recipients.remove(null);
      assert.equal(recipients.length, 1);

      assert.ok(recipients.render.calledOnce);
    });

    test('recipients.remove(index) ', function() {
      var recipient;

      recipients.add(fixture);
      assert.equal(recipients.length, 1);

      recipients.remove(0);
      assert.equal(recipients.length, 0);
    });

    test('recipients.update(recipient, entry) ', function() {
      var recipient;

      recipients.add(fixture);
      recipient = recipients.list[0];

      recipients.update(recipient, {
        number: 555
      });

      assert.equal(recipients.list[0].number, '555');
    });

    test('recipients.update(index, entry) ', function() {
      var recipient;

      recipients.add(fixture);
      recipient = recipients.list[0];

      recipients.update(0, {
        number: 555
      });

      assert.equal(recipients.list[0].number, '555');
    });

    test('recipients.length (accessor, get) ', function() {
      recipients.add(fixture);
      assert.equal(recipients.length, 1);
    });

    test('recipients.length (accessor, set/truncate) ', function() {
      recipients.add(fixture);
      recipients.length = 0;
      assert.equal(recipients.length, 0);
    });

    test('recipients.numbers (accessor, get) ', function() {
      recipients.add(fixture);
      assert.equal(recipients.numbers.length, 1);
      assert.equal(recipients.numbers[0], '999');
    });

    test('recipients.numbers (accessor, set/no-op) ', function() {
      recipients.add(fixture);
      assert.equal(recipients.numbers.length, 1);
      assert.equal(recipients.numbers[0], '999');

      recipients.numbers[0] = '***';
      assert.equal(recipients.numbers[0], '999');
    });

    test('recipients.numbers is a unique list ', function() {
      recipients.add(fixture);
      recipients.add(fixture);
      recipients.add(fixture);

      assert.equal(recipients.numbers.length, 1);
      assert.equal(recipients.numbers[0], '999');
    });

    test('recipients.on(add, ...)', function(done) {
      recipients.on('add', function(count) {
        assert.ok(true);
        assert.equal(recipients.numbers.length, 1);
        assert.equal(recipients.numbers[0], '999');
        assert.equal(count, 1);

        recipients.off('add');
        done();
      });
      recipients.add(fixture);
    });

    test('recipients.on(remove, ...)', function(done) {
      recipients.on('remove', function(count) {
        assert.ok(true);
        assert.equal(recipients.numbers.length, 0);
        assert.equal(count, 0);
        recipients.off('remove');
        done();
      });
      recipients.add(fixture);
      recipients.remove(recipients.list[0]);
    });

  });

  suite('Recipients.View', function() {

    function getStyles(elem, prop) {
      var styles = window.getComputedStyle(elem, null);

      return typeof prop !== 'undefined' ?
        styles[prop] : styles;
    }

    var view = {
      inner: null
    };
    var is = {
      corresponding: function(recipient, avatar, value) {
        return is.recipient(recipient, value) &&
          is.avatar(avatar, value);
      },
      recipient: function(candidate, value) {
        return (candidate.name === value || candidate.number === value);
      },
      avatar: function(candidate, value) {
        return !is.placeholder(candidate) &&
          !is.editable(candidate) && candidate.textContent.trim() === value;
      },
      placeholder: function(candidate, opts) {
        opts = opts || { isEmpty: true };
        return candidate.isPlaceholder &&
          ((opts.isEmpty && candidate.textContent.trim() === '') || true);
      },
      editable: function(candidate) {
        return candidate.contentEditable === false;
      },
      narrow: function(elem) {
        return elem.offsetWidth === 0;
      },
      wide: function(elem) {
        return elem.offsetWidth > 0;
      }
    };

    test('Recipients.View ', function() {
      assert.ok(Recipients.View);
      assert.ok(Recipients.View.prototype.clear);
      assert.ok(Recipients.View.prototype.reset);
      assert.ok(Recipients.View.prototype.render);
      assert.ok(Recipients.View.prototype.focus);
      assert.ok(Recipients.View.prototype.handleEvent);
    });

    test('initialization creates placeholder ', function() {
      var view = document.getElementById('messages-recipients-list');
      assert.ok(is.placeholder(view.firstElementChild));
      assert.ok(is.narrow(view.firstElementChild));
    });

    test('editable placeholder expands ', function() {
      var view = document.getElementById('messages-recipients-list');
      view.firstElementChild.click();
      view.firstElementChild.textContent = 'foo';
      assert.ok(is.wide(view.firstElementChild));
    });

    test('editable placeholder contracts ', function() {
      var view = document.getElementById('messages-recipients-list');
      view.firstElementChild.click();
      view.firstElementChild.textContent = 'foo';
      assert.ok(is.wide(view.firstElementChild));

      view.firstElementChild.textContent = '';
      view.firstElementChild.blur();
      assert.ok(is.narrow(view.firstElementChild));
    });

    test('recipients.add() 1, displays 1 recipient', function() {
      var view = document.getElementById('messages-recipients-list');

      recipients.add(fixture);

      // 1 recipient
      // 1 placeholder
      // -------------
      // 2 children
      assert.equal(view.children.length, 2);
      assert.ok(
        is.corresponding(recipients.list[0], view.firstElementChild, 'foo')
      );
      assert.ok(
        is.placeholder(view.lastElementChild)
      );
    });

    test('recipients.add() 2, displays 2 recipients ', function() {
      var view = document.getElementById('messages-recipients-list');

      recipients.add({
        number: '999'
      });
      recipients.add({
        number: '777'
      });

      // 2 recipients
      // 1 placeholder
      // -------------
      // 3 children
      assert.equal(view.children.length, 3);

      assert.ok(
        is.corresponding(recipients.list[0], view.children[0], '999')
      );
      assert.ok(
        is.corresponding(recipients.list[1], view.children[1], '777')
      );
      assert.ok(
        is.placeholder(view.lastElementChild)
      );
    });

    test('recipients.add() allows dups, displays correctly ', function() {
      var view = document.getElementById('messages-recipients-list');

      recipients.add({
        number: '999'
      });
      recipients.add({
        number: '999'
      });

      // 1 recipient
      // 1 duplicate
      // -------------
      // 1 recipient
      assert.equal(recipients.length, 2);

      // 1 recipients
      // 1 placeholder
      // -------------
      // 2 children
      assert.equal(view.children.length, 3);


      assert.ok(
        is.corresponding(recipients.list[0], view.children[0], '999')
      );
      assert.ok(
        is.corresponding(recipients.list[1], view.children[1], '999')
      );
      assert.ok(
        is.placeholder(view.lastElementChild)
      );
    });

    test('recipients.remove(recipient), displays correctly ', function() {
      var view = document.getElementById('messages-recipients-list');
      var recipient;

      recipients.add(fixture);
      recipient = recipients.list[0];

      assert.ok(
        is.corresponding(recipient, view.children[0], 'foo')
      );
      assert.ok(
        is.placeholder(view.lastElementChild)
      );

      recipients.remove(recipient);

      assert.ok(
        is.placeholder(view.firstElementChild)
      );
      assert.ok(
        is.placeholder(view.lastElementChild)
      );

      assert.equal(view.firstElementChild, view.lastElementChild);
    });

    test('recipients.update(recipient, entry) ', function() {
      var view = document.getElementById('messages-recipients-list');
      var recipient;

      recipients.add(fixture);
      recipient = recipients.list[0];

      assert.ok(
        is.corresponding(recipient, view.children[0], 'foo')
      );
      assert.ok(
        is.placeholder(view.lastElementChild)
      );

      recipients.update(recipient, {
        name: 'bar'
      });

      assert.ok(
        is.corresponding(recipient, view.children[0], 'bar')
      );
      assert.ok(
        is.placeholder(view.lastElementChild)
      );
    });

    test('recipients.length (accessor, set/truncate) ', function() {
      var view = document.getElementById('messages-recipients-list');
      var recipient;

      recipients.add(fixture);

      recipients.add(fixture);
      recipient = recipients.list[0];

      assert.ok(
        is.corresponding(recipient, view.children[0], 'foo')
      );
      assert.ok(
        is.placeholder(view.lastElementChild)
      );

      recipients.length = 0;

      assert.ok(
        is.placeholder(view.firstElementChild)
      );
      assert.ok(
        is.placeholder(view.lastElementChild)
      );

      assert.equal(view.firstElementChild, view.lastElementChild);
    });

    suite('Interaction', function() {

      suite('Clicks on accepted recipients', function() {

        test('while manually entering a recipient ', function() {
          var view = document.getElementById('messages-recipients-list');

          fixture.source = 'contacts';

          recipients.add(fixture).focus();

          // A recipient is accepted
          assert.equal(recipients.length, 1);

          // The recipient list contains:
          //
          //    - A rendered recipient
          //    - A placeholder for the cursor
          //
          assert.equal(view.children.length, 2);

          // Simulated manual entry of an unknown recipient
          // (ie. not a stored contact)
          view.lastElementChild.textContent = '999';
          view.firstElementChild.click();

          // A recipient is accepted
          assert.equal(recipients.length, 2);

          // The recipient list contains:
          //
          //    - Two rendered recipients
          //    - A placeholder for the cursor
          //
          assert.equal(view.children.length, 3);
        });

        test('with only accepted recipients ', function() {
          var view = document.getElementById('messages-recipients-list');

          fixture.source = 'contacts';

          recipients.add(fixture).focus();

          // A recipient is accepted
          assert.equal(recipients.length, 1);

          // The recipient list contains:
          //
          //    - A rendered recipient
          //    - A placeholder for the cursor
          //
          assert.equal(view.children.length, 2);

          view.firstElementChild.click();

          // No changes
          assert.equal(recipients.length, 1);
          assert.equal(view.children.length, 2);
        });

        test('with no placeholder at end of list ', function() {
          var view = document.getElementById('messages-recipients-list');

          fixture.source = 'contacts';

          recipients.add(fixture).focus();

          // A recipient is accepted
          assert.equal(recipients.length, 1);

          // The recipient list contains:
          //
          //    - A rendered recipient
          //    - A placeholder for the cursor
          //
          assert.equal(view.children.length, 2);

          // Remove the placeholder
          view.removeChild(view.lastElementChild);

          // Confirm the placeholder has been removed.
          assert.equal(view.children.length, 1);

          view.firstElementChild.click();

          // No changes
          assert.equal(recipients.length, 1);
          assert.equal(view.children.length, 1);
        });
      });
    });

    suite('Prompts', function() {

      test('Recipients.View.prompts ', function() {
        assert.ok(Recipients.View.prompts);
      });

      suite('Recipients.View.prompts.remove ', function() {
        var recipient;

        setup(function() {
          // This simulates a recipient object
          // as it would exist in the recipient data array.
          //
          // The values MUST be strings.
          recipient = {
            display: 'Mobile | Telco, 101',
            editable: 'false',
            email: '',
            name: 'Alan Turing',
            number: '101',
            source: 'contacts'
          };
        });

        test('Recipients.View.prompts.remove ', function() {
          assert.ok(Recipients.View.prompts.remove);
        });

        test('cancel ', function(done) {

          Recipients.View.prompts.remove(recipient, function(response) {
            assert.ok(MockDialog.triggers.cancel.called);
            assert.isFalse(MockDialog.triggers.confirm.called);
            assert.isFalse(response.isConfirmed);
            done();
          });

          MockDialog.triggers.cancel();
        });

        test('remove ', function(done) {

          Recipients.View.prompts.remove(recipient, function(response) {
            assert.ok(MockDialog.triggers.confirm.called);
            assert.isFalse(MockDialog.triggers.cancel.called);
            assert.ok(response.isConfirmed);
            done();
          });

          MockDialog.triggers.confirm();
        });
      });
    });

    suite('Visibility Modes', function() {
      var outer, inner, target, visible;

      setup(function() {
        location.hash = '#new';

        outer = document.getElementById('messages-to-field');
        inner = document.getElementById('messages-recipients-list');
        target = document.createElement('input');
        visible = Recipients.View.prototype.visible;

        this.sinon.spy(target, 'focus');
      });

      teardown(function() {
        location.hash = '';
      });

      suite('to singleline ', function() {
        setup(function() {
          recipients.visible('multiline');
        });
        test('singleline ', function() {
          // Assert the last state is multiline
          assert.equal(visible.args[0][0], 'multiline');

          // Next, set back to singleline
          recipients.visible('singleline');

          assert.ok(visible.called);
          assert.equal(visible.args[1][0], 'singleline');
        });

        test('singleline + refocus ', function() {
          // Assert the last state is multiline
          assert.equal(visible.args[0][0], 'multiline');

          outer.addEventListener('transitionend', function handler() {
            var last = inner.lastElementChild;

            assert.ok(target.focus.called);
            assert.ok(visible.called);
            assert.equal(visible.args[0][0], 'singleline');
            assert.deepEqual(visible.args[0][1], {
              refocus: target
            });

            assert.ok(target.focus.called);
            assert.ok(last.scrollIntoView.called);

            done();

            outer.removeEventListener('transitionend', handler);
          });

          recipients.visible('singleline', {
            refocus: target
          });

          outer.dispatchEvent(
            new CustomEvent('transitionend')
          );
        });
      });

      suite('to multiline ', function() {
        setup(function() {
          recipients.visible('singleline');
        });

        test('multiline ', function() {
          // Assert the last state is singleline
          assert.equal(visible.args[0][0], 'singleline');

          // Next, set back to multiline
          recipients.visible('multiline');

          assert.ok(visible.called);
          assert.equal(visible.args[1][0], 'multiline');
        });
      });
    });
  });
});
