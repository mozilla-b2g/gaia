define(function(require) {
'use strict';

var CalendarTemplate = require('templates/calendar');
var Factory = require('test/support/factory');
var Settings = require('views/settings');
var View = require('view');
var core = require('core');
var nextTick = require('common/next_tick');
var suiteGroup = require('test/support/suite_group');

requireCommon('test/synthetic_gestures.js');

suiteGroup('views/settings', function() {
  /* jshint -W027 */
  return;
  var subject;
  var store;
  var controller;
  var storeFactory;
  var syncController;
  var template;
  var triggerEvent;
  var account;
  var models;

  function stageModels(list) {
    var object = Object.create(null);

    setup(function(done) {
      account = Factory('account', { _id: 'testacc' });

      var trans = core.db.transaction(
        ['calendars', 'accounts'], 'readwrite'
      );

      trans.oncomplete = function() {
        done();
      };

      trans.onerror = function(e) {
        done(e.target.error);
      };

      storeFactory.get('Account').persist(account, trans);

      var model;
      for (var key in list) {
        list[key].accountId = account._id;
        model = Factory('calendar', list[key]);
        store.persist((object[key] = model), trans);
      }
    });

    return object;
  }

  suiteSetup(function() {
    triggerEvent = testSupport.calendar.triggerEvent;
    syncController = core.syncController;
  });

  teardown(function() {
    var el = document.getElementById('test');
    el.parentNode.removeChild(el);
  });

  setup(function(done) {
    var div = document.createElement('div');
    div.id = 'test';
    div.innerHTML = [
      '<div id="settings">',
      '  <header>',
      '    <button data-l10n-id="back"',
      '            class="settings-back"></button>',
      '  </header>',
      '  <div class="settings-shield"></div>',
      '  <div class="settings-drawer-container">',
      '    <div class="settings-drawer">',
      '      <ol class="calendars">',
      '      </ol>',
      '      <div role="toolbar">',
      '        <button class="settings toolbar-item">',
      '          <span class="icon"',
      '                data-l10n-id="advanced-settings-short-icon-button">',
      '          </span>',
      '        </button>',
      '        <button class="sync update toolbar-item">',
      '          <span class="icon"',
      '                data-l10n-id="drawer-sync-icon-button"></span>',
      '          <span class="sync-progress" role="progressbar"></span>',
      '        </button>',
      '      </div>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('');

    document.body.appendChild(div);

    controller = core.timeController;
    storeFactory = core.storeFactory;
    store = storeFactory.get('Calendar');
    template = CalendarTemplate;

    subject = new Settings({
      syncProgressTarget: div,
      // normally this is higher in production but
      // we don't need to wait that long in tests.
      waitBeforePersist: 10
    });

    subject.calendarList = {
      first: {
        localDisplayed: true,
        _id: 'first',
        remote: {
          name: 'first'
        }
      },
      local: {
        localDisplayed: true,
        _id: 'local-first',
        remote: {
          name: 'this should not be used!!!!'
        }
      }
    };

    core.db.open(done);

    models = stageModels({
      displayed: {
        localDisplayed: true,
        _id: 1
      },

      hidden: {
        localDisplayed: false,
        _id: 'hidden'
      }
    });

  });

  teardown(function(done) {
    testSupport.calendar.clearStore(
      core.db,
      ['accounts', 'calendars'],
      function() {
        core.db.close();
        done();
      }
    );
  });

  test('initialization', function() {
    assert.instanceOf(subject, View);
    assert.equal(
      subject.element, document.querySelector('#settings')
    );
  });

  test('#calendars', function() {
    assert.ok(subject.calendars);
  });

  test('#syncButton', function() {
    assert.ok(subject.syncButton);
  });

  test('#syncProgressTarget', function() {
    assert.ok(subject.syncProgressTarget);
  });

  test('#syncProgress', function() {
    assert.ok(subject.syncProgress);
  });

  suite('#_observeAccountStore', function() {
    var accounts = testSupport.calendar.dbFixtures(
      'account',
      'Account',
      {
        sync: { _id: 'sync', providerType: 'Caldav' },
        nosync: { _id: 'nosync', providerType: 'Local' }
      }
    );

    var syncAccount;
    var accountStore;
    setup(function(done) {
      accountStore = storeFactory.get('Account');
      syncAccount = accounts.sync;

      subject.render();
      subject.onrender = done;
    });

    suite('remove', function() {
      setup(function(done) {
        accountStore.remove(accounts.sync._id);
        subject.onupdatesyncbutton = function() {
          subject.onupdatesyncbutton = null;
          done();
        };
      });

      suite('add', function() {
        setup(function(done) {
          delete syncAccount._id;

          accountStore.persist(syncAccount);
          subject.onupdatesyncbutton = function() {
            subject.onupdatesyncbutton = null;
            done();
          };
        });
      });
    });

  });

  suite('#_observeCalendarStore', function() {
    var children;
    setup(function(done) {
      // we must wait until rendering completes
      subject.onrender = function() {
        children = subject.calendars.children;
        nextTick(done);
      };

      subject.render();
    });

    suite('calendar update / error', function() {
      var model;
      var container;

      setup(function() {
        model = models.first;
        container = children[0];
      });

      test('update with error / without error', function() {
        model.error = {};
        store.emit('update', model._id, model);

        assert.ok(
          container.classList.contains('error'),
          'has error class'
        );

        delete model.error;
        store.emit('update', model._id, model);

        assert.ok(
          !container.classList.contains('error'),
          'removes error class'
        );
      });

      test('normal flow', function() {
        var check = children[0].querySelector(
          '*[type="checkbox"]'
        );

        model.localDisplayed = false;
        model.remote.name = 'foo';

        store.emit('update', model._id, model);

        assert.equal(children[0].textContent.trim(), 'foo');
        assert.isFalse(
          check.checked
        );
      });

      test('toggle l10n', function() {
        var check = children[1].querySelector('[type="checkbox"]');
        assert.ok(
          check.checked,
          'should be checked'
        );

        var model = models.local;
        model.localDisplayed = false;
        store.emit('update', model._id, model);

        assert.equal(children[1].textContent.trim(), 'Offline calendar');
        assert.isFalse(
          check.checked,
          'should uncheck'
        );
      });
    });

    suite('add', function() {
      function addModel() {
        store.emit('add', 'two', model);
        assert.equal(children.length, 3);
        var container = children[2];
        assert.equal(container.textContent.trim(), 'second');

        return container;
      }

      var model;
      setup(function() {
        model = Factory('calendar', {
          localDisplayed: false,
          _id: 'two',
          remote: { name: 'second' }
        });

        assert.equal(children.length, 2);
      });

      test('success', function() {
        var container = addModel();
        assert.ok(
          !container.classList.contains('error'),
          'does not add error'
        );
      });

      test('add with error', function() {
        model.error = {};
        var container = addModel();
        assert.ok(
          container.classList.contains('error'),
          'has error'
        );
      });

    });

    test('remove', function() {
      assert.equal(children.length, 2);
      store.emit('preRemove', models.first._id);
      store.emit('remove', models.first._id);
      assert.equal(children.length, 1);
    });
  });

  suite('syncProgress', function() {

    test('syncStart', function(done) {
      syncController.on('syncStart', function () {
        assert.ok(subject.syncProgress.classList.contains('syncing'));
        assert.equal(subject.syncProgress.getAttribute('data-l10n-id'),
        'sync-progress-syncing');
        done();
      });
      syncController.emit('syncStart');
    });

    test('syncComplete', function(done) {
      syncController.on('syncComplete', function () {
        assert.equal(subject.syncProgress.getAttribute('data-l10n-id'),
        'sync-progress-complete');
        assert.notOk(subject.syncProgress.classList.contains('syncing'));
        done();
      });
      syncController.emit('syncComplete');
    });
  });

  suite('#_onCalendarDisplayToggle', function() {
    var checkboxes;
    setup(function(done) {
      subject.render();
      subject.onrender = function() {
        checkboxes = {};

        for (var id in models) {
          checkboxes[id] = subject.calendars.querySelector(
            'input[value="' + models[id]._id + '"]'
          );
        }

        done();
      };
    });

    function checkAsync(id, value) {
      nextTick(function() {
        checkboxes[id].checked = !!value;
        triggerEvent(checkboxes[id], 'change');
      });
    }

    test('changing display state to false', function(done) {
      // the goal is to trigger the change event
      // multiple times but verify we only persist
      // once...
      assert.isTrue(
        checkboxes.displayed.checked, 'begins checked'
      );

      // fired when calendar is persisted
      subject.ondisplaypersist = function(calendar) {
        done(function() {
          assert.equal(calendar._id, models.displayed._id);
          // verify we set it to false and checkbox is hidden.
          assert.isFalse(calendar.localDisplayed);
          assert.isFalse(checkboxes.displayed.checked);
        });
      };

      checkAsync('displayed', false);
      checkAsync('displayed', true);
      checkAsync('displayed', false);
    });

    test('changing display to true', function(done) {
      assert.isFalse(
        checkboxes.hidden.checked,
        'begins unchecked'
      );

      checkAsync('hidden', true);

      subject.ondisplaypersist = function(calendar) {
        done(function() {
          assert.equal(calendar._id, models.hidden._id);
          assert.isTrue(calendar.localDisplayed);
          assert.isTrue(checkboxes.hidden.checked);
        });
      };
    });

  });

  suite('#render', function() {
    testSupport.calendar.dbFixtures(
      'account',
      'Account', {
        one: {
          _id: 'one',
          providerType: 'Local'
        },

        two: {
          _id: 'two',
          providerType: 'Caldav'
        }
      }
    );

    var calendars = testSupport.calendar.dbFixtures(
      'calendar',
      'Calendar', {
        one: {
          accountId: 'one',
          name: 'First',
          localDisplayed: true,
          _id: 1
        },

        two: {
          accountId: 'two',
          name: 'Second',
          localDisplayed: false,
          _id: 2,
          error: {}
        }
      }
    );

    suite('calendars', function() {
      var one;
      var two;
      var children;

      setup(function(done) {
        subject.onrender = function() {
          children = subject.calendars.children;
          one = children[0];
          two = children[1];
          done();
        };
        subject.render();
      });

      test('number of calendars', function() {
        assert.equal(children.length, 2);
      });

      test('naming', function() {
        assert.equal(one.textContent.trim(), calendars.one.name);
        assert.equal(two.textContent.trim(), calendars.two.name);
      });

      test('localDisplayed on calendar', function() {
        assert.isTrue(
          one.querySelector('*[type="checkbox"]').checked
        );

        assert.isFalse(
          two.querySelector('*[type="checkbox"]').checked
        );
      });

      test('error on calendar', function() {
        assert.ok(
          two.classList.contains('error'),
          'if error is present in model render shows it'
        );
      });
    });

  });
});

});
