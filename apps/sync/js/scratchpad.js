'use strict';

/* global
  SYNC_DEBUG,
  asyncStorage,
  LazyLoader
*/

/* exported
  dsSync,
  addBookmark,
  listBookmarks,
  listTitle,
  genDummy,
  getFxBookmarksStore,
  getLastRevisionId,
  updateHistoryId
*/

var placesStore;
var bookmarksStore;
var fxBookmarksStore;
var sample;

(function (){
  console.log('scratchpad init.');
  getPlacesStore();
  getBookmarksStore();
  //getFxBookmarksStore();
  //listTitle();
  LazyLoader.load(['js/adapters/history.js',
                   'shared/js/async_storage.js']);

})();

function getLastRevisionId (n) {
  asyncStorage.key(n ? n : 0, l => {
    console.log(l);
    asyncStorage.getItem(l, m => console.log(m));
  });
}

function history(){
  return SYNC_DEBUG.syncEngine._getCollection('history');
}

function genDummy(i, type) {
  type = type ? type : 2;
  return {
    payload: {
      title: 'dummy' + i,
      id: null,
      histUri: 'http://test.dummy' + i,
      visits: [{
        date: Date.now() * 1000,
        type: type
      }]
    }
  };
}

function syncLocalWins() {
  var collection = history();
  return collection.sync()
  .then(res => {
    console.log(res);
    if (res.ok) {
      return res;
    }

    // If conflicts, take remote version and sync again.
    return Promise.all(res.conflicts.map(conflict => {
      return collection.resolve(conflict, conflict.local);
    }));
    //.then(_ => sync());
  })
  .catch(error => {
    console.error(error);
  });
}

function updateHistoryId(fxsyncId){
  var collection = history();

  return collection.get(fxsyncId).then((result) => {
    console.log(result);
    result.data.payload.id = fxsyncId;
    collection.update(result.data).then(updatedResult => {
      console.log(updatedResult);
      return syncLocalWins();
    });
  }).then(console.log.bind(console))
  .catch(console.error.bind(console));
}

function listTitle() {
  history().list().then(list => {
    list.data.forEach((item, index) => {
      /*console.log(item);*/
      if(item.payload.title){
        console.log(index, item.payload.title);
      }
    });
  });
}

function bookmarks(){
  return SYNC_DEBUG.syncEngine._getCollection('bookmarks');
}

function listBookmarks() {
  bookmarks().list().then(list => {
    console.log(list);
  });
}

function getPlacesStore() {
  navigator.getDataStores('places').then(stores => {
    placesStore = stores[0];
  });
}

function getBookmarksStore() {
  navigator.getDataStores('bookmarks_store').then(stores => {
    bookmarksStore = stores[0];
  });
}

function getFxBookmarksStore() {
  navigator.getDataStores('sync_bookmarks_store').then(stores => {
    fxBookmarksStore = stores[0];
  });
}

function dsSync(store, cb, revisionId) {
  var cursor = store.sync(revisionId);
  runNextTask(cursor);

  function runNextTask(cursor) {
   cursor.next().then(function(task) {
     manageTask(cursor, task);
   });
  }

  function manageTask(cursor, task) {
    cb(task);
    if (task.operation == 'done') {
      return;
    }
    runNextTask(cursor);
  }
}

function addBookmark(i) {
  var newdata = sampleToDs(sample.data[i]);
  fxBookmarksStore.add(newdata, newdata.id);
}

function sampleToDs(data) {
  var payload = data.payload;
  return {
    // URL is the ID for bookmark records in bookmarks_store, but there are
    // some types without a valid URL except bookmark type. URL is used as
    // its ID to compatible bookmarks_store for bookmark type record.
    // The combination of type and fxsyncID is used as its ID for the types
    // except bookmark.
    id: payload.type === 'bookmark' ? payload.bmkUri :
      (payload.type + '|' + payload.id),
    url: payload.bmkUri,
    name: payload.title,
    type: payload.type === 'bookmark' ? 'url' : 'others',
    iconable: false,
    icon: '',
    last_modified: data.last_modified,
    fxsyncPayload: payload,
    fxsyncId: payload.id
  };
}

sample = {
  'data': [
    {
      'id': 'qbl0XCFiJhAS',
      'sortindex': 2075,
      'last_modified': 1443168918770,
      'payload': {
        'id': 'qbl0XCFiJhAS',
        'type': 'bookmark',
        'title': 'EA Games - Electronic Arts',
        'parentName': 'Bookmarks Menu',
        'bmkUri': 'http://www.ea.com/',
        'tags': [],
        'keyword': null,
        'description': 'Browse and buy Electronic Arts games, play free games' +
', or watch trailers for EA games like Madden NFL, The Sims, Battlefield, Nee' +
'd For Speed and more!',
        'loadInSidebar': false,
        'parentid': 'menu'
      }
    },
    {
      'id': 'menu',
      'sortindex': 1000000,
      'last_modified': 1443168918770,
      'payload': {
        'id': 'menu',
        'type': 'folder',
        'parentName': '',
        'title': 'Bookmarks Menu',
        'description': null,
        'children': [
          '5GURHtbQWgX7',
          'kKNLD_eRsc8i',
          'XpMSrSZzf7Wo',
          '5CvgOyrPAjGs',
          'GpUnhy9nXlwV',
          'qbl0XCFiJhAS'
        ],
        'parentid': 'places'
      }
    },
    {
      'id': '9TWoNm5ZRAGk',
      'last_modified': 1443168880000,
      'payload': {
        'id': '9TWoNm5ZRAGk',
        'type': 'item',
        'deleted': true
      }
    },
    {
      'id': 'toolbar',
      'sortindex': 1000000,
      'last_modified': 1443168846500,
      'payload': {
        'id': 'toolbar',
        'type': 'folder',
        'parentName': '',
        'title': 'Bookmarks Toolbar',
        'description': 'Add bookmarks to this folder to see them displayed on' +
' the Bookmarks Toolbar',
        'children': [
          'n6DY5Gt5OAoh',
          'brL19WNO7I7X',
          'm6VG6h6ol6yL',
          'TltE359v7oeV'
        ],
        'parentid': 'places'
      }
    },
    {
      'id': 'TltE359v7oeV',
      'sortindex': 2225,
      'last_modified': 1443168846500,
      'payload': {
        'id': 'TltE359v7oeV',
        'type': 'bookmark',
        'title': 'Ford – New Cars, Trucks, SUVs, Hybrids & Crossovers | Ford ' +
'Vehicles',
        'parentName': 'Bookmarks Toolbar',
        'bmkUri': 'http://www.ford.com/',
        'tags': [],
        'keyword': null,
        'description': 'The Official Ford Site to research, learn and shop fo' +
'r all new Ford Vehicles. View photos, videos, specs, compare competitors, bu' +
'ild and price, search inventory and more on Ford.com.',
        'loadInSidebar': false,
        'parentid': 'toolbar'
      }
    },
    {
      'id': 'Zh_SSReAnk36',
      'sortindex': 175,
      'last_modified': 1443168808550,
      'payload': {
        'id': 'Zh_SSReAnk36',
        'type': 'bookmark',
        'title': 'DIOR官方網站',
        'parentName': 'Unsorted Bookmarks',
        'bmkUri': 'http://www.dior.com/home/zh_tw',
        'tags': [],
        'keyword': null,
        'description': 'DIOR官方網站。探索Christian Dior男士和女士時裝、香水和配飾的' +
'世界。',
        'loadInSidebar': false,
        'parentid': 'unfiled'
      }
    },
    {
      'id': 'unfiled',
      'sortindex': 1000000,
      'last_modified': 1443168808550,
      'payload': {
        'id': 'unfiled',
        'type': 'folder',
        'parentName': '',
        'title': 'Unsorted Bookmarks',
        'description': null,
        'children': [
          'Zh_SSReAnk36'
        ],
        'parentid': 'places'
      }
    },
    {
      'id': 'm6VG6h6ol6yL',
      'sortindex': 4300,
      'last_modified': 1443168769030,
      'payload': {
        'id': 'm6VG6h6ol6yL',
        'type': 'bookmark',
        'title': 'Volvo - home :',
        'parentName': 'Bookmarks Toolbar',
        'bmkUri': 'http://www.volvo.com/group/volvosplash-global/en-gb/Pages/' +
'volvo_splash.aspx',
        'tags': [],
        'keyword': null,
        'description': 'Landing page for Volvo Group -',
        'loadInSidebar': false,
        'parentid': 'toolbar'
      }
    },
    {
      'id': 'GpUnhy9nXlwV',
      'sortindex': 75,
      'last_modified': 1443168706540,
      'payload': {
        'id': 'GpUnhy9nXlwV',
        'type': 'bookmark',
        'title': 'Home - LEGO.com',
        'parentName': 'Bookmarks Menu',
        'bmkUri': 'http://www.lego.com/en-us/default.aspx',
        'tags': [],
        'keyword': null,
        'description': '',
        'loadInSidebar': false,
        'parentid': 'menu'
      }
    },
    {
      'id': 'ZboS1jyyBYAL',
      'sortindex': 0,
      'last_modified': 1442804704160,
      'payload': {
        'id': 'ZboS1jyyBYAL',
        'type': 'query',
        'title': 'History',
        'parentName': '',
        'bmkUri': 'place:type=3&sort=4',
        'tags': [],
        'keyword': null,
        'description': null,
        'loadInSidebar': false,
        'parentid': 'oFPT5FsL2eSC'
      }
    },
    {
      'id': 'Y_HEAc19y99B',
      'sortindex': 0,
      'last_modified': 1442804704160,
      'payload': {
        'id': 'Y_HEAc19y99B',
        'type': 'query',
        'title': null,
        'parentName': 'All Bookmarks',
        'bmkUri': 'place:folder=BOOKMARKS_MENU',
        'tags': [],
        'keyword': null,
        'description': null,
        'loadInSidebar': false,
        'parentid': 'wWiYLXN692BG'
      }
    },
    {
      'id': 'y4WdvNRNU2mo',
      'sortindex': 0,
      'last_modified': 1442804704160,
      'payload': {
        'id': 'y4WdvNRNU2mo',
        'type': 'query',
        'title': 'Downloads',
        'parentName': '',
        'bmkUri': 'place:transition=7&sort=4',
        'tags': [],
        'keyword': null,
        'description': null,
        'loadInSidebar': false,
        'parentid': 'oFPT5FsL2eSC'
      }
    },
    {
      'id': 'wWiYLXN692BG',
      'sortindex': 1000000,
      'last_modified': 1442804704160,
      'payload': {
        'id': 'wWiYLXN692BG',
        'type': 'folder',
        'parentName': '',
        'title': 'All Bookmarks',
        'description': null,
        'children': [
          'jCTiOAdgxbuV',
          'Y_HEAc19y99B',
          'rkcKN4Y1_SXh'
        ],
        'parentid': 'oFPT5FsL2eSC'
      }
    },
    {
      'id': 'rkcKN4Y1_SXh',
      'sortindex': 0,
      'last_modified': 1442804704160,
      'payload': {
        'id': 'rkcKN4Y1_SXh',
        'type': 'query',
        'title': null,
        'parentName': 'All Bookmarks',
        'bmkUri': 'place:folder=UNFILED_BOOKMARKS',
        'tags': [],
        'keyword': null,
        'description': null,
        'loadInSidebar': false,
        'parentid': 'wWiYLXN692BG'
      }
    },
    {
      'id': 'places',
      'sortindex': 1000000,
      'last_modified': 1442804704160,
      'payload': {
        'id': 'places',
        'type': 'folder',
        'title': '',
        'description': null,
        'children': [
          'menu________',
          'toolbar_____',
          'tags________',
          'unfiled_____',
          'oFPT5FsL2eSC'
        ],
        'parentid': 'FqlY3AYiIqzN'
      }
    },
    {
      'id': 'oFPT5FsL2eSC',
      'sortindex': 1000000,
      'last_modified': 1442804704160,
      'payload': {
        'id': 'oFPT5FsL2eSC',
        'type': 'folder',
        'parentName': '',
        'title': '',
        'description': null,
        'children': [
          'ZboS1jyyBYAL',
          'y4WdvNRNU2mo',
          'hRJAs9Tub5a4',
          'wWiYLXN692BG'
        ],
        'parentid': 'places'
      }
    },
    {
      'id': 'jCTiOAdgxbuV',
      'sortindex': 0,
      'last_modified': 1442804704160,
      'payload': {
        'id': 'jCTiOAdgxbuV',
        'type': 'query',
        'title': null,
        'parentName': 'All Bookmarks',
        'bmkUri': 'place:folder=TOOLBAR',
        'tags': [],
        'keyword': null,
        'description': null,
        'loadInSidebar': false,
        'parentid': 'wWiYLXN692BG'
      }
    },
    {
      'id': 'hRJAs9Tub5a4',
      'sortindex': 0,
      'last_modified': 1442804704160,
      'payload': {
        'id': 'hRJAs9Tub5a4',
        'type': 'query',
        'title': 'Tags',
        'parentName': '',
        'bmkUri': 'place:type=6&sort=1',
        'tags': [],
        'keyword': null,
        'description': null,
        'loadInSidebar': false,
        'parentid': 'oFPT5FsL2eSC'
      }
    },
    {
      'id': 'XpMSrSZzf7Wo',
      'sortindex': 0,
      'last_modified': 1442563791520,
      'payload': {
        'id': 'XpMSrSZzf7Wo',
        'type': 'separator',
        'parentName': 'Bookmarks Menu',
        'pos': 2,
        'parentid': 'menu'
      }
    },
    {
      'id': 'uT9oZbSBSlgI',
      'sortindex': 140,
      'last_modified': 1442563791520,
      'payload': {
        'id': 'uT9oZbSBSlgI',
        'type': 'bookmark',
        'title': 'About Us',
        'parentName': 'Mozilla Firefox',
        'bmkUri': 'https://www.mozilla.org/en-US/about/',
        'tags': [],
        'keyword': null,
        'description': null,
        'loadInSidebar': false,
        'parentid': '5CvgOyrPAjGs'
      }
    },
    {
      'id': 'n6DY5Gt5OAoh',
      'sortindex': 150,
      'last_modified': 1442563791520,
      'payload': {
        'id': 'n6DY5Gt5OAoh',
        'type': 'query',
        'queryId': 'MostVisited',
        'title': 'Most Visited',
        'parentName': 'Bookmarks Toolbar',
        'bmkUri': 'place:sort=8&maxResults=10',
        'tags': [],
        'keyword': null,
        'description': null,
        'loadInSidebar': false,
        'parentid': 'toolbar'
      }
    },
    {
      'id': 'kKNLD_eRsc8i',
      'sortindex': 0,
      'last_modified': 1442563791520,
      'payload': {
        'id': 'kKNLD_eRsc8i',
        'type': 'query',
        'queryId': 'RecentTags',
        'title': 'Recent Tags',
        'parentName': 'Bookmarks Menu',
        'bmkUri': 'place:type=6&sort=14&maxResults=10',
        'tags': [],
        'keyword': null,
        'description': null,
        'loadInSidebar': false,
        'parentid': 'menu'
      }
    },
    {
      'id': 'EOtQcPUj1If8',
      'sortindex': 140,
      'last_modified': 1442563791520,
      'payload': {
        'id': 'EOtQcPUj1If8',
        'type': 'bookmark',
        'title': 'Get Involved',
        'parentName': 'Mozilla Firefox',
        'bmkUri': 'https://www.mozilla.org/en-US/contribute/',
        'tags': [],
        'keyword': null,
        'description': null,
        'loadInSidebar': false,
        'parentid': '5CvgOyrPAjGs'
      }
    },
    {
      'id': 'DASKBSkTxuwB',
      'sortindex': 140,
      'last_modified': 1442563791520,
      'payload': {
        'id': 'DASKBSkTxuwB',
        'type': 'bookmark',
        'title': 'Customize Firefox',
        'parentName': 'Mozilla Firefox',
        'bmkUri': 'https://www.mozilla.org/en-US/firefox/customize/',
        'tags': [],
        'keyword': null,
        'description': null,
        'loadInSidebar': false,
        'parentid': '5CvgOyrPAjGs'
      }
    },
    {
      'id': 'brL19WNO7I7X',
      'sortindex': 290,
      'last_modified': 1442563791520,
      'payload': {
        'id': 'brL19WNO7I7X',
        'type': 'bookmark',
        'title': 'Getting Started',
        'parentName': 'Bookmarks Toolbar',
        'bmkUri': 'https://www.mozilla.org/en-US/firefox/central/',
        'tags': [],
        'keyword': null,
        'description': null,
        'loadInSidebar': false,
        'parentid': 'toolbar'
      }
    },
    {
      'id': '5GURHtbQWgX7',
      'sortindex': 0,
      'last_modified': 1442563791520,
      'payload': {
        'id': '5GURHtbQWgX7',
        'type': 'query',
        'queryId': 'RecentlyBookmarked',
        'title': 'Recently Bookmarked',
        'parentName': 'Bookmarks Menu',
        'bmkUri': 'place:folder=BOOKMARKS_MENU&folder=UNFILED_BOOKMARKS&folde' +
'r=TOOLBAR&queryType=1&sort=12&maxResults=10&excludeQueries=1',
        'tags': [],
        'keyword': null,
        'description': null,
        'loadInSidebar': false,
        'parentid': 'menu'
      }
    },
    {
      'id': '5CvgOyrPAjGs',
      'sortindex': 1000000,
      'last_modified': 1442563791520,
      'payload': {
        'id': '5CvgOyrPAjGs',
        'type': 'folder',
        'parentName': 'Bookmarks Menu',
        'title': 'Mozilla Firefox',
        'description': null,
        'children': [
          '4dzbQpXqq4Ok',
          'DASKBSkTxuwB',
          'EOtQcPUj1If8',
          'uT9oZbSBSlgI'
        ],
        'parentid': 'menu'
      }
    },
    {
      'id': '4dzbQpXqq4Ok',
      'sortindex': 140,
      'last_modified': 1442563791520,
      'payload': {
        'id': '4dzbQpXqq4Ok',
        'type': 'bookmark',
        'title': 'Help and Tutorials',
        'parentName': 'Mozilla Firefox',
        'bmkUri': 'https://www.mozilla.org/en-US/firefox/help/',
        'tags': [],
        'keyword': null,
        'description': null,
        'loadInSidebar': false,
        'parentid': '5CvgOyrPAjGs'
      }
    }
  ]
};
