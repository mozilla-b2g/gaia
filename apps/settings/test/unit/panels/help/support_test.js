'use strict';
suite('Help > ', function() {
  var Help;
  var MockLoadJSON, MockSettingsCache;

  suiteSetup(function(done) {
    testRequire([
        'unit/mock_load_json',
        'unit/mock_settings_cache',
        'panels/help/support'
      ],
      { //mock map
        'panels/help/support': {
          'module/settings_cache': 'unit/mock_settings_cache'
        }
      },
      function(mockLoadJSON, mockSettingsCache, support) {
        MockLoadJSON = mockLoadJSON;
        MockSettingsCache = mockSettingsCache;

        Help = support();
        done();
      }
    );
  });

  suite('initiation', function() {
    var stubGetSupportInfo;
    var RealLoadJSON;
    setup(function() {
      RealLoadJSON = window.loadJSON;
      window.loadJSON = MockLoadJSON.loadJSON;

      var div = document.createElement('div');
      var mock_elements = {};
      mock_elements.userGuide = div;
      mock_elements.help = div;
      mock_elements.supportText = div;
      mock_elements.supportNumber = div;

      stubGetSupportInfo = this.sinon.stub(Help, '_getSupportInfo');
      Help.init(mock_elements, null);
    });

    teardown(function() {
      window.loadJSON = RealLoadJSON;
      stubGetSupportInfo.restore();
      Help.uninit();
    });

    test('we would call getSupportInfo in init', function() {
      assert.ok(stubGetSupportInfo.called);
    });
  });

  suite('getSupportInfo', function() {
    var stubLoadJSON, stubCallback;
    setup(function() {
      window.loadJSON = function(){};
      // window.loadJSON = MockLoadJSON.loadJSON;
      stubLoadJSON = this.sinon.stub(window, 'loadJSON');
      // window.loadJSON = this.sinon.stub();
      stubCallback = this.sinon.stub();
    });

    teardown(function() {
      stubLoadJSON.restore();
    });

    test('we would call loadJSON in getSupportInfo', function() {
      Help._getSupportInfo(stubCallback);
      assert.ok(stubLoadJSON.called);
    });

    test('we would not call loadJSON when _supportInfo exist', function() {
      Help._supportInfo = {
        'onlinesupport': '',
        'callsupport': ''
      };
      Help._getSupportInfo(stubCallback);
      assert.ok(!stubLoadJSON.called);
    });
  });

  suite('renderSupportInfo without SIM', function() {
    var stubSetOnlineSupport;
    var stubSetCallSupport;
    var blankSupportInfo = {
      'support.onlinesupport.title': '',
      'support.onlinesupport.href': '',
      'support.callsupport1.title': '',
      'support.callsupport1.href': ''
    };
    setup(function() {
      Help._supportInfo = {
        'onlinesupport': '',
        'callsupport': ''
      };
      stubSetOnlineSupport =
        this.sinon.stub(Help, '_setOnlineSupportInfo');
      stubSetCallSupport =
        this.sinon.stub(Help, '_setCallSupportInfo');
    });

    teardown(function() {
      stubSetOnlineSupport.restore();
      stubSetCallSupport.restore();
      Help.uninit();
    });

    test('extra info not rendered when no supportinfo', function() {
      Help._renderSupportInfo(blankSupportInfo);

      assert.isTrue(stubSetOnlineSupport.calledWith(''));
      assert.isTrue(stubSetCallSupport.calledWith(''));
    });

    test('extra info rendered', function() {
      Help._renderSupportInfo({
        'support.onlinesupport.title': 'mozilla',
        'support.onlinesupport.href': 'www.mozilla.org',
        'support.callsupport1.title': 'mobile',
        'support.callsupport1.href': '123456',
        'support.callsupport2.title': 'fxos',
        'support.callsupport2.href': '789012',
      });
      assert.isTrue(stubSetOnlineSupport.calledWith(
        { title: 'mozilla', href: 'www.mozilla.org' }
      ));
      assert.isTrue(stubSetCallSupport.calledWith(
        [ { title: 'mobile', href: '123456' },
          { title: 'fxos', href: '789012' } ]
      ));
    });
  });

  suite('setOnlineSupportInfo', function() {
    var link;
    setup(function() {
      link = Help._createLinkNode({
        href: 'www.mozilla.org',
        title: 'mozilla'
      }, null);
    });

    test('has link-text class', function() {
      assert.ok(link.classList.contains('link-text'));
    });

    test('has correct text content', function() {
      assert.equal(link.textContent, 'mozilla');
    });
  });

  suite('setCallSupportInfo', function() {
    var link;
    setup(function() {
      link = Help._createLinkNode({
        href: '1234567',
        title: 'mozilla'
      }, 'tel');
    });

    test('has link-text class', function() {
      assert.ok(link.classList.contains('link-text'));
    });

    test('has correct tel content', function() {
      assert.equal(link.textContent, 'mozilla (1234567)');
    });
  });
});
