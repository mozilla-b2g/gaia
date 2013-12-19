// Tests the keyboard_helper.js from shared
'use strict';

require('/shared/test/unit/mocks/mock_manifest_helper.js');
require('/shared/test/unit/mocks/mock_navigator_moz_apps.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');

require('/shared/js/keyboard_helper.js');

suite('KeyboardHelper', function() {
  var mocksHelper = new MocksHelper(['ManifestHelper']).init();
  mocksHelper.attachTestHelpers();
  var realMozSettings;
  var realMozApps;
  var appEvents = ['applicationinstallsuccess', 'applicationuninstall'];
  var DEFAULT_KEY = 'keyboard.default-layouts';
  var ENABLED_KEY = 'keyboard.enabled-layouts';
  var THIRD_PARTY_APP_ENABLED_KEY = 'keyboard.3rd-party-app.enabled';
  var keyboardAppOrigin = 'http://keyboard.gaiamobile.org:8080';
  var keyboardAppManifestURL =
      'http://keyboard.gaiamobile.org:8080/manifest.webapp';
  var standardKeyboards = [
    {
      manifestURL: keyboardAppManifestURL,
      manifest: {
        role: 'input',
        inputs: {
          en: {
            types: ['url', 'text'],
            launch_path: '/index.html#en'
          },
          es: {
            types: ['url', 'text'],
            launch_path: '/index.html#es'
          },
          fr: {
            types: ['url', 'text'],
            launch_path: '/index.html#fr'
          },
          pl: {
            types: ['url', 'text'],
            launch_path: '/index.html#pl'
          },
          number: {
            types: ['number'],
            launch_path: '/index.html#number'
          }
        }
      }
    }
  ];

  var defaultSettings = {
    oldEnabled: [
      {
        layoutId: 'en',
        appOrigin: keyboardAppOrigin,
        enabled: true
      },
      {
        layoutId: 'es',
        appOrigin: keyboardAppOrigin,
        enabled: false
      },
      {
        layoutId: 'fr',
        appOrigin: keyboardAppOrigin,
        enabled: false
      },
      {
        layoutId: 'pl',
        appOrigin: keyboardAppOrigin,
        enabled: false
      },
      {
        layoutId: 'number',
        appOrigin: keyboardAppOrigin,
        enabled: true
      }
    ],
    'default': {}
  };

  defaultSettings['default'][keyboardAppManifestURL] = {en: true, number: true};
  defaultSettings.enabled = defaultSettings['default'];

  var DEPRECATE_KEYBOARD_SETTINGS = {
    en: 'keyboard.layouts.english',
    'en-Dvorak': 'keyboard.layouts.dvorak',
    cs: 'keyboard.layouts.czech',
    fr: 'keyboard.layouts.french',
    de: 'keyboard.layouts.german',
    hu: 'keyboard.layouts.hungarian',
    nb: 'keyboard.layouts.norwegian',
    my: 'keyboard.layouts.myanmar',
    sl: 'keyboard.layouts.slovak',
    tr: 'keyboard.layouts.turkish',
    ro: 'keyboard.layouts.romanian',
    ru: 'keyboard.layouts.russian',
    ar: 'keyboard.layouts.arabic',
    he: 'keyboard.layouts.hebrew',
    'zh-Hant-Zhuyin': 'keyboard.layouts.zhuyin',
    'zh-Hans-Pinyin': 'keyboard.layouts.pinyin',
    el: 'keyboard.layouts.greek',
    'jp-kanji': 'keyboard.layouts.japanese',
    pl: 'keyboard.layouts.polish',
    'pt-BR': 'keyboard.layouts.portuguese',
    sr: 'keyboard.layouts.serbian',
    es: 'keyboard.layouts.spanish',
    ca: 'keyboard.layouts.catalan'
  };

  function trigger(event) {
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent(event, true, false, {});
    window.dispatchEvent(evt);
  }

  suiteSetup(function() {
    realMozApps = navigator.mozApps;
    navigator.mozApps = MockNavigatormozApps;

    realMozSettings = navigator.mozSettings;
    MockNavigatorSettings.mSyncRepliesOnly = true;
    navigator.mozSettings = MockNavigatorSettings;

    // ensure the default settings are indeed default
    assert.deepEqual(KeyboardHelper.settings['default'],
      defaultSettings['default']);
  });

  suiteTeardown(function() {
    MockNavigatorSettings.mSyncRepliesOnly = false;
    navigator.mozApps = realMozApps;
    navigator.mozSettings = realMozSettings;
  });

  setup(function() {
    // reset KeyboardHelper each time
    KeyboardHelper.settings.enabled = {};
    KeyboardHelper.settings['default'] = defaultSettings['default'];
    KeyboardHelper.keyboardSettings = [];
    KeyboardHelper.init();
  });

  teardown(function() {
    MockNavigatorSettings.mTeardown();
  });

  test('observes settings', function() {
    assert.equal(MockNavigatorSettings.mObservers[ENABLED_KEY].length, 1);
    assert.equal(MockNavigatorSettings.mObservers[DEFAULT_KEY].length, 1);
  });

  test('requests initial settings', function() {
    var requests = MockNavigatorSettings.mRequests;
    assert.equal(requests.length, 26);
    assert.ok(DEFAULT_KEY in requests[0].result, 'requested defaults');
    assert.ok(ENABLED_KEY in requests[1].result, 'requested enabled');
    assert.ok(THIRD_PARTY_APP_ENABLED_KEY in requests[2].result,
      'requested 3rd-party keyboard app enabled');

    var i = 0;
    for (var key in DEPRECATE_KEYBOARD_SETTINGS) {
      assert.ok(DEPRECATE_KEYBOARD_SETTINGS[key] in requests[3 + i].result,
                'requested deprecated settings - ' +
                DEPRECATE_KEYBOARD_SETTINGS[key]);
      i++;
    }
  });

  suite('getApps', function() {
    setup(function() {
      this.apps = [
        {
          origin: 'app://keyboard.gaiamobile.org',
          manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
          manifest: {
            type: 'privileged',
            role: 'input',
            inputs: {},
            permissions: {
              input: {}
            }
          }
        }, {
          origin: 'app://keyboard2.gaiamobile.org',
          manifestURL: 'app://keyboard2.gaiamobile.org/manifest.webapp',
          manifest: {
            type: 'certified',
            role: 'input',
            inputs: {},
            permissions: {
              input: {}
            }
          }
        },
        // vaild only if 3rd-party keyboard app support is enabled
        {
          origin: 'app://keyboard.notgaiamobile.org',
          manifestURL: 'app://keyboard.notgaiamobile.org/manifest.webapp',
          manifest: {
            type: 'privileged',
            role: 'input',
            inputs: {},
            permissions: {
              input: {}
            }
          }
        },
        // vaild only if 3rd-party keyboard app support is enabled
        {
          origin: 'app://keyboard.notgaiamobile.org',
          manifestURL:
            'app://keyboard.example.com/hello.gaiamobile.org/manifest.webapp',
          manifest: {
            type: 'privileged',
            role: 'input',
            inputs: {},
            permissions: {
              input: {}
            }
          }
        },
        // invalid because it's system
        {
          origin: 'app://system.gaiamobile.org',
          manifestURL: 'app://system.gaiamobile.org/manifest.webapp',
          manifest: {
            type: 'certified',
            role: 'input',
            inputs: {},
            permissions: {
              input: {}
            }
          }
        },
        // invalid because there aren't inputs
        {
          origin: 'app://keyboard.gaiamobile.org',
          manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
          manifest: {
            type: 'certified',
            role: 'input',
            permissions: {
              input: {}
            }
          }
        },
        // invalid because it's not input role
        {
          origin: 'app://keyboard.gaiamobile.org',
          manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
          manifest: {
            type: 'privileged',
            role: 'notinput',
            inputs: {},
            permissions: {
              input: {}
            }
          }
        },
        // invalid because it's not privileged, nor certified
        {
          origin: 'app://keyboard-no.gaiamobile.org',
          manifestURL: 'app://keyboard-no.gaiamobile.org/manifest.webapp',
          manifest: {
            role: 'input',
            inputs: {},
            permissions: {
              input: {}
            }
          }
        },
        // invalid because it does not have input permission
        {
          origin: 'app://keyboard-no.gaiamobile.org',
          manifestURL: 'app://keyboard-no.gaiamobile.org/manifest.webapp',
          manifest: {
            type: 'privileged',
            role: 'input',
            inputs: {},
            permissions: {
              notinput: {}
            }
          }
        }
      ];
      this.callback = this.sinon.spy();
      this.sinon.stub(navigator.mozApps.mgmt, 'getAll', function() {
        return {};
      });
      KeyboardHelper.setLayoutEnabled('app://not-an-app', 'en', true);
      KeyboardHelper.getApps(this.callback);
    });
    test('requests all apps from mozApps', function() {
      assert.isTrue(navigator.mozApps.mgmt.getAll.called);
    });
    test('never calls back if no response', function() {
      assert.isFalse(this.callback.called);
    });
    test('never calls back if no valid apps', function() {
      var request = navigator.mozApps.mgmt.getAll.returnValues[0];
      request.result = [];
      request.onsuccess({ target: request });
      assert.isFalse(this.callback.called);
    });
    suite('valid response', function() {
      setup(function() {
        var request = navigator.mozApps.mgmt.getAll.returnValues[0];
        request.result = this.apps;
        request.onsuccess({ target: request });
      });
      test('correctly filters test data', function() {
        // only the first 2 are valid (excluding 2 third-party keyboard apps).
        var filtered = this.apps.slice(0, 2);
        var results = this.callback.args[0][0];
        assert.deepEqual(results, filtered);
      });
      test('removed illegal app from settings', function() {
        assert.isFalse(
          KeyboardHelper.getLayoutEnabled('app://not-an-app', 'en'),
          'correctly disabled the missing app origin'
        );
      });
      suite('second request', function() {
        setup(function() {
          this.lastResult = this.callback.args[0][0];
          this.callback.reset();
          navigator.mozApps.mgmt.getAll.reset();
          KeyboardHelper.getApps(this.callback);
        });
        test('does not request apps again', function() {
          assert.isFalse(navigator.mozApps.mgmt.getAll.called);
        });
        test('re-uses same results', function() {
          assert.equal(this.callback.args[0][0], this.lastResult);
        });
      });
      appEvents.forEach(function eventSuite(event) {
        suite(event + ' event clears cache', function() {
          setup(function() {
            trigger(event);
            this.callback.reset();
            navigator.mozApps.mgmt.getAll.reset();
            KeyboardHelper.getApps(this.callback);
          });
          test('requests apps again', function() {
            assert.isTrue(navigator.mozApps.mgmt.getAll.called);
          });
          test('does not immediately call callback', function() {
            assert.isFalse(this.callback.called);
          });
        });
      });
    });
  });

  suite('isKeyboardType', function() {
    ['text', 'url', 'email', 'password', 'number', 'option']
    .forEach(function(type) {
      test(type + ': true', function() {
        assert.isTrue(KeyboardHelper.isKeyboardType(type));
      });
    });

    ['not', 'base', 'type', undefined, 1]
    .forEach(function(type) {
      test(type + ': false', function() {
        assert.isFalse(KeyboardHelper.isKeyboardType(type));
      });
    });
  });

  suite('checkDefaults', function() {
    setup(function() {
      this.defaultLayouts = [];
      this.getLayouts = this.sinon.stub(KeyboardHelper, 'getLayouts',
        function(options, callback) {
          if (options.enabled) {
            return callback([]);
          }
          if (options.default) {
            var layout = { type: options.type };
            this.defaultLayouts.push(layout);
            return callback([layout]);
          }
        }.bind(this));
      this.callback = this.sinon.spy();
      KeyboardHelper.checkDefaults(this.callback);
    });
    test('enabled default layouts', function() {
      assert.equal(this.defaultLayouts.length, 3);
    });
    ['text', 'url', 'number'].forEach(function(type) {
      test('enabled a "' + type + '" layout', function() {
        assert.ok(this.defaultLayouts.some(function(layout) {
          return layout.type === type && layout.enabled;
        }));
      });
    });
    test('called with default layouts', function() {
      assert.deepEqual(this.callback.args[0][0], this.defaultLayouts);
    });
  });

  suite('getLayouts', function() {
    setup(function() {
      MockNavigatorSettings.mRequests[0].result[DEFAULT_KEY] =
        defaultSettings['default'];
      MockNavigatorSettings.mRequests[1].result[ENABLED_KEY] =
        defaultSettings.enabled;
      this.sinon.stub(KeyboardHelper, 'getApps');
      this.sinon.spy(window, 'ManifestHelper');
      this.apps = [{
        origin: keyboardAppOrigin,
        manifestURL: keyboardAppManifestURL,
        manifest: {
          role: 'input',
          inputs: {
            en: {
              types: ['text', 'url']
            },
            number: {
              types: ['number']
            },
            noType: {}
          }
        }
      }, {
        origin: 'app://keyboard2.gaiamobile.org',
        manifestURL: 'app://keyboard2.gaiamobile.org/manifest.webapp',
        manifest: {
          role: 'input',
          inputs: {
            number: {
              types: ['number', 'url']
            }
          }
        }
      }];
    });
    suite('waits for settings to load to reply', function() {
      setup(function() {
        this.callback = this.sinon.spy();
        KeyboardHelper.getLayouts(this.callback);
        KeyboardHelper.getApps.yield(this.apps);
      });
      test('callback not called', function() {
        assert.isFalse(this.callback.called);
      });
      test('called after reply', function() {
        MockNavigatorSettings.mReplyToRequests();
        assert.isTrue(this.callback.called);
      });
    });
    suite('basic operation', function() {
      setup(function() {
        MockNavigatorSettings.mReplyToRequests();
        delete this.result;
        KeyboardHelper.settings.enabled = defaultSettings.enabled;
        KeyboardHelper.getLayouts(function(result) {
          this.result = result;
        }.bind(this));
        KeyboardHelper.getApps.yield(this.apps);
      });
      test('3 layouts found', function() {
        assert.equal(this.result.length, 3);
      });
      test('Created ManifestHelpers', function() {
        assert.ok(ManifestHelper.calledWith(this.apps[0].manifest));
        assert.ok(ManifestHelper.calledWith(this.apps[1].manifest));
      });
      test('Correct info', function() {
        assert.equal(this.result[0].app, this.apps[0]);
        assert.equal(this.result[0].layoutId, 'en');
        assert.equal(this.result[0].enabled, true);
        assert.equal(this.result[0]['default'], true);

        assert.equal(this.result[1].app, this.apps[0]);
        assert.equal(this.result[1].layoutId, 'number');
        assert.equal(this.result[1].enabled, true);
        assert.equal(this.result[1]['default'], true);

        assert.equal(this.result[2].app, this.apps[1]);
        assert.equal(this.result[2].layoutId, 'number');
        assert.equal(this.result[2].enabled, false);
        assert.equal(this.result[2]['default'], false);
      });
    });
    suite('{ default: true }', function() {
      setup(function() {
        MockNavigatorSettings.mReplyToRequests();
        delete this.result;
        KeyboardHelper.getLayouts({ 'default': true }, function(result) {
          this.result = result;
        }.bind(this));
        KeyboardHelper.settings.enabled = defaultSettings.enabled;
        KeyboardHelper.getApps.yield(this.apps);
      });
      test('2 layouts found', function() {
        assert.equal(this.result.length, 2);
      });
      test('only default keyboards', function() {
        assert.ok(this.result.every(function(layout) {
          return layout['default'];
        }));
      });
      test('sorts layouts by number of types', function() {
        // most specific layouts first
        assert.ok(this.result.reduce(function(inOrder, layout) {
          if (!inOrder) {
            return false;
          }
          if (layout.inputManifest.types.length < inOrder) {
            return false;
          }
          return layout.inputManifest.types.length;
        }, 1));
      });
    });
    suite('{ enabled: true }', function() {
      setup(function() {
        MockNavigatorSettings.mReplyToRequests();
        delete this.result;
        KeyboardHelper.getLayouts({ enabled: true }, function(result) {
          this.result = result;
        }.bind(this));
        KeyboardHelper.settings.enabled = defaultSettings.enabled;
        KeyboardHelper.getApps.yield(this.apps);
      });
      test('2 layouts found', function() {
        assert.equal(this.result.length, 2);
      });
      test('only enabled keyboards', function() {
        assert.ok(this.result.every(function(layout) {
          return layout.enabled;
        }));
      });
    });
    suite('{ type: "number" }', function() {
      setup(function() {
        MockNavigatorSettings.mReplyToRequests();
        delete this.result;
        KeyboardHelper.getLayouts({ type: 'number' }, function(result) {
          this.result = result;
        }.bind(this));
        KeyboardHelper.settings.enabled = defaultSettings.enabled;
        KeyboardHelper.getApps.yield(this.apps);
      });
      test('2 layouts found', function() {
        assert.equal(this.result.length, 2);
      });
      test('only number keyboards', function() {
        assert.ok(this.result.every(function(layout) {
          return layout.inputManifest.types.indexOf('number') !== -1;
        }));
      });
    });
    suite('{ type: "url" }', function() {
      setup(function() {
        MockNavigatorSettings.mReplyToRequests();
        delete this.result;
        KeyboardHelper.getLayouts({ type: 'url' }, function(result) {
          this.result = result;
        }.bind(this));
        KeyboardHelper.settings.enabled = defaultSettings.enabled;
        KeyboardHelper.getApps.yield(this.apps);
      });
      test('2 layouts found', function() {
        assert.equal(this.result.length, 2);
      });
      test('only url keyboards', function() {
        assert.ok(this.result.every(function(layout) {
          return layout.inputManifest.types.indexOf('url') !== -1;
        }));
      });
    });
  });

  suite('watchLayouts', function() {
    setup(function() {
      MockNavigatorSettings.mRequests[0].result[DEFAULT_KEY] =
        defaultSettings['default'];
      MockNavigatorSettings.mRequests[1].result[ENABLED_KEY] =
        defaultSettings.enabled;
      MockNavigatorSettings.mReplyToRequests();
      this.callback = this.sinon.spy();
      this.getApps = this.sinon.stub(KeyboardHelper, 'getApps');
      this.getLayouts = this.sinon.stub(KeyboardHelper, 'getLayouts');
      this.layouts = [];
    });
    suite('watch {}', function() {
      setup(function() {
        this.options = {};
        KeyboardHelper.watchLayouts(this.options, this.callback);
        this.getLayouts.yield(this.layouts);
      });
      test('getLayouts', function() {
        assert.ok(this.getLayouts.calledWith(this.options));
      });
      test('called callback', function() {
        assert.ok(this.callback.calledWith(this.layouts));
      });
      test('callback second arg apps', function() {
        assert.ok(this.callback.args[0][1].apps);
      });
      test('callback second arg settings', function() {
        assert.ok(this.callback.args[0][1].settings);
      });
      appEvents.forEach(function(event) {
        suite(event + ' sends new apps', function() {
          setup(function() {
            this.getApps.reset();
            this.getLayouts.reset();
            this.callback.reset();
            trigger(event);

          });
          test('requests apps', function() {
            assert.ok(this.getApps.called);
          });
          test('does not request layouts', function() {
            assert.isFalse(this.getLayouts.called);
          });
          test('callback not called', function() {
            assert.isFalse(this.callback.called);
          });
          suite('after apps loaded', function() {
            setup(function() {
              this.getApps.yield();
            });
            test('requests layouts', function() {
              this.getLayouts.calledWith(this.options);
            });
            test('callback not called', function() {
              assert.isFalse(this.callback.called);
            });
            suite('got layouts', function() {
              setup(function() {
                this.callback.reset();
                this.getLayouts.yield(this.layouts);
              });
              test('called callback', function() {
                assert.ok(this.callback.calledWith(this.layouts));
              });
              test('callback second arg apps', function() {
                assert.ok(this.callback.args[0][1].apps);
              });
            });
          });
        });
      });
      suite('changing settings', function() {
        setup(function() {
          this.callback.reset();
          this.getApps.reset();
          this.getLayouts.reset();
          var settings = {};
          settings[ENABLED_KEY] = defaultSettings.enabled;

          // changing a setting triggers reading settings
          MockNavigatorSettings.createLock().set(settings);

          // reply to the read requests
          MockNavigatorSettings.mReplyToRequests();

          // and finally yield data to the getApps/getLayout
          this.getApps.yield();

          this.getLayouts.yield(this.layouts);
        });
        test('called callback', function() {
          assert.ok(this.callback.calledWith(this.layouts));
        });
        test('callback second arg settings', function() {
          assert.ok(this.callback.args[0][1].settings);
        });
      });
    });
  });

  suite('empty settings (create defaults)', function() {
    setup(function() {
      this.sinon.stub(KeyboardHelper, 'saveToSettings');
      MockNavigatorSettings.mReplyToRequests();
    });
    test('default settings loaded', function() {
      assert.deepEqual(KeyboardHelper.settings.enabled,
        defaultSettings.enabled);
    });
    test('saves settings', function() {
      assert.isTrue(KeyboardHelper.saveToSettings.called);
    });
  });

  suite('bad json settings (create defaults)', function() {
    setup(function() {
      this.sinon.stub(KeyboardHelper, 'saveToSettings');
      MockNavigatorSettings.mRequests[1].result[ENABLED_KEY] =
        'notjson';
      MockNavigatorSettings.mReplyToRequests();
    });
    test('default settings loaded', function() {
      assert.deepEqual(KeyboardHelper.settings.enabled,
        defaultSettings.enabled);
    });
    test('saves settings', function() {
      assert.isTrue(KeyboardHelper.saveToSettings.called);
    });
  });

  suite('default settings (old string format)', function() {
    setup(function() {
      this.sinon.spy(KeyboardHelper, 'saveToSettings');
      MockNavigatorSettings.mRequests[1].result[ENABLED_KEY] =
        JSON.stringify(defaultSettings.oldEnabled);
      MockNavigatorSettings.mReplyToRequests();
    });
    test('loaded settings properly', function() {
      assert.deepEqual(KeyboardHelper.settings.enabled,
        defaultSettings.enabled);
    });
    test('does not save settings', function() {
      assert.isFalse(KeyboardHelper.saveToSettings.called);
    });
    test('es layout disabled (sanity check)', function() {
      assert.isFalse(KeyboardHelper.getLayoutEnabled(keyboardAppManifestURL,
                                                     'es'));
    });
    suite('setLayoutEnabled', function() {
      setup(function() {
        KeyboardHelper.setLayoutEnabled(keyboardAppManifestURL, 'es', true);
        KeyboardHelper.saveToSettings();
      });
      test('es layout enabled', function() {
        assert.isTrue(KeyboardHelper.getLayoutEnabled(keyboardAppManifestURL,
                                                      'es'));
      });
      test('saves', function() {
        assert.isTrue(KeyboardHelper.saveToSettings.called);
        // with the right data
        var data = {};
        data[keyboardAppManifestURL] = { en: true, es: true, number: true };
        assert.deepEqual(MockNavigatorSettings.mSettings[ENABLED_KEY],
          data);
        assert.deepEqual(MockNavigatorSettings.mSettings[DEFAULT_KEY],
          defaultSettings['default']);
        // and we requested to read it
        assert.ok(MockNavigatorSettings.mRequests.length);
      });
      suite('save reloads settings', function() {
        setup(function() {
          this.oldSettings = KeyboardHelper.settings.enabled;
          MockNavigatorSettings.mReplyToRequests();
        });
        test('new settings object', function() {
          assert.notEqual(KeyboardHelper.settings.enabled, this.oldSettings);
        });
        test('same data', function() {
          assert.deepEqual(KeyboardHelper.settings.enabled, this.oldSettings);
        });
      });
    });
  });

  suite('migrate old settings', function() {
    var expectedSettings = {
      'default': {},
      enabled: {}
    };

    suite('old settings: cs enabled', function() {
      setup(function() {
        this.sinon.stub(KeyboardHelper, 'saveToSettings');
        MockNavigatorSettings.mRequests[3].
          result[DEPRECATE_KEYBOARD_SETTINGS.en] = false;
        MockNavigatorSettings.mRequests[5].
          result[DEPRECATE_KEYBOARD_SETTINGS.cs] = true;
        MockNavigatorSettings.mReplyToRequests();
      });

      test('default settings loaded with cs', function() {
        expectedSettings['enabled'][keyboardAppManifestURL] =
          {cs: true, number: true};

        assert.deepEqual(KeyboardHelper.settings.enabled,
                         expectedSettings.enabled);
      });

      test('saves settings', function() {
        assert.isTrue(KeyboardHelper.saveToSettings.called);
      });
    });

    suite('old settings: serbian enabled', function() {
      setup(function() {
        this.sinon.stub(KeyboardHelper, 'saveToSettings');
        MockNavigatorSettings.mRequests[3].
          result[DEPRECATE_KEYBOARD_SETTINGS.en] = false;
        MockNavigatorSettings.mRequests[23].
          result[DEPRECATE_KEYBOARD_SETTINGS.sr] = true;
        MockNavigatorSettings.mReplyToRequests();
      });

      test('default settings loaded with cs', function() {
        expectedSettings['enabled'][keyboardAppManifestURL] =
          {'sr-Cyrl': true, 'sr-Latn': true, number: true};

        assert.deepEqual(KeyboardHelper.settings.enabled,
                         expectedSettings.enabled);
      });

      test('saves settings', function() {
        assert.isTrue(KeyboardHelper.saveToSettings.called);
      });
    });
  });

  suite('default settings', function() {
    setup(function() {
      this.sinon.spy(KeyboardHelper, 'saveToSettings');
      MockNavigatorSettings.mRequests[1].result[ENABLED_KEY] =
        defaultSettings.enabled;
      MockNavigatorSettings.mReplyToRequests();
    });
    test('loaded settings properly', function() {
      assert.deepEqual(KeyboardHelper.settings.enabled,
        defaultSettings.enabled);
    });
    test('does not save settings', function() {
      assert.isFalse(KeyboardHelper.saveToSettings.called);
    });
  });

  suite('change default settings', function() {
    var expectedSettings = {
      'default': {},
      enabled: {}
    };

    suiteSetup(function(done) {
      KeyboardHelper.getDefaultLayoutConfig(function(configData) {
        done();
      });
    });

    setup(function() {
      // reset KeyboardHelper each time
      KeyboardHelper.settings['default'] = defaultSettings['default'];
      KeyboardHelper.settings['enabled'] = defaultSettings['default'];
    });

    test('change default settings, keeping the enabled layouts', function() {
      expectedSettings['default'][keyboardAppManifestURL] = {fr: true,
                                                             number: true};
      expectedSettings['enabled'][keyboardAppManifestURL] = {en: true, fr: true,
                                                        number: true};

      KeyboardHelper.changeDefaultLayouts('fr', false);
      assert.deepEqual(KeyboardHelper.settings.default,
                       expectedSettings['default']);

      assert.deepEqual(KeyboardHelper.settings.enabled,
                       expectedSettings.enabled);
    });

    test('change default settings and reset enabled layouts', function() {
      expectedSettings['default'][keyboardAppManifestURL] = {es: true,
                                                             number: true};
      expectedSettings['enabled'][keyboardAppManifestURL] = {es: true,
                                                             number: true};

      KeyboardHelper.changeDefaultLayouts('es', true);
      assert.deepEqual(KeyboardHelper.settings.default,
                       expectedSettings['default']);

      assert.deepEqual(KeyboardHelper.settings.enabled,
                       expectedSettings.enabled);
    });

    test('change default settings and reset for nonLatin', function() {
      expectedSettings['default'][keyboardAppManifestURL] = {
        'zh-Hant-Zhuyin': true, en: true, number: true};
      expectedSettings['enabled'][keyboardAppManifestURL] = {
        'zh-Hant-Zhuyin': true, en: true, number: true};

      KeyboardHelper.changeDefaultLayouts('zh-TW', true);
      assert.deepEqual(KeyboardHelper.settings.default,
                       expectedSettings['default']);

      assert.deepEqual(KeyboardHelper.settings.enabled,
                       expectedSettings.enabled);
    });
  });
});
