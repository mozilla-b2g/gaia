'use strict';

/* globals SearchProvider */

require('/shared/js/search_provider.js');

var config = {

  'search_providers': {

    'yahoo': {
      'title': 'Yahoo',
      'search': {
        'url': 'https://yahoo.com/search',
        'params': {'p': '{searchTerms}'}
      },
      'suggest': {
        'url': 'https://yahoo.com/sugg/ff',
        'params': {'command': '{searchTerms}'}
      }
    },

    'ddg': {
      'title': 'DuckDuckGo',
      'search': {
        'url': 'https://ddg.com/',
        'params': {'t': 'ffos', 'q': '{searchTerms}'}
      },
      'suggest': {
        'url': 'https://ddg.com/ac/',
        'params': {'q': '{searchTerms}', 'type': 'list'}
      }
    }
  },

  'simConfigs': {
    '123-456': {
      'es-ES': {
        'defaultEngine': 'yahoo',
        'providers': {
          'yahoo': {
            'search': {'params': {'custom': 'code'}}
          }
        }
      }
    }
  },

  'partnerConfig': {
    'anOEM': {
      'en-US': {
        'defaultEngine': 'ddg',
        'providers': {
          'ddg': {
            'suggest': {'params': {'custom': 'partner'}}
          }
        }
      }
    }
  },

  'defaultEngines': {
    'defaultEngine': 'ddg',
    'providers': {
      'yahoo': {},
      'ddg': {}
    }
  },

  'locales': {
    'en-FR': {
      'ddg': {
        'search': {'url': 'https://duckduckgo.fr/'}
      }
    }
  }
};

suite('system/SearchProvider', function() {

  test('Basic Default', function() {
    assert.deepEqual(SearchProvider.pickEngines(config, [], null, null), {
      'defaultEngine': 'ddg',
      'providers': {
        'yahoo': {
          'title': 'Yahoo',
          'searchUrl': 'https://yahoo.com/search?p={searchTerms}',
          'suggestUrl': 'https://yahoo.com/sugg/ff?command={searchTerms}',
        },
        'ddg': {
          'title': 'DuckDuckGo',
          'searchUrl': 'https://ddg.com/?t=ffos&q={searchTerms}',
          'suggestUrl': 'https://ddg.com/ac/?q={searchTerms}&type=list'
        }
      }
    });
  });

  test('Basic Locale', function() {
    assert.deepEqual(SearchProvider.pickEngines(config, [], null, 'en-FR'), {
      'defaultEngine': 'ddg',
      'providers': {
        'yahoo': {
          'title': 'Yahoo',
          'searchUrl': 'https://yahoo.com/search?p={searchTerms}',
          'suggestUrl': 'https://yahoo.com/sugg/ff?command={searchTerms}',
        },
        'ddg': {
          'title': 'DuckDuckGo',
          'searchUrl': 'https://duckduckgo.fr/?t=ffos&q={searchTerms}',
          'suggestUrl': 'https://ddg.com/ac/?q={searchTerms}&type=list'
        }
      }
    });
  });

  test('Match Sim', function() {
    var sims = ['123-456'];
    assert.deepEqual(SearchProvider.pickEngines(config, sims, null, 'es-ES'), {
      'defaultEngine': 'yahoo',
      'providers': {
        'yahoo': {
          'title': 'Yahoo',
          'searchUrl': 'https://yahoo.com/search?p={searchTerms}&custom=code',
          'suggestUrl': 'https://yahoo.com/sugg/ff?command={searchTerms}',
        }
      }
    });
  });

  test('Match Partner', function() {
    assert.deepEqual(SearchProvider.pickEngines(config, [], 'anOEM', 'en-US'), {
      'defaultEngine': 'ddg',
      'providers': {
        'ddg': {
          'title': 'DuckDuckGo',
          'searchUrl': 'https://ddg.com/?t=ffos&q={searchTerms}',
          'suggestUrl': 'https://ddg.com/ac/?q={searchTerms}&' +
            'type=list&custom=partner'
        }
      }
    });
  });

});
