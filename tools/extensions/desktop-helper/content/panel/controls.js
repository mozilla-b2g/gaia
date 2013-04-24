!function() {

  function sendChromeEvent(detail) {
    var contentDetail = Components.utils.createObjectIn(tab);
    for (var i in detail) {
      contentDetail[i] = detail[i];
    }
    Components.utils.makeObjectPropsNormal(contentDetail);
    var customEvt = tab.document.createEvent('CustomEvent');
    customEvt.initCustomEvent('mozChromeEvent', true, true, contentDetail);
    tab.dispatchEvent(customEvt);
  }

  function HardwareButtons() {

  }

  HardwareButtons.prototype = {
    home: function() {
      var event = tab.CustomEvent('home');
      tab.dispatchEvent(event);
    },
    holdHome: function() {
      var event = tab.CustomEvent('holdhome');
      tab.dispatchEvent(event);
    },
    volumeUp: function() {
      var event = tab.CustomEvent('volumeup');
      tab.dispatchEvent(event);
    },
    volumeDown: function() {
      var event = tab.CustomEvent('volumedown');
      tab.dispatchEvent(event);
    },
    sleep: function() {
      var event = tab.CustomEvent('sleep');
      tab.dispatchEvent(event);
    },
    wake: function() {
      var event = tab.CustomEvent('wake');
      tab.dispatchEvent(event);
    },
    holdSleep: function() {
      var event = tab.CustomEvent('holdsleep');
      tab.dispatchEvent(event);
    }
  };
  window.hardware = new HardwareButtons();

  function Emulation() {

  }

  Emulation.prototype = {
    notification: function() {
      sendChromeEvent({
        type: 'desktop-notification',
        id: 123,
        title: 'Some Notification',
        text: 'I love notifications.',
        manifestURL: 'http://sytem.gaiamobile.org:8080/manifest.webapp'
      });
    }
  };
  window.emulation = new Emulation();

  function randomDate(start, end) {
    return new Date(start.getTime() + Math.random() *
      (end.getTime() - start.getTime()));
  }

  var ContactActions = {
    generateContacts: function(amount) {
      for (var i = 0; i < amount; i++) {
        var firstName = Faker.Name.firstName();
        var lastName = Faker.Name.lastName();

        window.navigator.mozContacts.save({
          'id': '' + (i + 1),
          'updated': new Date(),
          'additionalName': [''],
          'adr': [
            {
              'countryName': Faker.Address.ukCountry(),
              'locality': Faker.Address.city(),
              'postalCode': Faker.Address.zipCode(),
              'streetAddress': Faker.Address.streetAddress()
            }
          ],
          'bday': randomDate(new Date(1910, 0, 1), new Date()),
          'email': [
            {
              'type': 'Personal',
              'value': Faker.Internet.email()
            }
          ],
          'familyName': [lastName],
          'givenName': [firstName],
          'jobTitle': [''],
          'name': [firstName + ' ' + lastName],
          'org': [Faker.Company.companyName()],
          'tel': [
            {
              'value': Faker.PhoneNumber.phoneNumber(),
              'type': 'Mobile',
              'carrier': 'TEL'
            }
          ],
          'category': [],
          'note': [Faker.Lorem.sentence()]
        });
      }
    }
  };

  window.contactActions = ContactActions;
}();
