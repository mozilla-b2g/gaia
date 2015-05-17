/*global loadBodyHTML,
   Dialog,
   MockL10n,
   TransitionEvent
*/
'use strict';

require('/shared/test/unit/mocks/mock_l10n.js');

require('/views/shared/js/dialog.js');

suite('Dialog', function() {
  var nativeMozL10n = navigator.mozL10n;
  var params = null;

  suiteSetup(function() {
    loadBodyHTML('/index.html');
    navigator.mozL10n = MockL10n;
    params = {
      title: {
        raw: 'Foo Title'
      },
      body: {
        raw: 'Foo Body'
      },
      options: {
        cancel: {
          text: {
            raw: 'Foo Cancel'
          }
        }
      }
    };
  });

  suiteTeardown(function() {
    navigator.mozL10n = nativeMozL10n;
    params = null;
  });

  test('Creation', function() {
    var dialog = new Dialog(params);
    // We check if the object is created properly
    assert.isFalse(!dialog.show);
    assert.equal(typeof dialog.show, 'function');
    assert.isFalse(!dialog.hide);
    assert.equal(typeof dialog.hide, 'function');
  });

  test('Appending to DOM', function() {
    var previouslyDefinedForms = document.getElementsByTagName('form').length;
    // In this case we have several forms pre-defined (5):
    // - "messages-compose-form"
    // - "messages-edit-form"
    // - "loading"
    // - "threads-edit-form"
    assert.equal(previouslyDefinedForms, 4);
    // Now we create the new element
    var dialog = new Dialog(params);
    // We check if the object is appended to the DOM
    dialog.show();
    // Is appended properly?
    var currentlyDefinedForms = document.getElementsByTagName('form');
    var currentlyDefinedFormsLength = currentlyDefinedForms.length;
    assert.equal(currentlyDefinedFormsLength, 5);
    // We check the type
    var dialogForm = currentlyDefinedForms[currentlyDefinedFormsLength - 1];
    assert.equal(dialogForm.dataset.type, 'confirm');
  });

  test('Has GaiaSimPicker', function() {
    assert.ok(document.getElementById('sim-picker'));
  });

  test('Focus', function() {
    var dialog = new Dialog(params);

    this.sinon.stub(dialog.form, 'focus');
    this.sinon.stub(HTMLElement.prototype, 'blur');

    dialog.show();

    sinon.assert.called(HTMLElement.prototype.blur);

    var transitionend = new TransitionEvent('transitionend', {
      bubbles: true,
      cancelable: true,
      propertyName: 'transform'
    });
    dialog.form.dispatchEvent(transitionend);

    sinon.assert.called(dialog.form.focus);
  });

  test('Redundant shows have no effect', function() {
    var dialog = new Dialog(params);

    var spy = this.sinon.spy(document.body, 'appendChild');

    dialog.show();
    dialog.show();

    assert.ok(spy.calledOnce);
  });

  test('Hiding removes element after transition', function() {
    var dialog = new Dialog(params);

    dialog.show();
    assert.notEqual(dialog.form.parentElement, null);

    dialog.hide();
    assert.notEqual(dialog.form.parentElement, null);

    var transitionend = new TransitionEvent('transitionend', {
      bubbles: true,
      cancelable: true,
      propertyName: 'transform'
    });
    dialog.form.dispatchEvent(transitionend);
    assert.equal(dialog.form.parentElement, null);
  });

  test('Checking the structure. Default.', function() {
    // Now we create the new element
    var dialog = new Dialog(params);
    // We append the element to the DOM
    dialog.show();
    // We retrieve the last created form
    var currentlyDefinedForms = document.getElementsByTagName('form');
    var currentlyDefinedFormsLength = currentlyDefinedForms.length;
    // We check the type
    var dialogForm = currentlyDefinedForms[currentlyDefinedFormsLength - 1];
    // We check how many buttons we have (only the mandatory one)
    var formOptions = dialogForm.getElementsByTagName('button');
    assert.equal(formOptions.length, 1);
  });

  test('Checking the structure. Confirm.', function() {
    // We add the confirm
    params.options.confirm = {
      text: {
        raw: 'Foo Cancel'
      }
    };
    // Now we create the new element
    var dialog = new Dialog(params);
    // We append the element to the DOM
    dialog.show();
    // We retrieve the last created form
    var currentlyDefinedForms = document.getElementsByTagName('form');
    var currentlyDefinedFormsLength = currentlyDefinedForms.length;
    // We check the type
    var dialogForm = currentlyDefinedForms[currentlyDefinedFormsLength - 1];
    // We check how many buttons we have (mandatory + confirm one)
    var formOptions = dialogForm.getElementsByTagName('button');
    assert.equal(formOptions.length, 2);
    // We check if there is a 'recommend' style
    var optionalOptions = dialogForm.getElementsByClassName('recommend');
    assert.equal(optionalOptions.length, 1);
  });

  test('Checking the structure. Confirm (with custom class name).', function() {
    // We add the confirm
    params.options.confirm = {
      text: {
        raw: 'Foo Cancel'
      },
      className: 'test-class'
    };
    // Now we create the new element
    var dialog = new Dialog(params);
    // We append the element to the DOM
    dialog.show();
    // We retrieve the last created form
    var currentlyDefinedForms = document.getElementsByTagName('form');
    var currentlyDefinedFormsLength = currentlyDefinedForms.length;
    // We check the type
    var dialogForm = currentlyDefinedForms[currentlyDefinedFormsLength - 1];

    // We check whether default 'recommend' class wasn't applied
    var optionalOptions = dialogForm.getElementsByClassName('recommend');
    assert.equal(optionalOptions.length, 0);
    // We check whether custom class name was applied
    optionalOptions = dialogForm.getElementsByClassName('test-class');
    assert.equal(optionalOptions.length, 1);
  });

  test('Checking the localization.', function() {
    params.title = 'l10n Title',
    params.body = { raw: 'non-l10n Body' },
    params.options.cancel = {
      text: { id: 'l10n keyCancel' }
    };
    params.options.confirm = {
      text: { id: 'l10n keyConfirm', args: { n: 1 } }
    };
    var l10nSpy = this.sinon.spy(navigator.mozL10n, 'setAttributes');
    // Now we create the new element
    var dialog = new Dialog(params);
    // We append the element to the DOM
    dialog.show();
    // We retrieve the last created form
    var currentlyDefinedForms = document.getElementsByTagName('form');
    var currentlyDefinedFormsLength = currentlyDefinedForms.length;
    // We check the type
    var dialogForm = currentlyDefinedForms[currentlyDefinedFormsLength - 1];
    // We check how many buttons we have (mandatory + confirm one)
    var titleDOM = dialogForm.querySelector('h1');
    var bodyDOM = dialogForm.querySelector('p');
    var formOptions = dialogForm.getElementsByTagName('button');
    assert.equal(formOptions.length, 2);

    // We check localization
    assert.equal(titleDOM.getAttribute('data-l10n-id'), params.title);
    assert.equal(bodyDOM.textContent, params.body.raw);
    assert.isFalse(bodyDOM.hasAttribute('data-l10n-id'));
    sinon.assert.calledWith(
      l10nSpy, formOptions[0], params.options.cancel.text.id
    );
    sinon.assert.calledWith(
      l10nSpy, formOptions[1],
      params.options.confirm.text.id, params.options.confirm.text.args
    );
  });

  test('Checking parametrized body localization.', function() {
    params.title = 'l10n Title';
    params.body = {
      id: 'l10n Body',
      args: {
        n: 3,
        numbers: ['123', '456', '789']
      }
    };
    params.options.cancel = {
      text: 'l10n keyCancel'
    };
    params.options.confirm = {
      text: 'l10n keyConfirm'
    };

    // Now we create the new element
    var dialog = new Dialog(params);
    // We append the element to the DOM
    dialog.show();
    // We retrieve the last created form
    var currentlyDefinedForms = document.getElementsByTagName('form');
    var currentlyDefinedFormsLength = currentlyDefinedForms.length;
    // We check the type
    var dialogForm = currentlyDefinedForms[currentlyDefinedFormsLength - 1];
    // We check how many buttons we have (mandatory + confirm one)
    var bodyDOM = dialogForm.querySelector('p');
    // We check localization
    assert.equal(
      bodyDOM.getAttribute('data-l10n-id'), params.body.id,
      'Body DOM localized with proper string'
    );
    assert.equal(
      bodyDOM.getAttribute('data-l10n-args'), JSON.stringify(params.body.args),
      'Body DOM localized with proper string'
    );
  });

  test('Should prevent pointer events before transitionend', function() {
    // Now we create the new element
    var dialog = new Dialog(params);
    // We append the element to the DOM
    dialog.show();
    assert.isTrue(document.body.classList.contains('dialog-animating'));
    var transitionend = new TransitionEvent('transitionend', {
      bubbles: true,
      propertyName: 'transform'
    });
    dialog.form.dispatchEvent(transitionend);
    assert.isFalse(document.body.classList.contains('dialog-animating'));
  });

  test('adding a class name', function() {
    params.classes = ['specific-class1', 'specific-class2'];
    var dialog = new Dialog(params);
    dialog.show();

    var elt = document.querySelector('.specific-class1');
    assert.ok(elt);
    assert.ok(elt.classList.contains('specific-class2'));
  });
});
