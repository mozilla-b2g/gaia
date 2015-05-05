(function(window) {
'use strict';

var configured = false;
function configureLoader() {
  requirejs.config({
    baseUrl: '/js',
    paths: {
      css: '/test/unit/support/css',
      dom: '/test/unit/support/dom',
      shared: '/shared/js',
      sharedtest: '/shared/test/unit',
      test: '/test/unit'
    },
    map: {
      '*': {
        'ext/page': 'test/support/fake_page'
      }
    },
    shim: {
      'ext/caldav': { exports: 'Caldav' },
      'ext/ical': { exports: 'ICAL' },
      'shared/gesture_detector': { exports: 'GestureDetector' },
      'shared/notification_helper': { exports: 'NotificationHelper' },
      'sharedtest/mocks/mock_l10n': { exports: 'MockL10n' }
    }
  });

  configured = true;
}

function l10nLink(href) {
  var link = document.createElement('link');
  link.setAttribute('href', href);
  link.setAttribute('rel', 'localization');
  document.head.appendChild(link);
}

function l10nMeta(defaultLanguage, availableLanguages) {
  var metaDL = document.createElement('meta');
  metaDL.setAttribute('name', 'defaultLanguage');
  metaDL.setAttribute('content', defaultLanguage);

  var metaAL = document.createElement('meta');
  metaAL.setAttribute('name', 'availableLanguages');
  metaAL.setAttribute('content', availableLanguages.join(', '));

  document.head.appendChild(metaDL);
  document.head.appendChild(metaAL);
}

function loadL10n() {
  return new Promise((resolve) => {
    requirejs(['shared/l10n'], () => {
      requirejs(['shared/l10n_date'], () => {
        // Massive hack to trick l10n to load
        // TODO: upstream a fix to l10n.js
        document.dispatchEvent(new Event('DOMContentLoaded'));

        var readyState = navigator.mozL10n.readyState;
        switch (readyState) {
          case 'complete':
          case 'interactive':
            return resolve();
        }

        window.addEventListener('localized', () => resolve());
      });
    });
  });
}

function loadApp() {
  // TODO(gareth): We load these extras by default here since we need them
  //     for the test helpers below, but this situation is really sad...
  return new Promise((accept) => {
    requirejs([
      'app',
      'core',
      'db',
      'ext/chai',
      'ext/chai-as-promised',
      'provider/factory',
      'router',
      'test/support/fake_page',
      'test/support/factories/all',
      'test/support/mock_provider'
    ], () => accept());
  });
}

window.testAgentRuntime.testLoader = function(path) {
  console.log('Will run test at: ' + path + '...');
  return require('/js/ext/alameda.js')
  .then(() => {
    if (!configured) {
      console.log('Will configure requirejs...');
      configureLoader();
    }

    console.log('Will setup app localization...');
    l10nLink('/locales/calendar.{locale}.properties');
    l10nLink('/shared/locales/date/date.{locale}.properties');
    l10nMeta('en-US', ['en-US']);
    return loadL10n();
  })
  .then(() => {
    console.log('Will load app...');
    return loadApp();
  })
  .then(() => {
    console.log('Will setup app & core...');
    window.testSupport.calendar.core();
  })
  .then(() => {
    console.log('Will override default chai...');
    var chai = requirejs('ext/chai');
    var chaiAsPromised = requirejs('ext/chai-as-promised');
    chai.use(chaiAsPromised);

    /* chai extensions */

    // XXX: this is a lame way to do this
    // in reality we need to fix the above upstream
    // and leverage new chai 1x methods
    chai.assert.hasProperties = function (given, props, msg) {
      msg = (typeof(msg) === 'undefined') ? '' : msg + ': ';

      if (props instanceof Array) {
        props.forEach(function(prop) {
          assert.ok(
            (prop in given),
            msg + 'given should have "' + prop + '" property'
          );
        });
      } else {
        for (var key in props) {
          assert.deepEqual(
            given[key],
            props[key],
            msg + ' property equality for (' + key + ') '
          );
        }
      }
    };

    window.assert = chai.assert;
    window.expect = chai.expect;
    window.should = chai.Should();
  })
  .then(() => {
    return new Promise((accept) => {
      requirejs([path], () => accept());
    });
  });
};

window.testSupport = window.testSupport || {};
window.testSupport.calendar = {
  _lastEnvId: 0,

  accountEnvironment: function(accOverrides, calOverrides) {
    setup(function(done) {
      var Factory = requirejs('test/support/factory');
      var core = requirejs('core');
      var id = ++testSupport.calendar._lastEnvId;

      var trans = core.db.transaction(
        ['accounts', 'calendars'],
        'readwrite'
      );

      trans.oncomplete = function() {
        done();
      };

      trans.onerror = function(e) {
        done(e.target.error);
      };

      accOverrides = accOverrides || {};
      calOverrides = calOverrides || {};

      accOverrides._id = id;
      calOverrides.accountId = id;

      accOverrides.providerType = accOverrides.providerType || 'Mock';

      var account = Factory('account', accOverrides);
      var calendar = Factory('calendar', calOverrides);

      this.account = account;
      this.calendar = calendar;

      var storeFactory = core.storeFactory;
      var accountStore = storeFactory.get('Account');
      accountStore.persist(account, trans);
      var calendarStore = storeFactory.get('Calendar');
      calendarStore.persist(calendar, trans);
    });
  },

  eventEnvironment: function(busytimeOverrides, eventOverrides) {
    setup(function(done) {
      var Factory = requirejs('test/support/factory');
      var core = requirejs('core');

      eventOverrides = eventOverrides || {};
      eventOverrides.calendarId = this.calendar._id;
      eventOverrides._id = eventOverrides._id || 'one';

      this.event = Factory('event', eventOverrides);

      busytimeOverrides = busytimeOverrides || {};
      busytimeOverrides.eventId = this.event._id;
      busytimeOverrides.calendarId = this.calendar._id;

      this.busytime = Factory('busytime', busytimeOverrides);

      var storeFactory = core.storeFactory;
      var eventStore = storeFactory.get('Event');
      var trans = core.db.transaction(
        eventStore._dependentStores,
        'readwrite'
      );

      trans.oncomplete = function() {
        done();
      };

      trans.onerror = function(e) {
        done(e.target.error);
      };

      eventStore.persist(this.event, trans);
      storeFactory.get('Busytime').persist(this.busytime, trans);
    });
  },

  triggerEvent: function(element, eventName) {
    var event = document.createEvent('HTMLEvents');
    event.initEvent(eventName, true, true);
    element.dispatchEvent(event);
  },

  loadObjects: function() {
    var list = Array.slice(arguments);

    list.forEach(function(item) {
      setup(function(done) {
        var app = requirejs('app');
        app.loadObject(item, done);
      });
    });
  },

  loadSample: function(file, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/test/unit/fixtures/' + file, true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status !== 200) {
          cb(new Error('file not found or other error (' + file + ')', xhr));
        } else {
          cb(null, xhr.responseText);
        }
      }
    };
    xhr.send(null);
  },

  clearStore: function(db, name, done) {
    var Db = requirejs('db');

    if (typeof(name) === 'function') {
      done = name;
      name = Object.keys(Db.prototype.store);
    }

    var trans = db.transaction(name, 'readwrite');

    name = [].concat(name);

    name.forEach(function(storeName) {
      var store = trans.objectStore(storeName);
      store.clear();
    });

    trans.oncomplete = function() {
      done(null);
    };

    trans.onerror = function() {
      done(new Error('could not wipe accounts db'));
    };

  },

  core: function() {
    var MockProvider = requirejs('test/support/mock_provider');
    var app = requirejs('app');
    var core = requirejs('core');

    if (app._pendingManger) {
      // hack to ensure clean tests
      app._pendingManger.objects.forEach(function(item) {
        app._pendingManger.unregister(item);
      });
    }

    if (core.db && core.db.isOpen) {
      core.db.close();
    }

    app._setupCore('b2g-test-calendar');
    core.providerFactory.providers.Mock = new MockProvider();

    return core;
  },

  bench: function bench(iter, cb) {
    var start = window.performance.now(),
        i = 0;

    for (; i < iter; i++) {
      cb();
    }

    return window.performance.now() - start;
  },

  vs: function vs(iter, cmds) {
    var results = {},
        key;

    for (key in cmds) {
      if (cmds.hasOwnProperty(key)) {
        results[key] = testSupport.calendar.bench(iter, cmds[key]);
      }
    }

    return results;
  },

  dbFixtures: function(factory, storeName, list) {
    var Factory = requirejs('test/support/factory');
    var object = Object.create(null);

    setup(function(done) {
      var core = requirejs('core');
      var db = core.db;
      var store = core.storeFactory.get(storeName);
      var trans = db.transaction(store._dependentStores, 'readwrite');

      for (var key in list) {
        store.persist(
          (object[key] = Factory(factory, list[key])),
          trans
        );
      }

      trans.onerror = function(e) {
        done(e.target.error);
      };

      trans.oncomplete = function() {
        done();
      };
    });

    return object;
  }
};

}(this));
