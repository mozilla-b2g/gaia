Evme.Config = Evme.__config = {
  'appVersion': '2.0.145',
  'apiHost': 'api.everything.me',
  'apiKey': '1518c0001ff736528322f306f41f027d',
  'authCookieName': 'prod-credentials',
  'apps': {
    'appsPerRow': 4,
    'appHeight': 89,
    'widthForFiveApps': 400,
    'displayInstalledApps': true
  },

  // how many app icons in a Collection icon
  'numberOfAppInCollectionIcon': 3,

  'numberOfAppsToLoad': 16,
  'searchbar': {
    'timeBeforeEventPause': 10000,
    'timeBeforeEventIdle': 10000
  },
  'searchSources': {
    'URL': 'url',
    'SHORTCUT': 'shrt',
    'SHORTCUT_ENTITY': 'enty',
    'SHORTCUT_CONTINUE_BUTTON': 'shrb',
    'SHORTCUT_COLLECTION': 'fldr',
    'RETURN_KEY': 'rtrn',
    'SUGGESTION': 'sugg',
    'SPELLING': 'spel',
    'REFINE': 'refi',
    'HISTORY': 'hist',
    'TYPING': 'type',
    'LOCATION_REFRESH': 'locn',
    'PAUSE': 'wait',
    'MORE': 'more',
    'INFO_WHATIS': 'infw',
    'EMPTY_SEARCHBOX': 'mpty',
    'ME_LIKES': 'like'
  },
  'pageViewSources': {
    'URL': 'url',
    'TAB': 'tab',
    'BACK': 'back',
    'CLEAR_SEARCHBOX': 'clear',
    'SHORTCUT': 'shrt'
  },
  'analytics': {
    'enabled': true,
    'providers': {
      'APIStatsEvents': {
        'enabled': true,
        'requestsPerEventCount': 1
      }
    }
  },
  'maxHistoryEntries': '10',
  'iconsGroupSettings': {
    '1': [{
      'x': 'center',
      'y': 'center',
      'size': 0.65,
      'shadowOffsetX': 0,
      'shadowOffsetY': 2,
      'shadowBlur': 2,
      'shadowOpacity': 0.8
    }],
    '2': [{
      'x': 24,
      'y': 'center',
      'size': 0.5,
      'shadowOffsetX': 0,
      'shadowOffsetY': 2,
      'shadowBlur': 2,
      'shadowOpacity': 0.7
    },
    {
      'x': 6,
      'y': 'center',
      'size': 0.6,
      'shadowOffsetX': 0,
      'shadowOffsetY': 2,
      'shadowBlur': 2,
      'shadowOpacity': 0.8
    }],
    '3': [{
      'x': 'right',
      'y': 'center',
      'size': 0.45,
      'shadowOffsetX': 1,
      'shadowOffsetY': 1,
      'shadowBlur': 2,
      'shadowOpacity': 0.4
    },
    {
      'x': 'center+4',
      'y': 'center',
      'size': 0.5,
      'shadowOffsetX': 1,
      'shadowOffsetY': 1,
      'shadowBlur': 2,
      'shadowOpacity': 0.7
    },
    {
      'x': 'left',
      'y': 'center',
      'size': 0.6,
      'shadowOffsetX': 1,
      'shadowOffsetY': 1,
      'shadowBlur': 2,
      'shadowOpacity': 0.9
    }]
  },
  'design': {
    'apps': {
      'defaultIconUrl': {
        '20': [
          '/everything.me/images/icn/default1.png?cb=1346169250',
          '/everything.me/images/icn/default2.png?cb=1346169250',
          '/everything.me/images/icn/default3.png?cb=1346169250'
        ]
      },
      'defaultAppIcon': {
        'normal': '/style/images/default.png',
        'high': '/style/images/default@2x.png'
      }
    }
  },
    // disableAfter:
    // if the app can't render the feature under the timeout, it will disable it
    // bringBack:
    // if, after disabling the feature, it's faster than bringBack- re-enable it
    'featureStateByConnection': {
      'iconQuality': {
        'disableAfter': 2500,
        'bringBack': 600
      },
      'typingImage': {
        'disableAfter': 3000,
        'bringBack': 1500
      },
      'typingApps': {
        'disableAfter': 3500,
        'bringBack': 800
      }
    },
    // time before refreshing user location (milliseconds)
    'locationInterval': 10 * 60 * 1000,
    // timeout for get location request (milliseconds)
    'locationRequestTimeout': 4000,
    // internal mapping of IDs to l10n keys- DON'T TOUCH
    'shortcutIdsToL10nKeys': {
      '297': 'astrology',
      '288': 'autos',
      '356': 'beauty',
      '22': 'books',
      '225': 'celebs',
      '292': 'daily-deals',
      '320': 'dating',
      '286': 'electronics',
      '248': 'email',
      '376': 'entertainment',
      '361': 'environment',
      '282': 'fashion',
      '277': 'funny',
      '207': 'games',
      '307': 'government',
      '275': 'health',
      '274': 'jobs',
      '296': 'local',
      '278': 'maps',
      '181': 'movies',
      '142': 'music',
      '355': 'new-apps',
      '245': 'news',
      '349': 'photography',
      '270': 'recipes',
      '220': 'restaurants',
      '238': 'shopping',
      '289': 'social',
      '260': 'sports',
      '244': 'tech-news',
      '352': 'top-apps',
      '306': 'travel',
      '213': 'tv',
      '211': 'video',
      '249': 'weather',
      '357': 'utilities'
    }
  };
