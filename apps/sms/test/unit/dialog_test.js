'use strict';

requireApp('sms/test/unit/mock_l10n.js');
requireApp('sms/js/dialog.js');

suite('Dialog', function() {
  var nativeMozL10n = navigator.mozL10n;

  var params = null;


  suiteSetup(function() {
    loadBodyHTML('/index.html');
    navigator.mozL10n = MockL10n;
    params =
    {
      title: {
        value: 'Foo Title',
        l10n: false
      },
      body: {
        value: 'Foo body',
        l10n: false
      },
      options: {
        cancel: {
          text: {
            value: 'Foo Cancel',
            l10n: false
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
    // - "attachment"
    // - "threads-edit-form"
    assert.equal(previouslyDefinedForms, 5);
    // Now we create the new element
    var dialog = new Dialog(params);
    // We check if the object is appended to the DOM
    dialog.show();
    // Is appended properly?
    var currentlyDefinedForms = document.getElementsByTagName('form');
    var currentlyDefinedFormsLength = currentlyDefinedForms.length;
    assert.equal(currentlyDefinedFormsLength, 6);
    // We check the type
    var dialogForm = currentlyDefinedForms[currentlyDefinedFormsLength - 1];
    assert.equal(dialogForm.dataset.type, 'confirm');
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
        value: 'Foo Cancel',
        l10n: false
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

  test('Checking the localization.', function() {
    var l10nCancel = 'keyCancel';
    var l10nConfirm = 'keyConfirm';
    params.options.cancel = {
      text: {
        value: 'keyCancel',
        l10n: true
      }
    };
    params.options.confirm = {
      text: {
        value: 'keyConfirm',
        l10n: true
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
    // We check localization
    assert.equal(formOptions[0].dataset.l10nId, l10nConfirm);
    assert.equal(formOptions[1].dataset.l10nId, l10nCancel);
  });



});
