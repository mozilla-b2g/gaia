/* globals Promise */
/* exported MockICEStore */
'use strict';

var MockICEStore = {
  setContacts: function mis_setContacts(ids) {
    MockICEStore.ids = ids;
    return Promise.resolve();
  },
  getContacts: function mis_getContacts() {
    return Promise.resolve(MockICEStore.ids);
  }
};
