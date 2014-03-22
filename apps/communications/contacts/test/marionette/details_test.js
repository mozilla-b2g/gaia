var Contacts = require('./lib/contacts');
var assert = require('assert');

marionette('Contacts > Details', function() {
  var client = marionette.client(Contacts.config);
  var subject;
  var selectors;

  setup(function() {
    subject = new Contacts(client);
    subject.launch();

    selectors = Contacts.Selectors;
  });

  test('Display the phone number', function() {
    var tel = 1231231234;

    subject.addContact({
      givenName: 'Hello',
      tel: tel
    });

    client.helper.waitForElement(selectors.listContactFirstText)
      .click();

    subject.waitSlideLeft('details');

    var telNode = client.helper.waitForElement(selectors.detailsTelButtonFirst);
    assert.equal(telNode.text(), tel);
  });

  // Disabled: Bug 982260
  test.skip('Merging 15 contacts', function() {
    var tel = 666666666,
        name = 'María Covadonga',
        duplicateFrame,
        mergeClose,
        mergeAction,
        bodyHeight = client.findElement(selectors.body).size().height;

    for (var i = 1; i <= name.length; i++) {
      subject.addContact({
        givenName: name.substring(0, i),
        tel: tel
      });
      if (i > 1) {
        duplicateFrame = duplicateFrame ||
          client.findElement(selectors.duplicateFrame);
        subject.waitForSlideUp(duplicateFrame);
        client.switchToFrame(duplicateFrame);
        mergeClose = client.helper.waitForElement(selectors.duplicateClose);
        subject.clickOn(mergeClose);
        client.switchToFrame();
        client.apps.switchToApp(Contacts.URL, 'contacts');
        subject.waitForSlideDown(duplicateFrame);
      }
    }

    var clickedContactName;
    var firstContactText = client.helper.waitForElement(
      selectors.listContactFirstText);
    clickedContactName = firstContactText.text();
    subject.clickOn(firstContactText);

    subject.waitSlideLeft('details');

    subject.clickOn(client.helper.waitForElement(
      selectors.detailsFindDuplicate));

    subject.waitForSlideUp(duplicateFrame);
    client.switchToFrame(duplicateFrame);
    mergeAction = client.helper.waitForElement(selectors.duplicateMerge);
    subject.clickOn(mergeAction);
    client.switchToFrame();
    client.apps.switchToApp(Contacts.URL, 'contacts');
    subject.waitForSlideDown(duplicateFrame);

    var detailsEditContact = client.helper.waitForElement(
      selectors.detailsEditContact);
    subject.clickOn(detailsEditContact);

    subject.waitForFormShown();

    var formHeader = client.helper.waitForElement(selectors.formTitle);
    var expectedResult = subject.l10n('/locales-obj/en-US.json',
                                      'editContact');
    var formContactName = client.helper.waitForElement(
      selectors.formGivenName);

    assert.equal(formHeader.text(), expectedResult);
    assert.equal(formContactName.getAttribute('value'), clickedContactName);
  });

});
