/*global loadBodyHTML, Dialog, ErrorDialog, MockL10n, MocksHelper*/
'use strict';

requireApp('sms/test/unit/mock_settings.js');
requireApp('sms/test/unit/mock_l10n.js');
requireApp('sms/js/dialog.js');

var mocksHelperForDialog = new MocksHelper([
  'Settings'
]).init();

suite('Dialog', function() {
  var nativeMozL10n = navigator.mozL10n;
  var params = null;
  mocksHelperForDialog.attachTestHelpers();

  suiteSetup(function() {
    loadBodyHTML('/index.html');
    navigator.mozL10n = MockL10n;
    params = {
      title: {
        value: 'Foo Title'
      },
      body: {
        value: 'Foo Body'
      },
      options: {
        cancel: {
          text: {
            value: 'Foo Cancel'
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


  test('Focus', function() {
    var dialog = new Dialog(params);

    this.sinon.spy(dialog.form, 'focus');

    dialog.show();

    assert.ok(dialog.form.focus.called);
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
        value: 'Foo Cancel'
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
    params.title = {
      l10nId: 'l10n Title'
    },
    params.body = {
      l10nId: 'l10n Body'
    },
    params.options.cancel = {
      text: {
        l10nId: 'l10n keyCancel'
      }
    };
    params.options.confirm = {
      text: {
        l10nId: 'l10n keyConfirm'
      }
    };
    var l10nSpy = this.sinon.spy(navigator.mozL10n, 'localize');
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
    var titleDOM = dialogForm.querySelector('strong');
    var bodyDOM = dialogForm.querySelector('small');
    var formOptions = dialogForm.getElementsByTagName('button');
    assert.equal(formOptions.length, 2);
    // We check localization
    assert.ok(l10nSpy.calledWith(titleDOM, params.title.l10nId),
      'Title DOM localized with proper string');
    assert.ok(l10nSpy.calledWith(bodyDOM, params.body.l10nId),
      'Body DOM localized with proper string');
    assert.ok(l10nSpy.calledWith(formOptions[0],
      params.options.cancel.text.l10nId),
      'Confirm DOM localized with proper string');
    assert.ok(l10nSpy.calledWith(formOptions[1],
      params.options.confirm.text.l10nId),
      'Cancel DOM localized with proper string');
  });

  test('Checking the localization(Confirm on the left side).', function() {
    params.title = {
      l10nId: 'l10n Title'
    },
    params.body = {
      l10nId: 'l10n Body'
    },
    params.options.cancel = {
      text: {
        l10nId: 'l10n keyCancel'
      }
    };
    params.options.confirm = {
      text: {
        l10nId: 'l10n keyConfirm'
      },
      position: 'left'
    };
    var l10nSpy = this.sinon.spy(navigator.mozL10n, 'localize');
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

    assert.ok(l10nSpy.calledWith(formOptions[0],
      params.options.confirm.text.l10nId),
      'Confirm DOM localized with proper string');
    assert.ok(l10nSpy.calledWith(formOptions[1],
      params.options.cancel.text.l10nId),
      'Cancel DOM localized with proper string');
  });

  test('Checking parametrized body localization.', function() {
    params.title = {
      l10nId: 'l10n Title'
    },
    params.body = {
      l10nId: 'l10n Body',
      l10nArgs: {
        n: 3,
        numbers: ['123', '456', '789']
      }
    };
    params.options.cancel = {
      text: {
        l10nId: 'l10n keyCancel'
      }
    };
    params.options.confirm = {
      text: {
        l10nId: 'l10n keyConfirm'
      }
    };

    var l10nSpy = this.sinon.spy(navigator.mozL10n, 'localize');
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
    var bodyDOM = dialogForm.querySelector('small');
    // We check localization
    assert.ok(l10nSpy.calledWith(bodyDOM, params.body.l10nId),
      'Body DOM localized with proper string');
  });

  suite('Message Error Dialog', function() {
    var dialogSpy;

    setup(function() {
      dialogSpy = this.sinon.spy(Dialog, 'call');
    });

    test('No signal error', function() {
      var dialog = new ErrorDialog('NoSignalError');
      dialog.show();

      var opt = dialogSpy.firstCall.args[1];
      assert.equal(opt.title.l10nId,
                  'sendNoSignalErrorTitle');
      assert.equal(opt.body.l10nId,
                  'sendNoSignalErrorBody');
    });

    test('show not found error', function() {
      var dialog = new ErrorDialog('NotFoundError');
      dialog.show();

      var opt = dialogSpy.firstCall.args[1];
      assert.equal(opt.title.l10nId,
                  'sendNotFoundErrorTitle');
      assert.equal(opt.body.l10nId,
                  'sendNotFoundErrorBody');
    });

    test('show general error for unknown error', function() {
      var dialog = new ErrorDialog('UnknownError');
      dialog.show();

      var opt = dialogSpy.firstCall.args[1];
      assert.equal(opt.title.l10nId,
                  'sendGeneralErrorTitle');
      assert.equal(opt.body.l10nId,
                  'sendGeneralErrorBody');
    });

    test('show general error for internal case', function() {
      var dialog = new ErrorDialog('InternalError');
      dialog.show();

      var opt = dialogSpy.firstCall.args[1];
      assert.equal(opt.title.l10nId, 'sendGeneralErrorTitle');
      assert.equal(opt.body.l10nId, 'sendGeneralErrorBody');
    });

    test('show invalid address error', function() {
      var dialog = new ErrorDialog('InvalidAddressError');
      dialog.show();

      var opt = dialogSpy.firstCall.args[1];
      assert.equal(opt.title.l10nId,
                  'sendInvalidAddressErrorTitle');
      assert.equal(opt.body.l10nId,
                  'sendInvalidAddressErrorBody');
    });

    test('show no SIM card', function() {
      var dialog = new ErrorDialog('NoSimCardError');
      dialog.show();

      var opt = dialogSpy.firstCall.args[1];
      assert.equal(opt.title.l10nId,
                  'sendMissingSimCardTitle');
      assert.equal(opt.body.l10nId,
                  'sendMissingSimCardBody');
    });

    test('show air plane mode', function() {
      var dialog = new ErrorDialog('RadioDisabledError');
      dialog.show();

      var opt = dialogSpy.firstCall.args[1];
      assert.equal(opt.title.l10nId,
                  'sendFlightModeTitle');
      assert.equal(opt.body.l10nId,
                  'sendFlightModeBody');
    });

    test('show FDN blockage error', function() {
      var dialog = new ErrorDialog(
        'FdnCheckError', {recipients: ['777', '888', '999']}
      );
      dialog.show();

      var opt = dialogSpy.firstCall.args[1];
      assert.equal(opt.title.l10nId,
                  'fdnBlockedTitle');
      assert.equal(opt.body.l10nId,
                  'fdnBlockedBody');
      assert.deepEqual(opt.body.l10nArgs,
      {
        n: 3,
        numbers: '777<br />888<br />999'
      });
    });

    test('show non-active sim card error', function() {
      var handler = function() {};
      var dialog = new ErrorDialog(
        'NonActiveSimCardError', {
          active: 'SIM 1',
          nonactive: 'SIM 2',
          confirmHandler: handler
        }
      );
      dialog.show();

      var opt = dialogSpy.firstCall.args[1];
      assert.equal(opt.title.l10nId,
                  'nonActiveSimTitle');
      assert.equal(opt.body.l10nId,
                  'nonActiveSimBody');
      assert.deepEqual(opt.body.l10nArgs,
      {
        active: 'SIM 1',
        nonactive: 'SIM 2'
      });
      assert.equal(opt.options.confirm.text.l10nId,
                  'nonActiveSimConfirm');
      assert.equal(opt.options.confirm.method, handler);
    });
  });

});
