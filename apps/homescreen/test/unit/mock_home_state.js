'use strict';

var MockHomeState = {
  mCounter: 0,

  mTestGrids: [
    [
      {'index': 0, 'icons': []},
      {'index': 1, 'icons': [
        {'manifestURL': 'https://aHost/a_0_1_0',
         'removable': true,
         'name': 'Mock app',
         'icon': 'http://inexistant.name/default_icon.png',
         'isHosted': true,
         'hasOfflineCache': false,
         'desiredPos': 0}
      ]}
    ],
    [
      {'index': 0, 'icons': []},
      {'index': 1, 'icons': [
        {'manifestURL': 'https://aHost/a_1_1_0',
         'removable': true,
         'name': 'Mock app',
         'icon': 'http://inexistant.name/default_icon.png',
         'isHosted': true,
         'hasOfflineCache': false,
         'desiredPos': 0},
        {'manifestURL': 'https://aHost/a_1_1_1',
         'removable': true,
         'name': 'Mock app',
         'icon': 'http://inexistant.name/default_icon.png',
         'isHosted': true,
         'hasOfflineCache': false,
         'desiredPos': 0},
        {'manifestURL': 'https://aHost/a_1_1_2',
         'removable': true,
         'name': 'Mock app',
         'icon': 'http://inexistant.name/default_icon.png',
         'isHosted': true,
         'hasOfflineCache': false,
         'desiredPos': 0}
      ]}
    ],
    [
      {'index': 0, 'icons': []},
      {'index': 1, 'icons': [
        {'manifestURL': 'https://aHost/a_2_1_0',
         'removable': true,
         'name': 'Mock app',
         'icon': 'http://inexistant.name/default_icon.png',
         'isHosted': true,
         'hasOfflineCache': false,
         'desiredPos': 0},
        {'manifestURL': 'https://aHost/a_2_1_1',
         'removable': true,
         'name': 'Mock app',
         'icon': 'http://inexistant.name/default_icon.png',
         'isHosted': true,
         'hasOfflineCache': false,
         'desiredPos': 0}
      ]},
      {'index': 2, 'icons': [
        {'manifestURL': 'https://aHost/a_2_2_0',
         'removable': true,
         'name': 'Mock app',
         'icon': 'http: //inexistant.name/default_icon.png',
         'isHosted': true,
         'hasOfflineCache': false,
         'desiredPos': 0},
        {'manifestURL': 'https://aHost/a_2_2_1',
         'removable': true,
         'name': 'Mock app',
         'icon': 'http://inexistant.name/default_icon.png',
         'isHosted': true,
         'hasOfflineCache': false,
         'desiredPos': 0},
        {'manifestURL': 'https://aHost/a_2_2_2',
         'removable': true,
         'name': 'Mock app',
         'icon': 'http://inexistant.name/default_icon.png',
         'isHosted': true,
         'hasOfflineCache': false,
         'desiredPos': 0}
      ]}
    ],
    [
      {'index': 0, 'icons': []},
      {'index': 1, 'icons': [
        {'manifestURL': 'https://aHost/a_3_1_0',
         'removable': true,
         'name': 'Mock app',
         'icon': 'http://inexistant.name/default_icon.png',
         'isHosted': true,
         'hasOfflineCache': false,
         'desiredPos': 0},
        {'manifestURL': 'https://aHost/a_3_1_1',
         'removable': true,
         'name': 'Mock app',
         'icon': 'http://inexistant.name/default_icon.png',
         'isHosted': true,
         'hasOfflineCache': false,
         'desiredPos': 0}
      ]},
      {'index': 2, 'icons': [
        {'manifestURL': 'https://aHost/a3_2_0',
         'removable': true,
         'name': 'Mock app',
         'icon': 'http://inexistant.name/default_icon.png',
         'isHosted': true,
         'hasOfflineCache': false,
         'desiredPos': 0},
        {'manifestURL': 'https://aHost/a3_2_1',
         'removable': true,
         'name': 'Mock app',
         'icon': 'http://inexistant.name/default_icon.png',
         'isHosted': true,
         'hasOfflineCache': false,
         'desiredPos': 0},
        {'manifestURL': 'https://aHost/a3_2_2',
         'removable': true,
         'name': 'Mock app',
         'icon': 'http://inexistant.name/default_icon.png',
         'isHosted': true,
         'hasOfflineCache': false,
         'desiredPos': 0}
      ]},
      {'index': 3, 'icons': [
        {'manifestURL': 'https://aHost/a3_3_0',
         'removable': true,
         'name': 'Mock app',
         'icon': 'http://inexistant.name/default_icon.png',
         'isHosted': true,
         'hasOfflineCache': false,
         'desiredPos': 0},
        {'manifestURL': 'https://aHost/a3_3_1',
         'removable': true,
         'name': 'Mock app',
         'icon': 'http://inexistant.name/default_icon.png',
         'isHosted': true,
         'hasOfflineCache': false,
         'desiredPos': 0}
      ]}
    ]
  ],

  init: function mhs_init(eachPageCallback, successCallback, errorCallback) {
    // first page is the dock, let's say it's empty
    if (this.mUseTestGrids && this.mTestGrids[this.mCounter]) {
      this.mTestGrids[this.mCounter++].forEach(eachPageCallback);
    } else {
      eachPageCallback({ index: 0, icons: [] });
    }
    successCallback();
  },

  saveGrid: function mhs_saveGrid(state) {
    this.mLastSavedGrid = state;
  },

  saveSVInstalledApps: function mhs_saveSVInstalledApps(svApps) {
    this.mLastSavedInstalledApps = svApps;
  },

  getSVApps: function mhs_getSVApps() { },

  mLastSavedGrid: null,

  mLastSavedInstalledApps: null,

  mUseTestGrids: false,

  mTeardown: function mhs_mTeardown() {
    this.mLastSavedGrid = null;
  }
};
