requireApp('browser/js/customize.js');

// from build/applications-data.js
var content = {
  '000000': {
    'bookmarks': [
      { 'title': 'Vivo Busca',
        'uri': 'http://www.google.com.br/m/search?client=ms-hms-tef-br',
        'iconUri': ''
      },
      { 'title': 'Serviços e Downloads',
        'uri': 'http://vds.vivo.com.br',
        'iconUri': ''
      },
      {
        'title': 'Site Vivo',
        'uri': 'http://www.vivo.com.br/conteudosmartphone',
        'iconUri': ''
      }
    ]
  }
};

if (content['000000'] && !content['000000'].search_engine) {
  content['000000']['search_engine'] = {
    'title': 'Google',
    'url': 'www.google.com',
    'iconUri': 'http://www.google.com/favicon.ico'
  };
}

// any custom settings
var content2 = {
  '000000': {
    'bookmarks': [
    {
      'title': 'bgzla',
      'uri': 'http://gasolin.github.io/bgzla',
      'iconUri': ''
    }
    ],
    'search_engine': {
      'title': 'Bing',
      'url': 'm.bing.com',
      'iconUri': 'http://bing.com/favicon.ico'
    }
  },
  '123456': {
    'bookmarks': [
    {
      'title': 'Bing',
      'uri': 'm.bing.com',
      'iconUri': 'http://bing.com/favicon.ico'
    }
    ],
    'search_engine': {
      'title': 'Bing',
      'url': 'm.bing.com',
      'iconUri': 'http://bing.com/favicon.ico'
    }
  }
};

suite('Browser Customization', function() {

  suite('zfill', function() {

    test('zfill with string', function() {
      assert.equal(Customize.zfill('00', 3), '000');
      assert.equal(Customize.zfill('02', 3), '002');
      assert.equal(Customize.zfill('004', 3), '004');
      assert.equal(Customize.zfill('010', 3), '010');
    });
  });

  suite('customizeDefaultBookmark', function() {
    setup(function() {
      sinon.stub(Customize, 'addDefaultBookmarks');
      sinon.stub(Customize, 'addDefaultSearchEngines');
    });

    teardown(function() {
      Customize.addDefaultBookmarks.restore();
      Customize.addDefaultSearchEngines.restore();
    });

    test('default call', function() {
      Customize.customizeDefaultBookmark(content);
      Customize.customizeDefaultBookmark(content2);

      assert.equal(Customize.addDefaultBookmarks.calledTwice, true);
      assert.equal(Customize.addDefaultSearchEngines.calledTwice, true);
      assert.equal(
        Customize.addDefaultSearchEngines.calledWith(content['000000']),
        true);
      assert.equal(
        Customize.addDefaultSearchEngines.calledWith(content2['000000']),
        true);
    });

    test('get bookmark based on iccSettings', function() {
      Customize.iccSettings.mcc = '123';
      Customize.iccSettings.mnc = '456';

      Customize.customizeDefaultBookmark(content2);

      assert.equal(Customize.addDefaultBookmarks.called, true);
      assert.equal(Customize.addDefaultSearchEngines.called, true);
      assert.equal(
        Customize.addDefaultSearchEngines.calledWith(content2['123456']),
        true);
    });
  });
});
