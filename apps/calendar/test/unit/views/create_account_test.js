define(function(require) {
'use strict';

var AccountTemplate = require('templates/account');
var CreateAccount = require('views/create_account');
var Presets = require('common/presets');
var core = require('core');

suite('Views.CreateAccount', function() {
  var subject;
  var template;
  var storeFactory;

  teardown(function() {
    var el = document.getElementById('test');
    el.parentNode.removeChild(el);
  });

  setup(function(done) {
    var div = document.createElement('div');
    div.id = 'test';
    div.innerHTML = [
      '<div id="create-account-view">',
        '<gaia-header id="create-account-header" action="back">',
          '<h1>Add an account</h1>',
        '</gaia-header>',
        '<ul id="create-account-presets"></ul>',
      '</div>'
    ].join('');

    document.body.appendChild(div);

    storeFactory = core.storeFactory;
    template = AccountTemplate;
    subject = new CreateAccount();
    core.db.open(done);
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

  test('#element', function() {
    var el = document.querySelector(subject.selectors.element);
    assert.ok(el);

    assert.equal(subject.element, el);
  });

  test('#accounts', function() {
    assert.equal(
      subject.accounts,
      document.querySelector(subject.selectors.accounts)
    );
  });

  suite('#_initEvents', function() {

    test('when an account is added', function() {
      var store = storeFactory.get('Account');
      var renderCalled = false;
      subject.render = function() {
        renderCalled = true;
      };

      store.emit('add');

      assert.equal(renderCalled, true);
    });

    test('when an account is removed', function() {
      var store = storeFactory.get('Account');
      var renderCalled = false;
      subject.render = function() {
        renderCalled = true;
      };

      store.emit('remove');

      assert.equal(renderCalled, true);
    });
  });

  suite('#render', function() {
    setup(function() {
      subject.accounts.innerHTML = '__MARKER__';
    });

    suite('default calendar presets', function() {
      var presets;

      setup(function(done) {
        presets = Object.keys(Presets);
        subject.render();
        subject.onrender = done;
      });

      test('each preset is displayed', function() {
        var html = subject.accounts.innerHTML;

        assert.ok(html);

        presets.forEach(function(val) {
          assert.include(
            html,
            val
          );
        });
      });
    });

    suite('with preset marked for single use', function() {
      setup(function(done) {
        subject.presets = {
          'one': {
            singleUse: true,
            providerType: 'local'
          },
          'two': {
            singleUse: true,
            providerType: 'local'
          }
        };

        var accountStore = storeFactory.get('Account');

        accountStore.persist({ preset: 'one' }, function() {
          subject.render();
          subject.onrender = done;
        });
      });

      test('hides used single use presets', function() {
        assert.ok(
          subject.accounts.innerHTML.indexOf('__MARKER__') === -1
        );

        var html = subject.accounts.innerHTML;
        assert.ok(html);
        var hasLocal = (html.indexOf('local') !== -1);

        assert.isFalse(
          hasLocal,
          'single use presets should not be displayed'
        );
      });
    });
  });
});

});
