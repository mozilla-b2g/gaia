'use strict';


function MockContact(name) {
  name = typeof name !== 'undefined' ? name : {
    familyName: ['O\'Hare'],
    givenName: ['Pepito']
  };
  if (!(this instanceof MockContact)) {
    return new MockContact(name);
  }
  var data;

  // This serves only to make readable
  // sense of the  assignments that will follow.
  if (typeof name === 'object') {
    data = name;
  }

  this.id = '1';

  this.familyName = data.familyName || ['Hughes'];
  this.givenName = data.givenName || ['Howard'];
  this.name = [
    [this.givenName, this.familyName].join(' ')
  ];

  this.tel = [
    {
      'value': '+346578888888',
      'type': ['Mobile'],
      'carrier': 'TEF'
    },
    {
      'value': '+12125559999',
      'type': 'Batphone', // Make sure we cover both strings and arrays
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

  this.org = data.org || ['Initech'];
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
