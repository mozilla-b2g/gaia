'use strict';

 function MockContactAllFields() {
  return {
    'id': '1',
    'updated': new Date(),
    'additionalName': [''],
    'adr': [
      {
        'countryName': 'Germany',
        'locality': 'Chemnitz',
        'postalCode': '09034',
        'streetAddress': 'Gotthardstrasse 22'
      }
    ],
    'bday': '1978-12-20',
    'email': [
      {
        'type': 'Personal',
        'value': 'test@test.com'
      }
    ],
    'familyName': ['Grillo'],
    'givenName': ['Pepito'],
    'jobTitle': [''],
    'name': [
      'Pepito Grillo'
    ],
    'org': ['Test'],
    'tel': [
      {
        'value': '+346578888888',
        'type': 'Mobile',
        'carrier': 'TEF'
      }
    ],
    'category': [
      'favorite'
    ],
    'note': [
      'Note 1'
    ],
    'photo': ['test.png']
  };
}
