require('apps/communications/contacts/test/integration/app.js');

suite('contacts - launch', function() {

  var device;
  var helper = IntegrationHelper;
  var app;
  var newContact = {
    'adr': [
      {
        'countryName': 'Brazil',
        'locality': 'Blumenau',
        'postalCode': '89062-090',
        'streetAddress': 'Rua Lisete Fischer, 892'
      }
    ],
    'email': [
      {
        'value': 'LucasCastroAzevedo@teleworm.us'
      }
    ],
    'familyName': 'Azevedo',
    'givenName': 'Lucas',
    'org': 'Omni Realty',
    'tel': [
      {
        'value': '(47) 5098-7516',
        'carrier': 'Telefonica'
      }
    ],
    'comment': ['test1']
  };

  suiteTeardown(function() {
    yield app.close();
  });

  MarionetteHelper.start(function(client) {
    app = new ContactsIntegration(client);
    device = app.device;
  });

  suiteSetup(function() {
    yield app.launch();
  });

  test('starting display', function() {
    var contactsList = yield app.element('contactsList');
    var noContacts = yield app.element('noContacts');

    yield app.waitUntilElement(noContacts, 'displayed');
    // We shouldn't have contacts here
    yield app.waitUntilElement(noContacts, 'displayed');
  });

  test('Add new contact filling all the fields', function() {
    var contactsForm = yield app.element('contactsForm');
    var contactsList = yield app.element('contactsList');
    var lList = yield app.element('lList');
    var contactDetails = yield app.element('contactDetails');

    var addButton = yield app.element('addButton');
    var doneButton = yield app.element('doneButton');
    yield addButton.click();
    yield app.waitUntilElement(contactsForm, 'displayed');
    var form = yield app.element('form');

    yield app.updateForm(form, newContact);
    yield doneButton.click();

    yield app.waitUntilElement(contactsList, 'displayed');
    yield app.waitUntilElement(lList, 'displayed');
    var contacts = yield lList.findElements('.contact-item');
    assert.equal(contacts.length, 1);

    var lList = yield app.element('lList');
    var contact = yield lList.findElement('.contact-item');
    yield contact.click();
    yield app.waitUntilElement(contactDetails, 'displayed');

    // Asserting name
    var field = yield app.element('name');
    var name = newContact.givenName + ' ' + newContact.familyName;
    var text = yield field.text();
    assert.equal(name, text);

    // Asserting org
    var field = yield app.element('org');
    var name = newContact.org;
    var text = yield field.text();
    assert.equal(name, text);

    // Asserting phone
    var detailsList = yield app.element('detailsList');
    var elements = yield detailsList.findElements('[data-phone]');
    assert.equal(elements.length, 1);
    var phone = yield detailsList.findElement('#call-or-pick-0');
    var text = newContact.tel[0].value + ' ' + newContact.tel[0].carrier;
    var value = yield phone.text();
    assert.equal(value, text);

    // Asserting address
    elements = yield detailsList.findElements('[data-address]');
    assert.equal(elements.length, 1);
    var address =
      yield detailsList.findElement('#address-details-template-0 b');
    var text = newContact.adr[0].streetAddress;
    text += ' ' + newContact.adr[0].postalCode;
    text += ' ' + newContact.adr[0].locality;
    text += ' ' + newContact.adr[0].countryName;
    var value = yield address.text();
    assert.equal(value.replace(/\n/g, ' '), text);

    // Asserting email
    elements = yield detailsList.findElements('[data-mail]');
    assert.equal(elements.length, 1);
    var email = yield detailsList.findElement('#email-or-pick-0');
    var text = newContact.email[0].value;
    var value = yield email.text();
    assert.equal(value, text);

    // Asserting comment
    elements = yield detailsList.findElements('[data-comment]');
    assert.equal(elements.length, 1);
    var comment = yield detailsList.findElement('#note-details-template-0');
    var text = newContact.comment[0];
    var value = yield comment.text();
    assert.equal(value, text);

  });

  test('Edit a contact changing the name and the phone number ', function() {
    var contactsList = yield app.element('contactsList');
    var contactDetails = yield app.element('contactDetails');
    var contactsForm = yield app.element('contactsForm');
    var editButton = yield app.element('editButton');
    var deleteButton = yield app.element('deleteButton');
    var noContacts = yield app.element('noContacts');
    var lList = yield app.element('lList');
    var doneButton = yield app.element('doneButton');

    var contact = yield lList.findElement('.contact-item');
    yield contact.click();

    var mirror = yield app.element('mirrorDetails');
    yield app.waitUntilElement(mirror, 'displayed');

    yield editButton.click();
    yield app.waitUntilElement(contactsForm, 'displayed');

    var form = yield app.element('form');
    var updatedContact = {
      givenName: 'Test',
      tel: [
        {
          value: '(47) 5098-7516-22'
        }
      ]
    };
    yield app.updateForm(form, updatedContact);

    yield doneButton.click();
    var mirror = yield app.element('mirrorDetails');

    // Asserting name
    var field = yield app.element('name');

    var name = updatedContact.givenName + ' ' + newContact.familyName;
    yield app.waitFor(function(expected) {
      app.waitForElementTextToEqual(field, name, expected);
    });

    // Asserting phone
    var detailsList = yield app.element('detailsList');
    var elements = yield detailsList.findElements('[data-phone]');
    assert.equal(elements.length, 1);
    var phone = yield detailsList.findElement('#call-or-pick-0');
    var text = updatedContact.tel[0].value + ' ' + newContact.tel[0].carrier;
    var value = yield phone.text();
    assert.equal(value, text);

  });

  test('Adding a new email', function() {
    var contactDetails = yield app.element('contactDetails');
    var contactsForm = yield app.element('contactsForm');
    var editButton = yield app.element('editButton');
    var addNewEmailButton = yield app.element('addNewEmailButton');
    var doneButton = yield app.element('doneButton');

    yield editButton.click();
    yield app.waitUntilElement(contactsForm, 'displayed');

    yield addNewEmailButton.click();
    var form = yield app.element('form');
    var mail = 'test@test.com';
    var newEmail = {
      'email[1][value]': mail
    };
    yield app.updateForm(form, newEmail);
    yield doneButton.click();
    var mirror = yield app.element('mirrorDetails');
    yield app.waitUntilElement(mirror, 'displayed');

    // Asserting email
    var detailsList = yield app.element('detailsList');

    yield app.waitFor(function(expected) {
      app.waitForElementsLengthEqual(detailsList, '[data-mail]', 2, expected);
    });
    var email = yield detailsList.findElement('#email-or-pick-1');
    var text = mail;
    var value = yield email.text();
    assert.equal(value, text);
  });

  test('Removing a email', function() {
    // var contactDetails = yield app.element('contactDetails');
    // var contactsForm = yield app.element('contactsForm');
    // var editButton = yield app.element('editButton');
    // var addNewEmailButton = yield app.element('addNewEmailButton');
    // var doneButton = yield app.element('doneButton');
    // var deleteEmailButton =
    //   yield contactsForm.findElement('#add-email-0 > button span');

    // yield editButton.click();
    // yield app.waitUntilElement(contactsForm, 'displayed');

    // yield deleteEmailButton.click();
    // var deletedEmail = yield contactsForm.findElement('#add-email-0');
    // var classList = yield deletedEmail.getAttribute('class');
    // assert.equal(classList, 'email-template removed');

    // yield doneButton.click();
    // var mirror = yield app.element('mirrorDetails');
    // yield app.waitUntilElement(mirror, 'displayed');

    // // Asserting email
    // var detailsList = yield app.element('detailsList');
    // elements = yield detailsList.findElements('[data-mail]');
    // assert.equal(elements.length, 1);
    // var mail = 'test@test.com';
    // var email = yield detailsList.findElement('#email-or-pick-0');
    // var text = mail;
    // var value = yield email.text();
    // assert.equal(value, text);

  });

  test('Adding a comment', function() {
    var contactDetails = yield app.element('contactDetails');
    var contactsForm = yield app.element('contactsForm');
    var editButton = yield app.element('editButton');
    var addNewCommentButton = yield app.element('addNewCommentButton');
    var doneButton = yield app.element('doneButton');

    yield editButton.click();
    yield app.waitUntilElement(contactsForm, 'displayed');

    yield addNewCommentButton.click();
    var form = yield app.element('form');
    var comment = 'test comment';
    var newComment = {
      'comment[1]': comment
    };
    yield app.updateForm(form, newComment);
    yield doneButton.click();
    var mirror = yield app.element('mirrorDetails');
    yield app.waitUntilElement(mirror, 'displayed');

    // Asserting comment
    var detailsList = yield app.element('detailsList');

    yield app.waitFor(function(expected) {
      app.waitForElementsLengthEqual(
        detailsList, '[data-comment]', 2, expected);
    });
    var commentField =
      yield detailsList.findElement('#note-details-template-0');
    var text = newContact['comment'][0];
    var value = yield commentField.text();
    assert.equal(value, text);

    var commentField =
      yield detailsList.findElement('#note-details-template-1');
    var text = comment;
    var value = yield commentField.text();
    assert.equal(value, text);
  });

  test('Favorite a contact', function() {
    var favoriteButton = yield app.element('favoriteButton');
    var detailsName = yield app.element('contact-name-title');

    yield favoriteButton.click();
    yield app.waitForElementTextToEqual(favoriteButton, 'Remove as Favorite',
      function() {
        assert.isTrue(detailsName.classList.contains('favorite'),
                      'shows the star');
    });
  });

  test('Unfavorite a contact', function() {
    var favoriteButton = yield app.element('favoriteButton');
    var detailsName = yield app.element('contact-name-title');

    yield favoriteButton.click();

    yield app.waitForElementTextToEqual(favoriteButton, 'Add as Favorite',
      function() {
        assert.isFalse(detailsName.classList.contains('favorite'),
                      'hides the star');
    });
  });

  test('Changing address type', function() {
    var contactDetails = yield app.element('contactDetails');
    var contactsForm = yield app.element('contactsForm');
    var editButton = yield app.element('editButton');
    var addNewEmailButton = yield app.element('addNewEmailButton');
    var doneButton = yield app.element('doneButton');
    var tagsView = yield app.element('tagsView');

    yield editButton.click();
    yield app.waitUntilElement(contactsForm, 'displayed');

    var addressType = yield contactsForm.findElement('#address_type_0');
    yield addressType.click();
    yield app.waitUntilElement(tagsView, 'displayed');

    var workType =
      yield tagsView.findElement('#tags-list li:last-child button');
    yield workType.click();
    // assert icon
    var classButton = yield workType.getAttribute('class');
    assert.equal(classButton, 'icon icon-selected');

    var tagDone = yield app.element('tagDone');
    yield tagDone.click();

    var text = 'WORK';
    var addressType = yield contactsForm.findElement('#address_type_0');
    var value = yield addressType.text();
    assert.equal(value, text);
  });

  test('removing a contact', function() {
    var contactsList = yield app.element('contactsList');
    var contactDetails = yield app.element('contactDetails');
    var contactsForm = yield app.element('contactsForm');
    var editButton = yield app.element('editButton');
    var deleteButton = yield app.element('deleteButton');
    var noContacts = yield app.element('noContacts');
    var lList = yield app.element('lList');

    yield editButton.click();
    yield app.waitUntilElement(contactsForm, 'displayed');

    yield deleteButton.click();
    var dialogScreen = yield app.element('dialogScreen');
    var confirmButton = yield dialogScreen.findElement('button.danger');
    yield app.waitUntilElement(dialogScreen, 'displayed');
    yield confirmButton.click();

    yield app.waitUntilElement(noContacts, 'displayed');
    var contacts = yield lList.findElements('.contact-item');
    assert.equal(contacts.length, 0);
  });
});
