console.time("mock_ice_store.js");
/* globals Promise */
/* exported MockICEStore */
'use strict';

var MockICEStore = {
  setContacts: function mis_setContacts(ids) {
    MockICEStore.ids = ids;
    return Promise.resolve(ids);
  },
  getContacts: function mis_getContacts() {
    return Promise.resolve(MockICEStore.ids);
  },
  onChange: function() {}
};
console.timeEnd("mock_ice_store.js");
