/* exported MockLoadJSON */
'use strict';
var MockLoadJSON = {
  user_data: {},

  set_data: function set_data(user_dict) {
    MockLoadJSON.user_data = user_dict;
  },

  get_data: function get_data() {
    return MockLoadJSON.user_data;
  },

  loadJSON: function load_json(path, callback) {
    callback(MockLoadJSON.user_data);
  }
};
