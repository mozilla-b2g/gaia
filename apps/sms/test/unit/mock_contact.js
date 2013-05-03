'use strict';


function MockContact(name) {
  name = typeof name !== 'undefined' ? name : {
    familyName: ['Grillo'],
    givenName: ['Pepito']
  };
  if (!(this instanceof MockContact)) {
    return new MockContact(name);
  }
  this.id = '1';

  this.familyName = name.familyName;
  this.givenName = name.givenName;
  this.name = [
    [this.givenName, this.familyName].join(' ')
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

  this.email = [
    {
      'value': 'a@b.com'
    }
  ];

  this.category = [
    'favorite'
  ];

  this.org = [
    ''
  ];
}

/*

  MockContact.list([names])

  Create contacts lists

  MockContact.list();

  MockContact.list([
    { givenName: ['Jane'], familyName: ['Doozer'] },
    { givenName: ['doug'], familyName: ['dooley'] }
  ]);
 */

MockContact.list = function(names) {
  if (names && names.length) {
    return names.map(function(name) {
      return new MockContact(name);
    });
  } else {
    return [new MockContact()];
  }
};
