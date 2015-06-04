/* global suiteTemplate */
define(function(require) {
'use strict';

require('/shared/elements/gaia-header/dist/gaia-header.js');
var AccountTemplate = require('templates/account');
var AdvancedSettings = require('views/advanced_settings');
var Factory = require('test/support/factory');
var core = require('core');
var waitFor = require('test/support/wait_for');

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
    var children;

    setup(function(done) {
      children = subject.accountList.children;
      subject._initEvents();
      waitFor(() => children.length === 2, done);
    });

    suite('syncFrequency', function() {
      var expected;

      setup(function(done) {
        settings.getValue('syncFrequency', function(err, value) {
          expected = String(value);
          done(err);
        });
      });

      test('selected value should match store', function(done) {
        assert.ok(expected, 'expected');
        waitFor(() => subject.syncFrequency.value === expected, done);
      });
    });

    suite('account with error', function() {
      var withError;

      setup(function(done) {
        withError = Factory('account', {
          _id: 'with-error',
          providerType: 'Caldav',
          error: {}
        });
        accountStore.persist(withError);
        waitFor(() => children.length === 3, done);
      });

      teardown(function(done) {
        accountStore.remove(withError._id);
        waitFor(() => children.length === 2, done);
      });

      test('adds error class', function() {
        assert.ok(subject.accountList.querySelector('.error'));
      });

      test('| update', function(done) {
        accountStore.persist(Factory('account', {
          _id: 'with-error',
          providerType: 'Caldav',
          error: undefined
        }));

        waitFor(() => {
          return subject.accountList.querySelector('.error') == null;
        }, done);
      });

      test('| remove', function(done) {
        accountStore.remove(withError._id);
        waitFor(() => children.length === 2, done);
      });
    });

    suite('local provider', function() {
      setup(function(done) {
        accountStore.persist(Factory('account', {
          providerType: 'Local'
        }), done);
      });
      test('does not add account', function() {
        assert.lengthOf(children, 2);
      });
    });
  });

  suite('#handleSettingUiChange', function() {
    var calledWith;
    var originalSet;

    setup(function() {
      subject._initEvents();
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

  suite('on syncFrequencyChange', function() {
    var select;

    suite('syncFrequency', function() {
      setup(function() {
        select = subject.syncFrequency;
        subject._initEvents();
      });

      test('numeric 15', function(done) {
        select.value = 'null';
        settings.emit('syncFrequencyChange', 15);
        waitFor(() => select.value === '15', done);
      });

      test('null', function(done) {
        select.value = '15';
        settings.emit('syncFrequencyChange', null);
        waitFor(() => select.value === 'null', done);
      });
    });

  });

  suite('#render', function() {
    var list;

    var expectedEventAlarm = -300;
    var expectedAllDayAlarm = 32400;

    setup(function(done) {
      var pending = 2;

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

      subject.render().then(done);
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
