/*global loadBodyHTML,
         FocusEvent,
         InputEvent,
         KeyEvent,
         KeyboardEvent,
         SubjectComposer
*/

'use strict';

require('/shared/js/event_dispatcher.js');

require('/views/conversation/js/subject_composer.js');

suite('SubjectComposer >', function() {
  var node, subjectComposer, input;

  setup(function() {
    loadBodyHTML('/index.html');

    node = document.querySelector('.js-subject-composer');
    subjectComposer = new SubjectComposer(node);
    input = node.querySelector('.subject-composer-input');
  });

  teardown(function() {
    subjectComposer.reset();
  });

  test('correctly instantiate', function() {
    assert.throws(
      () => new SubjectComposer(),
      'Subject node is required'
    );

    assert.ok(new SubjectComposer(node));
    assert.isTrue(
      node.classList.contains('hide'),
      'Should be hidden by default'
    );
  });

  suite('visibility >', function() {
    teardown(function() {
      subjectComposer.reset();
    });

    test('show and hide work correctly', function() {
      var visibilityChangeStub = sinon.stub();
      subjectComposer.on('visibility-change', visibilityChangeStub);

      subjectComposer.show();

      assert.isFalse(node.classList.contains('hide'));
      sinon.assert.called(visibilityChangeStub);

      subjectComposer.hide();

      assert.isTrue(node.classList.contains('hide'));
      sinon.assert.called(visibilityChangeStub);
    });

    test('keeps value between show and hide', function() {
      subjectComposer.show();
      subjectComposer.setValue('my value');

      assert.equal(subjectComposer.getValue(), 'my value');
      assert.equal(input.textContent, 'my value');

      // Hide subject and show again
      subjectComposer.hide();
      subjectComposer.show();

      assert.equal(subjectComposer.getValue(), 'my value');
      assert.equal(input.textContent, 'my value');
    });

    test('isVisible tracks visibility correctly', function() {
      assert.isFalse(subjectComposer.isVisible());

      subjectComposer.show();
      assert.isTrue(subjectComposer.isVisible());

      subjectComposer.hide();
      assert.isFalse(subjectComposer.isVisible());
    });
  });

  suite('value management >', function() {
    setup(function() {
      subjectComposer.show();
    });

    teardown(function() {
      subjectComposer.reset();
    });

    test('correctly sets and gets value', function() {
      assert.throws(
        () => subjectComposer.setValue(), 'Value should be a valid string'
      );
      assert.equal(subjectComposer.getValue(), '');

      subjectComposer.setValue('test');

      assert.equal(subjectComposer.getValue(), 'test');
      assert.equal(input.textContent, 'test');

      input.innerHTML = 'test#2<br><br>';
      input.dispatchEvent(new InputEvent('input'));

      assert.equal(subjectComposer.getValue(), 'test#2');
      assert.equal(input.textContent, 'test#2');

      subjectComposer.setValue('test#3');

      assert.equal(subjectComposer.getValue(), 'test#3');
      assert.equal(input.textContent, 'test#3');

      input.innerHTML = '<br>test#4<br><br>';
      input.dispatchEvent(new InputEvent('input'));

      assert.equal(subjectComposer.getValue(), 'test#4');
      assert.equal(input.textContent, 'test#4');
    });

    test('correctly pre-process value', function() {
      var content = 'Line\u00A01<br>\n Line 2<br><br><br><br>\nLine\n 3<br>';

      subjectComposer.setValue(content);

      assert.equal(
        subjectComposer.getValue(),
        'Line 1<br> Line 2<br><br><br><br> Line 3<br>'
      );

      subjectComposer.setValue('');
      input.innerHTML = content;
      input.dispatchEvent(new InputEvent('input'));

      assert.equal(subjectComposer.getValue(), 'Line 1 Line 2 Line 3');

      subjectComposer.setValue('');
      input.textContent = content;
      input.dispatchEvent(new InputEvent('input'));

      assert.equal(
        subjectComposer.getValue(),
        'Line 1<br> Line 2<br><br><br><br> Line 3<br>'
      );
    });

    test('fires "change" only if value actually changes via setValue',
    function() {
      var onChange = sinon.stub();
      subjectComposer.on('change', onChange);

      subjectComposer.setValue('test');
      sinon.assert.calledOnce(onChange);

      subjectComposer.setValue('test');
      sinon.assert.calledOnce(onChange);

      subjectComposer.setValue('test#2');
      sinon.assert.calledTwice(onChange);
    });

    test('fires "change" only if value actually changes via innerHTML',
    function() {
      var onChange = sinon.stub();
      subjectComposer.on('change', onChange);

      input.innerHTML = 'test';
      input.dispatchEvent(new InputEvent('input'));
      sinon.assert.calledOnce(onChange);

      input.innerHTML = 'test';
      input.dispatchEvent(new InputEvent('input'));
      sinon.assert.calledOnce(onChange);

      input.innerHTML = 'test#2';
      input.dispatchEvent(new InputEvent('input'));
      sinon.assert.calledTwice(onChange);
    });

    test('correctly manages placeholder', function() {
      var placeholder = node.querySelector(
        '.subject-composer-placeholder'
      );

      assert.isNotNull(placeholder, 'Placeholder should be presented');
      assert.equal(
        placeholder.getAttribute('data-l10n-id'),
        'messagesSubjectInput_placeholder'
      );

      subjectComposer.setValue('a');
      assert.isNull(
        node.querySelector('.subject-composer-placeholder'),
        'Placeholder should be removed'
      );

      input.textContent = '';
      input.dispatchEvent(new InputEvent('input'));
      assert.isNotNull(
        node.querySelector('.subject-composer-placeholder'),
        'Placeholder should be presented'
      );
    });

  });

  suite('Backspace key handling >', function() {
    var downEvent, upEvent, backspace;

    setup(function() {
      downEvent = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        keyCode: KeyEvent.DOM_VK_BACK_SPACE
      });

      upEvent = new KeyboardEvent('keyup', {
        bubbles: true,
        cancelable: true,
        keyCode: KeyEvent.DOM_VK_BACK_SPACE
      });

      backspace = function() {
        input.dispatchEvent(downEvent);
        input.dispatchEvent(upEvent);
      };

      subjectComposer.show();
      subjectComposer.setValue('Howdy!');
    });

    teardown(function() {
      subjectComposer.reset();
    });

    test('<delete> in empty subject hides field', function() {
      // 1. Assert the correct state condition updates have occurred,
      // as described in step 1
      assert.isTrue(subjectComposer.isVisible());

      // 2. To simulate the user "deleting" the subject,
      // set the value to an empty string.
      input.textContent = '';
      input.dispatchEvent(new InputEvent('input'));

      // 3. Simulate backspace on the subject field
      backspace();

      // 4. Confirm that the state of the compose
      // area has updated properly.
      assert.isFalse(subjectComposer.isVisible());
    });

    test('<delete> in non-empty subject does not hide field', function() {
      // 1. Assert the correct state condition updates have occurred,
      // as described in step 1
      assert.isTrue(subjectComposer.isVisible());

      // 2. Simulate backspace on the subject field
      backspace();

      // 3. Confirm that the state of the compose area not changed.
      assert.isTrue(subjectComposer.isVisible());
    });

    test('<delete> holding subject does not hide field', function() {
      // 1. Assert the correct state condition updates have occurred,
      // as described in step 1
      assert.isTrue(subjectComposer.isVisible());

      // 2. Simulate holding backspace on the subject field
      for (var i = 0; i < 5; i++) {
        input.dispatchEvent(downEvent);
      }

      // 3. This is the "release" from a holding state
      input.dispatchEvent(upEvent);

      // 4. Confirm that the state of the compose area not changed.
      assert.isTrue(subjectComposer.isVisible());
    });

    test('<delete> holding subject, release and tap hides field', function() {
      // 1. Assert the correct state condition updates have occurred,
      // as described in step 1
      assert.isTrue(subjectComposer.isVisible());

      // 2. Simulate holding backspace on the subject field
      for (var i = 0; i < 5; i++) {
        input.dispatchEvent(downEvent);
      }

      // 3. This is the "release" from a holding state
      input.dispatchEvent(upEvent);

      // 4. To simulate the user "deleting" the subject,
      // set the value to an empty string.
      input.textContent = '';
      input.dispatchEvent(new InputEvent('input'));

      // 5. Simulate backspace on the subject field.
      backspace();

      // 6. Confirm that the state of the compose area not changed.
      assert.isFalse(subjectComposer.isVisible());
    });
  });

  suite('Return key handling >', function() {
    test('Return key should be ignored at key down', function() {
      subjectComposer.show();
      subjectComposer.setValue('Howdy!');

      var event = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        keyCode: KeyEvent.DOM_VK_RETURN
      });
      this.sinon.spy(event, 'stopPropagation');
      input.dispatchEvent(event);

      assert.ok(event.defaultPrevented);
      sinon.assert.called(event.stopPropagation);
    });
  });

  test('correctly resets subject', function() {
    var onChangeStub = sinon.stub();

    subjectComposer.show();

    assert.equal(subjectComposer.getValue(), '');

    subjectComposer.setValue('test');

    assert.equal(subjectComposer.getValue(), 'test');
    assert.equal(input.textContent, 'test');

    subjectComposer.on('visibility-change', onChangeStub);
    subjectComposer.on('change', onChangeStub);
    subjectComposer.reset();

    assert.equal(subjectComposer.getValue(), '');
    assert.equal(input.textContent, '');
    assert.isFalse(subjectComposer.isVisible());
    // Visibility change and change events should not be fired on reset
    sinon.assert.notCalled(onChangeStub);
  });

  test('fires "focus" event', function() {
    subjectComposer.show();

    var onFocusStub = sinon.stub();

    subjectComposer.on('focus', onFocusStub);

    input.dispatchEvent(new FocusEvent('focus'));

    sinon.assert.calledOnce(onFocusStub);
  });
});
