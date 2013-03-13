'use strict';

function MockContact() {
  if (!(this instanceof MockContact)) {
    return new MockContact();
  }
  this.id = '1';
  this.updated = Date.now();

  this.familyName = ['Grillo'];
  this.givenName = ['Pepito'];
  this.additionalName = [''];
  this.name = [
    [this.givenName, this.familyName].join(' ')
  ];

  this.bday = '1978-12-20';
  this.jobTitle = [''];
  this.org = ['Test'],

  this.adr = [
    {
      countryName: 'Germany',
      locality: 'Chemnitz',
      postalCode: '09034',
      streetAddress: 'Gotthardstrasse 22'
    }
  ];

  this.email = [
    {
      'type': 'Personal',
      'value': 'test@test.com'
    }
  ];

  this.tel = [
    {
      'value': '+346578888888',
      'type': 'Mobile',
      'carrier': 'TEF'
    },
    {
      'value': '+12125559999',
      'type': 'Batphone',
      'carrier': 'XXX'
    }
  ];

  this.category = [
    'favorite'
  ];
}

MockContact.list = function() {
  return [new MockContact()];
};
