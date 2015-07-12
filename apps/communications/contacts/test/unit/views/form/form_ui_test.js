/* global LazyLoader, FormUI, MockL10n */

'use strict';

require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/load_body_html_helper.js');
require('/shared/js/lazy_loader.js');
require('/shared/elements/config.js');
require('/shared/js/component_utils.js');
require('/shared/elements/gaia_subheader/script.js');
require('/shared/elements/gaia-header/dist/gaia-header.js');



requireApp('communications/contacts/js/utilities/performance_helper.js');
require('/shared/js/l10n.js');
requireApp('communications/contacts/js/navigation.js');
requireApp('communications/contacts/services/contacts.js');
require('/shared/js/l10n_date.js');
require('/shared/js/contact_photo_helper.js');
require('/shared/js/contacts/utilities/templates.js');
requireApp('communications/contacts/js/contacts_tag.js');
requireApp('communications/contacts/js/tag_options.js');
require('/shared/js/text_normalizer.js');
require('/shared/js/contacts/import/utilities/status.js');
require('/shared/js/contacts/utilities/dom.js');
require('/shared/js/contacts/import/utilities/misc.js');
requireApp('communications/contacts/views/form/js/form_ui.js');

/*
 * NOTE: How tests are working:
 * Every suite will try to test all actions, step by step, that
 * you can execute in the form.
 *
 * Take into account that all tests within a suite rely on the former
 * one, so we are keeping the state (in order to execute several UI
 * actions in a linear manner).
 *
 * Keep in mind this behaviour!
 *
 */



suite('FormUI', function() {

  var realMozL10n;

  suiteSetup(function(done) {

    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    // Load HTML
    loadBodyHTML('/contacts/views/form/form.html');

    // Add hook to template to "head"
    var importHook = document.createElement('link');
    importHook.id = 'form-import-link';
    importHook.setAttribute('rel', 'import');
    importHook.setAttribute('href', '/contacts/elements/form.html');
    document.head.appendChild(importHook);

    // Fill the HTML

    LazyLoader.load(
      [
        '/contacts/js/tag_options.js',
        document.getElementById('view-contact-form')
      ],
      function() {
        FormUI.init();
        done();
      }
    );
  });

  suiteTeardown(function() {
    navigator.mozL10n = realMozL10n;
    realMozL10n = null;
    var importHook =
      document.querySelector('link[rel=import][id="form-import-link"]');
    document.head.removeChild(importHook);
    document.body.innerHTML = '';
    window.FormUI = null;
  });

  suite('Close button', function() {
    test(' > must dispatch an event when clicked', function(done) {
      window.addEventListener('close-ui', function() {
        done();
      });

      var clickEvent = new CustomEvent('action');
      document.querySelector('#contact-form-header').dispatchEvent(clickEvent);
    });
  });


  suite('Phone number', function() {
    var contact = {
      tel: ['123456789']
    };

    function getPhoneInputs() {
      var inputs =
        document.querySelectorAll(
          'input[data-field="value"]:not([value="#value#"])'
        );
      inputs = Array.prototype.filter.call(inputs, function(element) {
        return element.id.startsWith('number');
      });

      return inputs;
    }

    test(' > Add one phone number by "render" method', function() {
      FormUI.render(contact);
      var inputsRendered = getPhoneInputs();

      assert.equal(inputsRendered.length, 1);
      assert.equal(inputsRendered[0].value, contact.tel[0]);
    });

    test(' > Save button must be enabled', function() {
      var saveButton = document.querySelector('#save-button');
      assert.equal(saveButton.getAttribute('disabled'), null);
    });

    test(' > Reset in given phone number', function() {
      var inputs = getPhoneInputs();
      // Now we launch the event
      var resetButton = inputs[0].parentNode.querySelector('button');
      var touchstart = 'ontouchstart' in window ? 'touchstart' : 'mousedown';
      var customEvent = new CustomEvent(
        touchstart,
        {
          bubbles: true,
          cancelable: true
        }
      );
      resetButton.dispatchEvent(customEvent);

      // Input must be empty after tapping on 'reset'
      assert.equal(inputs[0].value, '');
    });

    test(' > Add phone number manually', function() {
      document.getElementById('add-new-phone').click();
      var inputs = getPhoneInputs();

      // After tapping we must have 2 entries in the form
      assert.equal(inputs.length, 2);
    });


    test(' > Remove phone numbers', function() {
      var deleteButtons =
        document.querySelectorAll(
          'button[data-action="delete"][data-type="tel"]'
        );

      var touchstart = 'ontouchstart' in window ? 'touchstart' : 'mousedown';
      var customEvent = new CustomEvent(
        touchstart,
        {
          bubbles: true,
          cancelable: true
        }
      );
      for (var i = 0; i < deleteButtons.length; i++) {
        deleteButtons[i].dispatchEvent(customEvent);
      }

      var inputs = getPhoneInputs();

      // After cleaning both entries, we must have no phone number
      // input in the form
      assert.equal(inputs.length, 0);
    });

    test(' > Save button must be disabled', function() {
      var saveButton = document.querySelector('#save-button');
      assert.equal(saveButton.getAttribute('disabled'), 'disabled');
    });
  });

  suite('Email', function() {
    var contact = {
      email: ['manolete@mozilla.com']
    };

    function getEmailInputs() {
      var inputs =
        document.querySelectorAll(
          'input[data-field="value"]:not([value="#value#"])'
        );
      inputs = Array.prototype.filter.call(
        inputs,
        function(element) {
          return element.id.startsWith('email');
        }
      );

      return inputs;
    }

    test(' > Add one email by "render" method', function() {
      FormUI.render(contact);
      var inputsRendered = getEmailInputs();
      assert.equal(inputsRendered.length, 1);
      assert.equal(inputsRendered[0].value, contact.email[0]);
    });

    test(' > Save button must be enabled', function() {
      var saveButton = document.querySelector('#save-button');
      assert.equal(saveButton.getAttribute('disabled'), null);
    });

    test(' > Reset in given email', function() {
      var inputs = getEmailInputs();
      // Now we launch the event
      var resetButton = inputs[0].parentNode.querySelector('button');
      var touchstart = 'ontouchstart' in window ? 'touchstart' : 'mousedown';
      var customEvent = new CustomEvent(
        touchstart,
        {
          bubbles: true,
          cancelable: true
        }
      );
      resetButton.dispatchEvent(customEvent);

      // Input must be empty after tapping on 'reset'
      assert.equal(inputs[0].value, '');
    });

    test(' > Add email manually', function() {
      document.getElementById('add-new-email').click();
      var inputs = getEmailInputs();
      assert.equal(inputs.length, 2);
    });

    test(' > Remove emails', function() {
      var deleteButtons =
        document.querySelectorAll(
          'button[data-action="delete"][data-type="email"]'
        );

      var touchstart = 'ontouchstart' in window ? 'touchstart' : 'mousedown';
      var customEvent = new CustomEvent(
        touchstart,
        {
          bubbles: true,
          cancelable: true
        }
      );
      for (var i = 0; i < deleteButtons.length; i++) {
        deleteButtons[i].dispatchEvent(customEvent);
      }

      var inputs = getEmailInputs();

      // After cleaning both entries, we must have no phone number
      // input in the form
      assert.equal(inputs.length, 0);
    });

    test(' > Save button must be disabled', function() {
      var saveButton = document.querySelector('#save-button');
      assert.equal(saveButton.getAttribute('disabled'), 'disabled');
    });
  });

  /*
   * TODO Add more tests when #update will be added in order to
   * ensure all info from a Contact is rendered properly.
   */

  suite('Address', function() {

    function getAddressInputs() {
      var inputs =
        document.querySelectorAll(
          'input[data-field="streetAddress"]:not([value="#streetAddress#"])'
        );
      inputs = Array.prototype.filter.call(inputs, function(element) {
        return element.id.startsWith('streetAddress');
      });

      return inputs;
    }

    test(' > Save button must be disabled before adding address', function() {
      var saveButton = document.querySelector('#save-button');
      assert.equal(saveButton.getAttribute('disabled'), 'disabled');
    });

    test(' > Add address manually', function() {
      document.getElementById('add-new-address').click();
      var inputs = getAddressInputs();
      assert.equal(inputs.length, 1);
    });

    test(' > Save button must be enabled after tapping text', function() {
      var inputs = getAddressInputs();

      inputs[0].value = 'Address, City';
      var inputEvent = new CustomEvent(
        'input',
        {
          bubbles: true,
          cancelable: true
        }
      );
      inputs[0].dispatchEvent(inputEvent);

      var saveButton = document.querySelector('#save-button');
      assert.equal(saveButton.getAttribute('disabled'), null);
    });

    test(' > Remove address', function() {
      var deleteButtons =
        document.querySelectorAll('button[data-action="delete"]');

      var touchstart = 'ontouchstart' in window ? 'touchstart' : 'mousedown';
      var customEvent = new CustomEvent(
        touchstart,
        {
          bubbles: true,
          cancelable: true
        }
      );
      for (var i = 0; i < deleteButtons.length; i++) {
        deleteButtons[i].dispatchEvent(customEvent);
      }

      var inputs = getAddressInputs();

      // After cleaning both entries, we must have no phone number
      // input in the form
      assert.equal(inputs.length, 0);
    });

    test(' > Save button must be disabled when deleting address', function() {
      var saveButton = document.querySelector('#save-button');
      assert.equal(saveButton.getAttribute('disabled'), 'disabled');
    });
  });


  suite('Comment/Note', function() {

    function getCommentInputs() {
      var inputs = document.querySelectorAll('textarea:not([id="note_#i#"])');
      inputs = Array.prototype.filter.call(inputs, function(element) {
        return element.getAttribute('name').startsWith('comment');
      });
      return inputs;
    }

    test(' > Save button must be disabled before adding comment', function() {
      var saveButton = document.querySelector('#save-button');
      assert.equal(saveButton.getAttribute('disabled'), 'disabled');
    });

    test(' > Add comment manually', function() {
      document.getElementById('add-new-note').click();
      var inputs = getCommentInputs();
      assert.equal(inputs.length, 1);
    });

    test(' > Save button must *NOT* be enabled after tapping text', function() {
      var inputs = getCommentInputs();

      inputs[0].value = 'This is a note';
      var inputEvent = new CustomEvent(
        'input',
        {
          bubbles: true,
          cancelable: true
        }
      );
      inputs[0].dispatchEvent(inputEvent);

      var saveButton = document.querySelector('#save-button');
      assert.equal(saveButton.getAttribute('disabled'), 'disabled');
    });

    test(' > Remove address', function() {
      var deleteButtons =
        document.querySelectorAll('button[data-action="delete"]');

      var touchstart = 'ontouchstart' in window ? 'touchstart' : 'mousedown';
      var customEvent = new CustomEvent(
        touchstart,
        {
          bubbles: true,
          cancelable: true
        }
      );
      for (var i = 0; i < deleteButtons.length; i++) {
        deleteButtons[i].dispatchEvent(customEvent);
      }

      var inputs = getCommentInputs();

      // After cleaning both entries, we must have no phone number
      // input in the form
      assert.equal(inputs.length, 0);
    });
  });


  suite('Date', function() {
    function getDateInputs() {
      var selector = 'input[type="date"]:not([id="date_#i#"])';
      return document.querySelectorAll(selector);
    }

    test(' > Save button must be disabled before adding date', function() {
      var saveButton = document.querySelector('#save-button');
      assert.equal(saveButton.getAttribute('disabled'), 'disabled');
    });

    test(' > Add Date manually. Must be "birthday"', function() {
      document.getElementById('add-new-date').click();
      var inputs = getDateInputs();
      assert.equal(inputs[0].dataset.field, 'birthday');
      assert.equal(inputs.length, 1);
    });

    test(' > Add a second Date manually. Must be "Anniversary"', function() {
      document.getElementById('add-new-date').click();
      var inputs = getDateInputs();
      assert.equal(inputs[1].dataset.field, 'anniversary');
      assert.equal(inputs.length, 2);
    });

    test(' > We can not add more Dates! Max is 2.', function() {
      // Click several times
      document.getElementById('add-new-date').click();
      document.getElementById('add-new-date').click();
      document.getElementById('add-new-date').click();
      document.getElementById('add-new-date').click();

      // Inputs are not growing
      var inputs = getDateInputs();
      assert.equal(inputs.length, 2);

      // Button for adding must be disabled
      assert.isTrue(document.querySelector('#add-new-date').disabled);
    });


    test(' > Remove Dates', function() {
      var deleteButtons =
        document.querySelectorAll('button[data-action="delete"]');

      var touchstart = 'ontouchstart' in window ? 'touchstart' : 'mousedown';
      var customEvent = new CustomEvent(
        touchstart,
        {
          bubbles: true,
          cancelable: true
        }
      );
      for (var i = 0; i < deleteButtons.length; i++) {
        deleteButtons[i].dispatchEvent(customEvent);
      }

      var inputs = getDateInputs();

      // After cleaning both entries, we must have no dates
      // input in the form
      assert.equal(inputs.length, 0);
    });
  });

  suite('Save button', function() {
    var contact = {
      tel: ['123456789']
    };

    test(' > must dispatch an event when clicked', function(done) {
      FormUI.render(contact);

      window.addEventListener('save-contact', function() {
        done();
      });

      var clickEvent = new CustomEvent('click', {'detail': contact});
      document.querySelector('#save-button').dispatchEvent(clickEvent);
    });
  });
});
