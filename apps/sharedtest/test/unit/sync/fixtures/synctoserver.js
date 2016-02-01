/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

'use strict';

/* global
  AdapterMock
*/

/* exported
  SynctoServerFixture
*/

var SynctoServerFixture = (function() {
  var syncEngineOptions = {
    URL: 'http://localhost:8000/v1/',
    assertion: 'test-assertion-mock',
    // Taken from https://bugzilla.mozilla.org/show_bug.cgi?id=959919#c13.
    kB: 'fd5c747806c07ce0b9d69dcfea144663e630b65ec4963596a22f24910d7dd15d',
    adapters: {
      history: (typeof AdapterMock === 'undefined' ? null :  AdapterMock())
    }
  };

  // Taken from https://bugzilla.mozilla.org/show_bug.cgi?id=959919#c13.
  var xClientState = '6ae94683571c7a7c54dab4700aa3995f';

  var metaGlobalPayloadWithHistoryEngine = JSON.stringify({
    syncID: 'NOuEmrZxVWxl',
    storageVersion: 5,
    declined:[],
    engines: {
      clients: { version: 1, syncID: '-qRIYq3pRFaF' },
      prefs: { version:2, syncID: 'J2d8YxLBQ68M' },
      passwords: { version:1, syncID: 'y3sQX0uYGXwz' },
      tabs: { version: 1, syncID: 'MGdVuWFjTRpP' },
      bookmarks: { version: 2, syncID: 'OmUGbrBTvZbn' },
      addons: { version: 1, syncID: '90lUL4MPuhpx' },
      forms: { version:1, syncID: 'Q_mWdmGZtuX9' },
      history: { version: 1, syncID: '2_MOTXJfjA9Q' }
    }
  });

  var metaGlobalPayloadWithoutHistoryEngine = JSON.stringify({
    syncID: 'NOuEmrZxVWxl',
    storageVersion: 5,
    declined:[],
    engines: {
      clients: { version: 1, syncID: '-qRIYq3pRFaF' },
      prefs: { version:2, syncID: 'J2d8YxLBQ68M' },
      passwords: { version:1, syncID: 'y3sQX0uYGXwz' },
      tabs: { version: 1, syncID: 'MGdVuWFjTRpP' },
      bookmarks: { version: 2, syncID: 'OmUGbrBTvZbn' },
      addons: { version: 1, syncID: '90lUL4MPuhpx' },
      forms: { version:1, syncID: 'Q_mWdmGZtuX9' }
    }
  });

  var remoteData = {
    meta: {
      id: 'global',
      last_modified: 1234567890123,
      payload: metaGlobalPayloadWithHistoryEngine
    },
    crypto: {
      id: 'keys',
      last_modified: 1234567890123,
      payload: JSON.stringify({
        ciphertext: `PP5yNUYwJJoLcsL5o85i6RZfvanYDrwtChDD/LdKTZ8JOLubZ9DyRv3HMe\
tSkbhL3HLvVm/FJ1Z4F2Z6IKQCxAc5dNnLsBIUUxhOHLbT0x9/jfnqZ8fLtlbkogI3ZlNvbc8iUF1aX\
+boe0Pv43vM0VvzxrnJDYzZ2a6jm9nbzUn0ldV9sv6vuvGHE6dANnRkZ3wA/q0q8UvjdwpzXBixAw=\
=`,
        IV: 'FmosM+XBNy81/9oEAgI4Uw==',
        hmac: '01a816e4577c6cf3f97b66b4382d0a3e7e9178c75a3d38ed9ac8ad6397c2ecce'
      })
    },
    history: {
      id: '_9sCUbahs0ay',
      last_modified: 1234567890123,
      payload: JSON.stringify({
        ciphertext: `o6aTLJdfhW4nz1hhnE2ZkvPb9N9lP6JEez+oufMGWIVAgQFaEMB3r/Oboc\
vRti2dwe7yo2qly9d8aILHuOTgerFZuC5Bu5b0KmvHnVBzLxcPcqF20mFY2iQIApEI82Cu2VfwZuX4t\
nCLMlxfllEzWvQPWai8e5OKmThdzKdHAmaS+sHBj5FjTe5mxuX4U1c8EJUS3a4fSV5NY0EolUkSuMLw\
9sXu++7Uiu8OJH/JNWis6getxKcE+J61iaHJO/raiPyYIB/tSi3yrIjb0FqLeG8tXCrrZ9VD/2AWPmJ\
5/6bpt80dSXgke4qvKePNoCYp`,
        IV: 'pP/NMhj5fwREqes4I9H0tw==',
        hmac: '97d16085c1bf347cb7530342ccf85647609be4a8f55d2b8fe409b1756240c06b'
      })
    },
    'wrong-payload-meta': {
      id: 'global',
      last_modified: 1234567890123,
      payload: 'whoopsie!'
    },
    'wrong-payload-crypto': {
      id: 'keys',
      last_modified: 1234567890123,
      payload: 'whoopsie!'
    },
    'wrong-payload-history': {
      id: '_9sCUbahs0ay',
      last_modified: 1234567890123,
      payload: 'whoopsie!'
    },
    'wrong-ciphertext': {
      id: '_9sCUbahs0ay',
      last_modified: 1234567890123,
      payload: JSON.stringify({
        ciphertext: 'deadbeef',
        IV: 'kXL3hb11ltD+Jl0YFk+PlQ==',
        hmac: 'cb727efe7a3f0307921cecbd1a97c03f06a4d75c42026089494d84fcf92dbff9'
      })
    },
    'wrong-id': {
      id: {},
      last_modified: 1234567890123,
      payload: JSON.stringify({
        ciphertext: `o/VpkqMj1tlT8t2youwsS2FgvQeonoHxqjGsRTu1+4swfyBq/QsnKfgOOM\
mDIXZiPC3hOCNUlf/NtQiEe55hzJZEKLBshaLfXotai6KrprwrmykfiXnwn73n+nYNs8BXL5awDHoaJ\
ToyFgF4PYokl7mwN7YC2xFiPgwO7Z2u/8r5RfnPV9MoafqvlvUkW+Tqs+QHeHS/iuSA0P2h/j5ynt9v\
4xDWLVfEMce0KOKHQ5Qj7BmEPAieWP1trkkDmTdVi2euWrs+fuG4C6PgY4A2j2DbNLVIloqpDVkqM2f\
gh0YOM9L2NC/uiKEb1Ynr2Fos`,
        IV: 'kXL3hb11ltD+Jl0YFk+PlQ==',
        hmac: 'cb727efe7a3f0307921cecbd1a97c03f06a4d75c42026089494d84fcf92dbff9'
      })
    }
  };

  var record = {
    'places': {
      id: 'places',
      sortindex: 1000000,
      last_modified: 1444990319980,
      payload: `{"ciphertext":"oDeFFF9Mhq2ASsACJpTOroCT8R9r7DHJjv0RJI4tI4/kc7tW\
TGrTMKCXBQu/3olgLKjbue4sUDHVmwlcwdMMbwis1Pt2FrChm1+kmmzKrndKsgDKqf0d2jfjSIeeO8Z\
fS0mSYFzQifI63khTftZr1fWkz0ajuwzlajXTKKcwYhruXaZE8YCoxu/cXoUtbKtgAxMCY6heNB1VwM\
QrWuXlkFWxOaMJZC9Qot93ef6xH84=","IV":"9nq13kP7b59dCRLLiCR8Mw==","hmac":"35133a2\
00238f6476f5b6305130cff76fdf47d66742ddffa88a8f0fefcb7d24b"}`
    },
    'unfiled': {
      id: 'unfiled',
      sortindex: 1000000,
      last_modified: 1443799918500,
      payload: `{"ciphertext":"+5oLXV7WdW9iadskJlISpQgOUAFABGC6BlUoJx/Lj/Ys4JkB\
T7Ga/9Ufv5ToPxsi8pDbk0Cy/neqV0g3Dj82xRqqADhaWTIbrNMAvDIE3navdtXafhxYKEcwRa8+nII\
uRc8si1c90cvdqCEKUIhhZUctqfNNJRUFbjhBMNEHQ0F6f02CL5RF2DyOt8Lg83Ui4P2CBiFkyIJRA9\
1B17K55P41w7Y4AUWUPCZHBIERzY0=","IV":"7otPN3W23riiDnXgSsxCfg==","hmac":"82d1f8e\
54c5d0ab09e31e6e7beaf45ca8d8ffb2d924614eafaf50732500408f0"}`
    },
    '-Z5mm8AxeIkq': {
      id: '-Z5mm8AxeIkq',
      sortindex: 175,
      last_modified: 1443799918500,
      payload: `{"ciphertext":"+gEPw/xy2oXxirZHU57m2J4Q7jhtiEZrxxjvO+6mqh+LWUVp\
Lj2sER7vFt8ioA3OlPWcBpUertzgWArZ4zLSrvOiMrDWX651R7Oi//+ksGGEBkOVHzU7NKldDTrQtO1\
slUaLVMCEto+KD9lQLbFBLo2r3yvB7wslOFDQqbp5cLn++My5bK2YML2bzVgyU2Ug0il6aN/SQrSKr+\
BAxMlg4V9vcJ+uJ/R0pdTSUx3/g3l8U1T6e4sqirOdsXMbckyMjG9scr36owBQqP6fIp97DCVQTRrhR\
nJhSk/v+9sSg5XKkDdx3ZjFfodNjHfmoafvdpDIAVPUlqSRV9WnPuFDVp2/j1OZ3hVac5GxIjwMnweE\
3+9S5oYdkjrtg0dA/YJ3ZXGyX21b53ZVACYV7E82Pal+pdD5iMxHn3zd4LYimwDBumX06pssJYHOhMx\
LIS6cG0U0HHsTuDFXR1FAWbMWpZeR1D/BOizW1KcOSacin4GV0zd2aDCDTk4xKE9Wd30q2o8HnLjNUU\
HO/St1osonSnj2hHx+YiHt4IGOA4481hu3NzXD1mwtutsSj/yvRrv/VCaMDVqY2MCTxXP5nfUEY2ohO\
nlJ7dOCAQgq8vjBROay+nscOmLEk8gNAygneFYBJA72YGy8HdLzoZcWcqoaed63m6TtqaxxWc+3CINr\
tZri9v/hK7qoVnYiVD8D8KVL","IV":"Uw4HT5/LP2B3Qq9goOai7g==","hmac":"52dd9f3b60870\
ac74b4d0b642dc34b7a872bf0a1bb2b410ba874373c68c88d5e"}`
    },
    'toolbar': {
      id: 'toolbar',
      sortindex: 1000000,
      last_modified: 1444990337260,
      payload: `{"ciphertext":"x8CVxJRSPsTsc5zhslndISQnnZvNkVu6g4HbVRlh7L966I4Z\
74bT0me1twfGN8Oowwm9nmg70wQQJwNIur+DYZEIXXCD9koq7LIsD/vj9c33gWYB6MucS/cI6cg7RMx\
NM7bieq01K8c10Sdl92MHH3WHgmqFo3AXXi44qpHnDC6mhMriAPdFIm4HdgeOURmmrykqMDUSatYVwE\
4LhXD61inIz0nXmygUJhVYNV707SwGpg/YfUCAyNUuUwlXBWjMVdFojPCHmgRy0vYRPnX7XiHE/Gw4W\
ViBuRG35yNHM1WeJIsMbNGwQIZ1w61mT4Y8Tdy/qTifj9ixz8B2VXbNaAtURgWvCDwR/P3PMkTNYXs=\
","IV":"wwGivoJN0JzlN43cphN8Vg==","hmac":"4b1520e74900c9cb3952778928fce0b09f853\
c1e8da78779ca9a61bae4e91ea0"}`
    },
    '5AiZMklaq0fL': {
      id: '5AiZMklaq0fL',
      sortindex: 1000000,
      last_modified: 1444990361000,
      payload: `{"ciphertext":"qr2Hq4V9bMi8ZrmTr19P5QziQj4CcDx6gI4qJuEMLgVmuci4\
Wcrz8uQiMtstyWFh0lK7WZlTLMdqwKnWbR/cqIR3tnfBrgP/IpCupnPgYcNBQR4ubtXBMO4+rRXz6kE\
pMlkDRuBJOXI3Uv4fmuy9fmCsyHjnXWLMoMPiS7ynlB82CVFLlTo4RGXs65+dK024xE5hnp0IE+sBHG\
hFtFWGyP2sJyY10c2f8SyGTdBY8o8=","IV":"S784aq1OWKzIR6QNY8Tqdg==","hmac":"623cd30\
5ffe2a1915e0a3d30551c36dd1db9cc7a1a4e91a8b4767451001cfa4e"}`
    },
    '6q8JaloClXcH': {
      id: '6q8JaloClXcH',
      sortindex: 1000000,
      last_modified: 1444990406800,
      payload: `{"ciphertext":"qn83DQj8GkLmg1g8j1V7dahpxX8ejxZ0c8s7l/Gqlr7ioqXG\
7r8C5YfMcPHpgLOJSFKIC2+a/t7mz391Bwmye4BPRPx1St1+ZRGDapP6X6IInm8kYdiXPeeAoC0zExw\
ZCaQBTWUI8x+l0sGJR3e2V84G6VIISkTxm2h6ywjcAYfNifnjyLIds1gxakGQ0gTYJ5gPXnQpQdBp4O\
ytRA1R721FWluxM3BYQ72UJFt8hMw=","IV":"UckfGiIKrwL0NBuJ4vpoBw==","hmac":"536e341\
32c8dcb980a0050597310f36a306d288288068d7782001649fa1f9609"}`
    },
    'msopyVa0ckP_': {
      id: 'msopyVa0ckP_',
      sortindex: 140,
      last_modified: 1444990424710,
      payload: `{"ciphertext":"/LclynYgBvPDqO0Ch2ylAZufLr+t42vYA37CilJMCxYnjCYY\
DzlMz1BOXooksM0PrZ+5vgLFZOl1sgjH4A/AS397dvn9EYugyNJgAm+oYAPfeDswXtp9xQ757oeC0zi\
AXHuq55bT3ClCv/yCWcK4HmL0l9MEePmXxOcR/QlBMq+Qn0iDNvUl9rPTeJw70G6MgJbSHscz9GXRqs\
Y/34BfxYV+aDdOGx2Wp877hK+EgrWes+yFUt+TjsuR8xiJk+SwASggEfw4GMDe4bo5EG2uDQTQCUww5\
qh32hg6OmE+DIj1wEBSCjw6yf4Yni32tn8vB1c4bo2xzV4KOXN8qfRFHeYCtKebdCNLHk7NwxEwDYM=\
","IV":"kbyuFrOfffGftlLAD/4Skg==","hmac":"d1ae13411f3577c6e62b8670b4b8a40365fa4\
7598368f141276c38936088fce3"}`
    },
    'AGyc2XZiNuVL': {
      id: 'AGyc2XZiNuVL',
      sortindex: 140,
      last_modified: 1444990424710,
      payload: `{"ciphertext":"UHL8oLNqhrxmxP3w/LiOUDe3SpuwwA4AbqIYX/faT5XaaWN\
Dyfw8ZhxuKaQfLyYa+mkdQRfYckR7eyl9/S352vrEU/GdR9kQ+y6tyyrYUfKHbPAZLHuRrdu8IPcVt+\
8SMn1Lao9fKAoutHM/oSqlQV9d1ZPtxcIJcCgnJmTR1nq//P5mj9OwGbXwKAh8JboS8wbS42ryQ/Llh\
oXf4HarDnePZsvLjNOmF0KH+VvHBfszTQDFoMPqgiDhnPjJunNU2EXI+WclfCjyUP6BhU5dqfUfWq1H\
qj4y6BV7Ajav8nyn7U7UvM8q3AnaEQSFM90nJeVx/e0+0EC7h1mZEuXhirRWFpReGxYYJ0lpDQ6OhPc\
=","IV":"xJ3PE16G3cX2Y20YPBTlog==","hmac":"f0cc1a9b065ad3dd7856c95cdd63d8e48904\
3f5dfa279b34afb99c9aaf4cf08f"}`
    }
  };

  var bookmarksEntriesDec = {
    'places': {
      id: 'places',
      type: 'folder',
      title:  '',
      description: null,
      children: ['toolbar_____', 'unfiled_____'],
      parentid: '9sS1iwhx4w0q'
    },
    'unfiled': {
      id: 'unfiled',
      type: 'folder',
      parentName: '',
      title: 'Unsorted Bookmarks',
      description: null,
      children: ['-Z5mm8AxeIkq'],
      parentid: 'places'
    },
    '-Z5mm8AxeIkq': {
      id: '-Z5mm8AxeIkq',
      type: 'bookmark',
      title: 'HiNet首頁 -中華電信HiNet網路服務入口',
      parentName: 'Unsorted Bookmarks',
      bmkUri: 'http://www.hinet.net/',
      tags: [],
      keyword: null,
      description: `中華電信HiNet網路服務入口，台灣最大ISP，提供寬頻上網，光世代（光纖\
）、ADSL服務，及信箱、新聞、hichannel、Xuite等生活娛樂資訊。並延伸至企業、政府、資安、雲\
端網絡應用，是您上網的第一站。`,
      loadInSidebar: false,
      parentid: 'unfiled'
    },
    'toolbar': {
      id: 'toolbar',
      type: 'folder',
      parentName: '',
      title: 'Bookmarks Toolbar',
      description: `Add bookmarks to this folder to see them displayed on the B\
ookmarks Toolbar`,
      children: [
        'QH1IawO-JKtz',
        'olmlydfUhcP7',
        '5AiZMklaq0fL',
        '6q8JaloClXcH'
      ],
      parentid: 'places'
    },
    '5AiZMklaq0fL': {
      id: '5AiZMklaq0fL',
      type: 'folder',
      parentName: 'Bookmarks Toolbar',
      title: 'folder toolbar 1',
      description: null,
      children: ['msopyVa0ckP_'],
      parentid: 'toolbar'
    },
    '6q8JaloClXcH': {
      id: '6q8JaloClXcH',
      type: 'folder',
      parentName: 'Bookmarks Toolbar',
      title: 'folder toolbar 2',
      description: null,
      children: ['AGyc2XZiNuVL'],
      parentid: 'toolbar'
    },
    'msopyVa0ckP_': {
      id: 'msopyVa0ckP_',
      type: 'bookmark',
      title: 'Redecentralize in folder toolbar 1',
      parentName: 'folder toolbar 1',
      bmkUri: 'https://redecentralize.org/',
      tags: ['nicer'],
      keyword: 'cooler',
      description: 'yeah',
      loadInSidebar: false,
      parentid: '5AiZMklaq0fL'
    },
    'AGyc2XZiNuVL': {
      id:'AGyc2XZiNuVL',
      type: 'bookmark',
      title: 'Redecentralize in folder toolbar 2',
      parentName: 'folder toolbar 2',
      bmkUri: 'https://redecentralize.org/',
      tags: ['nicer'],
      keyword: 'cooler',
      description: 'yeaher',
      loadInSidebar: true,
      parentid: '6q8JaloClXcH'
    }
  };
  var bookmarksExpectedDataStore = {
    'https://redecentralize.org/': {
      id: 'https://redecentralize.org/',
      url: 'https://redecentralize.org/',
      name: 'Redecentralize in folder toolbar 2',
      type: 'url',
      iconable: false,
      icon: '',
      createdLocally: false,
      fxsyncRecords: {
        msopyVa0ckP_: {
          id: 'msopyVa0ckP_',
          type: 'bookmark',
          title: 'Redecentralize in folder toolbar 1',
          parentName: 'folder toolbar 1',
          bmkUri: 'https://redecentralize.org/',
          tags: [ 'nicer' ],
          keyword: 'cooler',
          description: 'yeah',
          loadInSidebar: false,
          parentid: '5AiZMklaq0fL',
          timestamp: 1444990424710
        },
        AGyc2XZiNuVL: {
          id: 'AGyc2XZiNuVL',
          type: 'bookmark',
          title: 'Redecentralize in folder toolbar 2',
          parentName: 'folder toolbar 2',
          bmkUri: 'https://redecentralize.org/',
          tags: [ 'nicer' ],
          keyword: 'cooler',
          description: 'yeaher',
          loadInSidebar: true,
          parentid: '6q8JaloClXcH',
          timestamp: 1444990424710
        }
      }
    },
    'folder|6q8JaloClXcH': {
      id: 'folder|6q8JaloClXcH',
      name: 'folder toolbar 2',
      type: 'others',
      iconable: false,
      icon: '',
      createdLocally: false,
      fxsyncRecords: {
        '6q8JaloClXcH': {
          id: '6q8JaloClXcH',
          type: 'folder',
          parentName: 'Bookmarks Toolbar',
          title: 'folder toolbar 2',
          description: null,
          children: [ 'AGyc2XZiNuVL' ],
          parentid: 'toolbar',
          timestamp: 1444990406800
        }
      }
    },
    'folder|5AiZMklaq0fL': {
      id: 'folder|5AiZMklaq0fL',
      name: 'folder toolbar 1',
      type: 'others',
      iconable: false,
      icon: '',
      createdLocally: false,
      fxsyncRecords: {
        '5AiZMklaq0fL': {
          id: '5AiZMklaq0fL',
          type: 'folder',
          parentName: 'Bookmarks Toolbar',
          title: 'folder toolbar 1',
          description: null,
          children: [ 'msopyVa0ckP_' ],
          parentid: 'toolbar',
          timestamp: 1444990361000
        }
      }
    },
    'folder|toolbar': {
      id: 'folder|toolbar',
      name: 'Bookmarks Toolbar',
      type: 'others',
      iconable: false,
      icon: '',
      createdLocally: false,
      fxsyncRecords: {
        toolbar: {
          id: 'toolbar',
          type: 'folder',
          parentName: '',
          title: 'Bookmarks Toolbar',
          description: `Add bookmarks to this folder to see them disp\
layed on the Bookmarks Toolbar`,
          children: [
            'QH1IawO-JKtz',
            'olmlydfUhcP7',
            '5AiZMklaq0fL',
            '6q8JaloClXcH'
          ],
          parentid: 'places',
          timestamp: 1444990337260
        }
      }
    },
    'folder|places': {
      id: 'folder|places',
      name: '',
      type: 'others',
      iconable: false,
      icon: '',
      createdLocally: false,
      fxsyncRecords: {
        places: {
          id: 'places',
          type: 'folder',
          title: '',
          description: null,
          children: [
            'menu________',
            'toolbar_____',
            'tags________',
            'unfiled_____',
            'PYeSTK7_j6uu'
          ],
          parentid: '9sS1iwhx4w0q',
          timestamp: 1444990319980
        }
      }
    },
    'folder|unfiled': {
      id: 'folder|unfiled',
      name: 'Unsorted Bookmarks',
      type: 'others',
      iconable: false,
      icon: '',
      createdLocally: false,
      fxsyncRecords: {
        unfiled: {
          id: 'unfiled',
          type: 'folder',
          parentName: '',
          title: 'Unsorted Bookmarks',
          description: null,
          children: [
            'HfLLCKqFA18a',
            '-Z5mm8AxeIkq',
            'z-G0UXZVu9o1'
          ],
          parentid: 'places',
          timestamp: 1443799918500
        }
      }
    },
    'http://www.hinet.net/': {
      id: 'http://www.hinet.net/',
      url: 'http://www.hinet.net/',
      name: 'HiNet首頁 -中華電信HiNet網路服務入口',
      type: 'url',
      iconable: false,
      icon: '',
      createdLocally: false,
      fxsyncRecords: {
        '-Z5mm8AxeIkq': {
          id: '-Z5mm8AxeIkq',
          type: 'bookmark',
          title: 'HiNet首頁 -中華電信HiNet網路服務入口',
          parentName: 'Unsorted Bookmarks',
          bmkUri: 'http://www.hinet.net/',
          tags: [],
          keyword: null,
          description: `中華電信HiNet網路服務入口，台灣最大ISP，提供寬頻上\
網，光世代（光纖）、ADSL服務，及信箱、新聞、hichannel、Xuite等生活娛樂資訊。並延伸至企業\
、政府、資安、雲端網絡應用，是您上網的第一站。`,
          loadInSidebar: false,
          parentid: 'unfiled',
          timestamp: 1443799918500
        }
      }
    }
  };
  // Key name is too long for one line of code:
  bookmarksExpectedDataStore[`https://developer.mozilla.org/en-US/docs/Web/Java\
Script/Reference/Global_Objects/Object/proto`] = {
    url: `https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Glo\
bal_Objects/Object/proto`,
    title: 'Object.prototype.__proto__ € - JavaScript | MDN',
    visits: [ 1439366063808 ],
    fxsyncId: '_9sCUbahs0ay',
    createdLocally: false
  };
  var bookmarksExpectedAsyncStorage = {
    '518fef27c6bbc0220aab0f00b1a37308::collections::bookmarks::revisionid':
        '{new-revision-id}',
    '518fef27c6bbc0220aab0f00b1a37308::synctoid::bookmarks::msopyVa0ckP_':
        'https://redecentralize.org/',
    '518fef27c6bbc0220aab0f00b1a37308::synctoid::bookmarks::AGyc2XZiNuVL':
        'https://redecentralize.org/',
    '518fef27c6bbc0220aab0f00b1a37308::synctoid::bookmarks::6q8JaloClXcH':
        'folder|6q8JaloClXcH',
    '518fef27c6bbc0220aab0f00b1a37308::synctoid::bookmarks::5AiZMklaq0fL':
        'folder|5AiZMklaq0fL',
    '518fef27c6bbc0220aab0f00b1a37308::synctoid::bookmarks::toolbar':
        'folder|toolbar',
    '518fef27c6bbc0220aab0f00b1a37308::synctoid::bookmarks::places':
        'folder|places',
    '518fef27c6bbc0220aab0f00b1a37308::synctoid::bookmarks::unfiled':
        'folder|unfiled',
    '518fef27c6bbc0220aab0f00b1a37308::synctoid::bookmarks::-Z5mm8AxeIkq':
        'http://www.hinet.net/',
    '518fef27c6bbc0220aab0f00b1a37308::collections::bookmarks::mtime':
        1444990424710
  };

  var bookmarksRecords = [];
  for (var i in record) {
    bookmarksRecords.push(record[i]);
  }

  var responses = {};
  responses.unreachable = {
    status: 0,
    headers: { get(header) {} },
    text() {}
  };
  responses['http://example.com/v1/'] = {
    status: 200,
    statusText: 'OK',
    headers: { get(header) {} },
    text() { return 'bogus'; }
  };
  responses['https://syncto.dev.mozaws.net/v1/'] = {
    status: 200,
    headers: { get(header) {} },
    text() {
      return JSON.stringify({
        url: 'https://syncto.dev.mozaws.net/v1/',
        documentation: 'https://syncto.readthedocs.org/',
        version: '1.0.0',
        settings: {
          'syncto.batch_max_requests': 25
        },
        hello: 'syncto'
      });
    }
  };
  responses[`https://syncto.dev.mozaws.net/v1/buckets/518fef27c6bbc0220aab0f00b\
1a37308/collections/meta/records`] = {
    status: 200,
    statusText: 'OK',
    headers: { get(header) {} },
    text() {
      return JSON.stringify({ data: [ remoteData.meta ] });
    }
  };
  responses[`https://syncto.dev.mozaws.net/v1/buckets/518fef27c6bbc0220aab0f00b\
1a37308/collections/crypto/records`] = {
    status: 200,
    statusText: 'OK',
    headers: { get(header) {} },
    text() {
      return JSON.stringify({ data: [ remoteData.crypto ] });
    }
  };
  responses[`https://syncto.dev.mozaws.net/v1/buckets/518fef27c6bbc0220aab0f00b\
1a37308/collections/history/records`] = {
    status: 200,
    statusText: 'OK',
    headers: { get(header) {} },
    text() {
      return JSON.stringify({ data: [ remoteData.history ] });
    }
  };
  responses[`https://syncto.dev.mozaws.net/v1/buckets/518fef27c6bbc0220aab0f00b\
1a37308/collections/bookmarks/records`] = {
    status: 200,
    statusText: 'OK',
    headers: { get(header) {} },
    text() {
      return JSON.stringify({ data: bookmarksRecords });
    }
  };

  var historyEntryDec = {
    payload: {
      id: '_9sCUbahs0ay',
      histUri: `https://developer.mozilla.org/en-US/docs/Web/JavaScript/Referen\
ce/Global_Objects/Object/proto`,
      title: 'Object.prototype.__proto__ - JavaScript | MDN',
      visits:[ { date: 1439366063808983, type:1 } ]
    },
    collectionName: 'history'
  };

  function fetchArgsExpected(collectionNames) {
    var ret = [
      [
        'https://syncto.dev.mozaws.net/v1/',
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          },
          mode: undefined
        }
      ]
    ];
    function collReq(collName) {
      return [ `https://syncto.dev.mozaws.net/v1/buckets/518fef27c6bbc0220aab0f\
00b1a37308/collections/${collName}/records`,
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: 'BrowserID assertion'
          },
          mode: undefined
        }
      ];
    }
    collectionNames.forEach(collectionName => {
      ret.push(collReq(collectionName));
    });
    return ret;
  }

  return {
    syncEngineOptions,
    xClientState,
    remoteData,
    responses,
    historyEntryDec,
    bookmarksEntriesDec,
    bookmarksExpectedDataStore,
    bookmarksExpectedAsyncStorage,
    fetchArgsExpected,
    metaGlobalPayloadWithHistoryEngine,
    metaGlobalPayloadWithoutHistoryEngine
  };
})();
