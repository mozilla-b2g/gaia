/* global suiteTemplate */
define(function(require) {
'use strict';

require('/shared/elements/gaia-header/dist/gaia-header.js');
var AccountTemplate = require('templates/account');
var AdvancedSettings = require('views/advanced_settings');
var Factory = require('test/support/factory');
var core = require('core');

require('dom!advanced_settings');

suite('Views.AdvancedSettings', function() {
  var subject;
  var template;
  var accountStore;
  var fixtures;
  var settings;
  var triggerEvent;

  suiteSetup(function() {
    triggerEvent = testSupport.calendar.triggerEvent;
  });

  setup(function() {
    fixtures = {
      a: Factory('account', {
        _id: 'a',
        providerType: 'Caldav'
      }),

      b: Factory('account', {
        _id: 'b',
        providerType: 'Caldav'
      }),

      // expected not to be displayed.
      notRendered: Factory('account', {
        _id: 'c',
        providerType: 'Local'
      })
    };
  });

  function modelHtml(object) {
    return template.account.render(
      subject._formatModel(object)
    );
  }

  var db;
  suiteTemplate('advanced-settings', {
    id: 'advanced-settings-view'
  });

  setup(function(done) {
    db = core.db;

    template = AccountTemplate;
    subject = new AdvancedSettings();

    accountStore = core.storeFactory.get('Account');
    settings = core.storeFactory.get('Setting');

    core.db.open(done);
  });

  setup(function(done) {
    var trans = db.transaction('accounts', 'readwrite');

    for (var key in fixtures) {
      accountStore.persist(fixtures[key], trans);
    }

    trans.oncomplete = function() {
      done();
    };

    trans.onerror = function(e) {
      done(e);
    };
  });

  teardown(function(done) {
    testSupport.calendar.clearStore(
      core.db,
      ['accounts'],
      function() {
        core.db.close();
        done();
      }
    );
  });

  test('#accountList', function() {
    assert.ok(subject.accountList);
  });

  test('#syncFrequency', function() {
    var freq = subject.syncFrequency;
    assert.ok(freq);
  });

  test('#element', function() {
    var el = document.querySelector(subject.selectors.element);
    assert.ok(el);

    assert.equal(subject.element, el);
  });

  suite('#_initEvents', function() {
    var object;
    var children;

    setup(function() {
      children = subject.accountList.children;
      object = fixtures.a;
      accountStore.emit('add', object._id, object);
    });

    suite('account store: add', function() {
      test('success', function() {
        assert.ok(children.length, 'adds child');
        assert.ok(
          !children[0].classList.contains('error'),
          'is without error'
        );
      });

      test('with error', function() {
        fixtures.b.error = {};
        accountStore.emit('add', 'foo', fixtures.b);
        delete fixtures.b.error;

        var container = children[children.length - 1];
        assert.ok(container.classList.contains('error'), 'adds error class');
      });

      test('local provider', function() {
        accountStore.emit('add', 'foo', Factory('account', {
          providerType: 'Local'
        }));

        assert.lengthOf(children, 1, 'does not add account');
      });
    });

    suite('account store: update', function() {
      test('add / remove error', function() {
        var classList = children[0].classList;

        object.error = {};
        accountStore.emit('update', object._id, object);
        assert.ok(classList.contains('error'), 'adds error');

        object.error = undefined;
        accountStore.emit('update', object._id, object);
        assert.ok(!classList.contains('error'), 'removes error');
      });
    });

    suite('account store: remove', function() {
      test('missing id', function() {
        accountStore.emit('remove', 'foo');
      });

      test('remove', function() {
        // add a new one first
        accountStore.emit('add', fixtures.b._id, fixtures.b);

        assert.equal(children.length, 2);

        // remove the old one
        accountStore.emit('preRemove', object._id);

        assert.equal(children.length, 1);

        assert.equal(
          children[0].outerHTML,
          modelHtml(fixtures.b)
        );
      });
    });
  });

  suite('#handleSettingUiChange', function() {
    var calledWith;
    var originalSet;

    setup(function() {
      calledWith = 'notcalled';
      originalSet = settings.set;
      settings.set = function(name, value) {
        if (name === 'syncFrequency') {
          calledWith = value;
        }
      };
    });

    teardown(function() {
      settings.set = originalSet;
    });

    function change(name, value) {
      var el = subject[name];
      el.value = value;
      triggerEvent(el, 'change');
    }

    suite('syncFrequency', function() {
      test('null', function() {
        change('syncFrequency', 'null');
        assert.equal(calledWith, null);
      });

      test('numeric', function() {
        change('syncFrequency', '30');
        assert.equal(calledWith, 30);
      });
    });

  });

  suite('#handleSettingDbChange', function() {
    var select;

    suite('syncFrequency', function() {
      setup(function() {
        select = subject.syncFrequency;
      });

      test('numeric 15', function() {
        select.value = 'null';
        settings.emit('syncFrequencyChange', 15);
        assert.equal(select.value, '15');
      });

      test('null', function() {
        select.value = '15';
        settings.emit('syncFrequencyChange', null);
        assert.equal(select.value, 'null');
      });
    });

  });

  suite('#render', function() {
    var list;
    var expectedSyncFreq = 30;

    var expectedEventAlarm = -300;
    var expectedAllDayAlarm = 32400;

    setup(function(done) {
      var pending = 3;

      settings.set('syncFrequency', expectedSyncFreq, next);
      settings.set('standardAlarmDefault', expectedEventAlarm, next);
      settings.set('alldayAlarmDefault', expectedAllDayAlarm, next);

      function next() {
        if (!(--pending)) {
          done();
        }
      }
    });

    // stage error
    setup(function(done) {
      fixtures.b.error = {};
      accountStore.persist(fixtures.b, done);
    });

    setup(function(done) {
      list = subject.accountList;

      subject.render();
      subject.onrender = done;
    });

    test('number of items', function() {
      assert.equal(list.children.length, 2);
    });

    function checkItem(index, name) {
      var item = list.children[index];
      var model = fixtures[name];
      var expected = modelHtml(model);
      assert.equal(item.outerHTML, expected, name);
    }

    test('accounts', function() {
      checkItem(0, 'a');

      var errorChild = list.children[1];
      assert.ok(
        errorChild.classList.contains('error'),
        'has error'
      );
    });

    test('syncFrequency', function() {
      var element = subject.syncFrequency;
      assert.ok(
        element.value == expectedSyncFreq,
        'set to stored value'
      );
    });

    test('alarm select populated', function() {
      assert.equal(
        subject.standardAlarmLabel.querySelectorAll('select').length,
        1
      );
      assert.equal(
        subject.alldayAlarmLabel.querySelectorAll('select').length,
        1
      );
    });

    test('alarms set to stored value', function() {
      assert.equal(
        subject.standardAlarm.value, expectedEventAlarm,
        'event alarm set to stored value'
      );

      assert.equal(
        subject.alldayAlarm.value, expectedAllDayAlarm,
        'event alarm set to stored value'
      );
    });
  });
});

});
