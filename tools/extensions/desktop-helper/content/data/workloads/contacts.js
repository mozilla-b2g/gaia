(function() {
    // taken from the unit tests in the contact app in Gaia,
    // but removed photo's and made bday a Date object
    function mockContactsList() {
        return [{
            'id': '1',
            'updated': new Date(),
            'additionalName': [''],
            'adr': [{
                'countryName': 'Germany',
                'locality': 'Chemnitz',
                'postalCode': '09034',
                'streetAddress': 'Gotthardstrasse 22'
            }],
            'bday': new Date('1978-12-20'),
            'email': [{
                'type': 'Personal',
                'value': 'test@test.com'
            }],
            'familyName': ['AD'],
            'givenName': ['Pepito'],
            'jobTitle': [''],
            'name': ['Pepito A'],
            'org': ['Test'],
            'tel': [{
                'value': '+346578888881',
                'type': 'Mobile',
                'carrier': 'TEL'
            }],
            'category': [],
            'note': ['Note 1']
        }, {
            'id': '2',
            'updated': new Date(),
            'additionalName': [''],
            'adr': [{
                'countryName': 'Germany',
                'locality': 'Chemnitz',
                'postalCode': '09034',
                'streetAddress': 'Gotthardstrasse 22'
            }],
            'bday': new Date('1978-12-20'),
            'email': [{
                'type': 'Personal',
                'value': 'test@test.com'
            }],
            'familyName': ['BA'],
            'givenName': ['Pepito'],
            'jobTitle': [''],
            'name': ['Pepito BA'],
            'org': ['Test'],
            'tel': [{
                'value': '+346578888882',
                'type': 'Mobile',
                'carrier': 'TEL'
            }],
            'category': [],
            'note': ['Note 1']
        }, {
            'id': '3',
            'updated': new Date(),
            'additionalName': [''],
            'adr': [{
                'countryName': 'Germany',
                'locality': 'Chemnitz',
                'postalCode': '09034',
                'streetAddress': 'Gotthardstrasse 22'
            }],
            'bday': new Date('1978-12-20'),
            'email': [{
                'type': 'Personal',
                'value': 'test@test.com'
            }],
            'familyName': ['CC'],
            'givenName': ['Antonio'],
            'jobTitle': [''],
            'name': ['Antonio CC'],
            'org': ['Test'],
            'tel': [{
                'value': '+346578888883',
                'type': 'Mobile',
                'carrier': 'TEL'
            }],
            'category': [],
            'note': ['Note 1']
        }];
    }

    var req = window.navigator.mozContacts.find({});
    req.onsuccess = function() {
        console.log('contacts API has', req.result.length, 'records');
        if (req.result.length !== 0) return;

        mockContactsList().forEach(function(contact) {
            var sr = window.navigator.mozContacts.save(contact);
            sr.onsuccess = function() {
                console.log('saving', contact.id, 'successful');
            };
            sr.onerror = function() {
                console.error('saving', contact.id, 'failed');
            };
        });
    };
}());
