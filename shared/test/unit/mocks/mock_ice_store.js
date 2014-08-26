/* globals Promise */
/* exported MockICEStore */
'use strict';

var MockICEStore = {
  ids: [],
  setContacts: function mis_setContacts(ids) {
    return new Promise(function(resolve, reject) {
      MockICEStore.ids = ids;
      resolve();
    });
  },
  getContacts: function mis_getContacts() {
    return new Promise(function(resolve, reject) {
      resolve(MockICEStore.ids);
    });
  }
};
