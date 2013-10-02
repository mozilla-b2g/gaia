'use strict';

var CORRECT_MATCHED_VALUE = '$correct$';

var dataImage = 'data:image/gif;base64,R0lGODlhyAAiALM...DfD0QAADs=';

var dupContacts = {
  '1a': {
    matchingContact: {
      id: '1a',
      givenName: ['Manolo'],
      familyName: ['García'],
      photo: [dataImage],
      email: [{
        value: 'man@tid.es'
      }]
    },
    matchings: {
      'name': [{
        target: 'Manolo',
        matchedValue: CORRECT_MATCHED_VALUE
      }]
    }
  },
  '2b': {
    matchingContact: {
      id: '2b',
      givenName: ['Manolo'],
      familyName: ['García'],
      photo: [dataImage],
      email: [{
        value: 'man@tid.es'
      }, {
        value: 'man@telefonica.es'
      }]
    },
    matchings: {
      'name': [{
        target: 'Manolo',
        matchedValue: 'Manolo Garcia'
      }],
      'email': [{
        target: 'man@tid.es',
        matchedValue: CORRECT_MATCHED_VALUE
      }]
    }
  },
  '3c': {
    matchingContact: {
      id: '3c',
      givenName: ['Manolo'],
      familyName: ['García'],
      photo: [dataImage],
      email: [{
        value: 'man@tid.es'
      }],
      'tel': [{
        value: '+346578888881',
        type: 'Mobile'
      }]
    },
    matchings: {
      'name': [{
        target: 'Manolo',
        matchedValue: 'Manolo Garcia'
      }],
      'email': [{
        target: 'man@tid.es',
        matchedValue: 'man@tid.es'
      }],
      'tel': [{
        target: '+346578888881',
        matchedValue: CORRECT_MATCHED_VALUE
      }]
    }
  }
};

var matchingDetailsData = {
  'user_id_1': {
    matchingContact: {
    id: 'user_id_1',
    name: ['The Name The Surname'],
    givenName: ['The Name'],
    familyName: ['The Surname'],
    photo: [],
      email: [{
        value: 'email_1@acme.com',
        type: 'email_type_1'
      }, {
        value: 'email_2@acme.com',
        type: 'email_type_2'
      }],
      'tel': [{
        value: '111111111',
        type: 'type_1'
      }, {
        value: '222222222',
        type: 'type_2'
        }]
    },
    matchings: {
      'name': [{
          target: 'The Name The Surname',
          matchedValue: 'The Name The Surname'
      }],
      'tel': [{
          target: '222222222',
          matchedValue: '222222222'
      }],
      'email': [{
          target: 'email_2@acme.com',
          matchedValue: 'email_2@acme.com'
      }]
    }
  },
  'user_id_2': {
    matchingContact: {
    id: 'user_id_2',
    name: ['The Name Another Surname'],
    givenName: ['The Name'],
    familyName: ['Another Surname'],
    photo: [],
      'tel': [{
          value: '111111111',
          type: 'type_1'
      }]
    },
    matchings: {
      'tel': [{
        target: '111111111',
        matchedValue: 'type_1'
      }]
    }
  }
};
