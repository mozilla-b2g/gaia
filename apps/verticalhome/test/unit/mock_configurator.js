'use strict';

var confSV = {
  'https://owdstore.hi.inet/operRes/spainResources.webapp':
    {
      'manifestURL': 'https://owdstore.hi.inet/operRes/spainResources.webapp'
    },
  'https://url/path/appSV.webapp':
    {
      'manifestURL': 'https://url/path/appSV.webapp',
      'location': 1
    }
};

var mcGrid = [
  [
    {
      'manifestURL': 'app://communications.gaiamobile.org/manifest.webapp',
      'name': 'Phone',
      'entry_point': 'dialer',
      'icon': 'app://communications.gaiamobile.org/dialer/icons/Dialer_120.png'
    },{
      'manifestURL': 'app://email.gaiamobile.org/manifest.webapp',
      'name': 'email',
      'icon': 'app://email.gaiamobile.org/style/icons/Email_120.png'
    }
  ],[
    {
      'manifestURL': 'app://communications.gaiamobile.org/manifest.webapp',
      'entry_point': 'contacts',
      'name': 'contacts',
      'icon': 'app://communications.gaiamobile.org/contacts/style/icons/Cont'
    }
  ],[
    {
      'manifestURL': 'app://browser.gaiamobile.org/manifest.webapp',
      'name': 'browser',
      'icon': 'app://browser.gaiamobile.esources/branding/Browser_120.png'
    },{
      'manifestURL': 'app://music.gaiamobile.org/manifest.webapp',
      'icon': 'app://music.gaiamobile.org/style/icons/Music_120.png'
    }
  ]
];

var configurator = {
  getGrid: function() {
    return mcGrid;
  },
  isSingleVariantReady: true,
  getSingleVariantApp: function(manifestURL) {
    return confSV[manifestURL];
  }
};

window.configurator = configurator;
