/* globals ValueSelector */
'use strict';

requireApp('communications/contacts/test/unit/mock_l10n.js');
requireApp('communications/contacts/js/value_selector.js');

if (!window._) {
  window._ = null;
}

if (!window.utils) {
  window.utils = null;
}

suite('Test Value Selector', function() {
  var real_,
      selectorTitle = 'selectorTitle',
      prompt1;
  var phone = '44445555', email = 'test@test';
  var element;

  suiteSetup(function() {
    real_ = window._;
    window._ = navigator.mozL10n.get;

    if (!window.utils) {
      window.utils = {};
    }
    prompt1 = new ValueSelector(selectorTitle, [
      {
        label: 'Dummy element',
        callback: function() {
        }
      }
    ]);
    element = document.getElementsByClassName('valueselector');
  });

  suiteTeardown(function() {
    window._ = real_;
  });

  suite('Launch ValueSelector Screen', function() {

    setup(function() {
    });

    test('addToList', function() {
      var expect0 = '44445555', expect1 = 'test@test';

      prompt1.addToList('label1', phone,
        function(phone) { return function() {
          console.log('called selector function0 : ' + phone);
          assert.equal(expect0, phone);
        };
      }(phone));

      prompt1.addToList('label2', email,
        function(email) { return function() {
          console.log('called selector function1 : ' + email);
          assert.equal(expect1, email);
        };
      }(email));
    });
    test('show', function() {
      prompt1.show();

      //Emulate user tap operation to call callback.
      var elem = document.getElementById('item0');
      console.log('elem for item1 : ' + elem.innerHTML);
      var evt = document.createEvent('TouchEvent');
      evt.initEvent('click', false, true);
      elem.dispatchEvent(evt);

      elem = document.getElementById('item1');
      console.log('elem for item2 : ' + elem.innerHTML);
      evt.initEvent('click', false, true);
      elem.dispatchEvent(evt);

      //check a title of selector screen
      assert.equal(selectorTitle,
        element[0].getElementsByTagName('h3')[0].innerHTML);

      assert.isTrue(element[0].classList.contains('visible'));
    });

    test('hide', function() {
      prompt1.hide();
      assert.isFalse(element[0].classList.contains('visible'));
    });
  }); //suite end
});
