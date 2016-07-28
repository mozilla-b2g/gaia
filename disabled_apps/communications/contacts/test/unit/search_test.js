'use strict';
/* global Search, MockSearchHtml, Normalizer, MockSearchSource, MocksHelper */

requireApp('communications/contacts/test/unit/mock_search.html.js');
requireApp('communications/contacts/test/unit/mock_search_source.js');
require('/shared/js/text_normalizer.js');
require('/shared/js/contacts/utilities/event_listeners.js');
require('/shared/js/contacts/utilities/image_loader.js');
require('/shared/js/lazy_loader.js');
require('/shared/js/contacts/utilities/dom.js');
require('/shared/js/utilities.js');
requireApp('communications/contacts/test/unit/mock_navigation.js');
requireApp('communications/contacts/test/unit/mock_main_navigation.js');

require('/contacts/js/fb_resolver.js');

new MocksHelper([
  'MainNavigation'
]).init();

require('/shared/js/contacts/search.js');

suite('Search mode', function() {
  var searchBox, searchList, noResults;
  var contact = {
    id: 'b1ae8e148bd14560aaa9d7265bb39b0f',
    givenName: ['Aaeéií(") BC'],
    familyName: ['Surname'],
    tel: [{ value:'555555555'}]
  };

  function assertContactFound(contactUuid, expectedContacts) {
    var selectorStr = 'section#groups-list-search li.contact-item';
    var contacts = document.querySelectorAll(selectorStr);
    assert.isTrue(noResults.classList.contains('hide'));
    assert.lengthOf(contacts, expectedContacts, 'The number of contacts' +
      ' retrieved is different from what is expected');

    assert.isFalse(contacts[0] === null, 'The search returned no contacts');

    var contactFound = false;
    for (var i = 0, len = contacts.length; i < len; i++) {
      if (contacts[i].dataset.uuid == contactUuid) {
        contactFound = true;
        break;
      }
    }
    assert.isTrue(contactFound, 'The contact has not been found');
  }

  suiteSetup(function() {
    document.body.innerHTML = MockSearchHtml;

    searchList = document.getElementById('search-list');
    noResults = document.getElementById('no-result');

    searchBox = document.getElementById('search-contact');
    Search.init(MockSearchSource, true, null);
    Search.enterSearchMode({preventDefault: function() {}});
  });

  teardown(function() {
    Search.invalidateCache();
  });

  test('Search results are empty', function(done) {
    searchBox.value = 'YYY';
    Search.search(function search_finished() {
      done(function() {
        assert.isFalse(noResults.classList.contains('hide'));
      });
    });
  });

  test('Search by name & surname with trailing whitespaces', function(done) {
    searchBox.value = contact.givenName[0].substr(0,4) + '  ';
    searchBox.value += contact.familyName[0] + '   ';
    window.Search.search(function search_finished() {
      done(function() {
        assertContactFound(contact.id, 1);
      });
    });
  });

  test('Search non-alphabetical characters', function(done) {
    searchBox.value = ')';
    Search.search(function search_finished() {
      done(function() {
        assertContactFound(contact.id, 1);
      });
    });
  });

  test('Search for quotes', function(done) {
    searchBox.value = '"';
    Search.search(function search_finished() {
      done(function() {
        assertContactFound(contact.id, 1);
      });
    });
  });

  test('Search phone number', function(done) {
    searchBox.value = contact.tel[0].value;
    Search.search(function search_finished() {
      done(function() {
        assertContactFound(contact.id, 1);
      });
    });
  });

  test('Searching for initials with middle name', function(done) {
    var givenName = contact.givenName[0];
    var middleNameInitial = givenName[givenName.indexOf(' ') + 1];
    searchBox.value = givenName[0] + ' ' + middleNameInitial +  ' ' +
                                                      contact.familyName[0][0];
    Search.search(function search_finished() {
      done(function() {
        assertContactFound(contact.id, 1);
      });
    });
  });

  suite('Highlighting', function() {
    teardown(function() {
      Search.invalidateCache();
    });

    // With 'strict' set to false, we will only need a single match to pass the
    // test. Otherwise, every highlighted string needs to be equal to 'phrase'.
    function assertHighlight(phrase, strict) {
      var regExp = new RegExp('^' + Normalizer.toAscii(phrase) + '$', 'i'),
          highlightedNodes = searchList.getElementsByTagName('mark');

      assert.isTrue(highlightedNodes.length > 0);

      for (var i = 0, l = highlightedNodes.length; i < l; i++) {
        // We want to be non-case-sensitive so simple comparison of strings will
        // not work here. There could also be problems with different languages
        // when using String.toLowerCase(), that's why we use a RegExp.
        var normalized = Normalizer.toAscii(highlightedNodes[i].innerHTML);
        var test = regExp.test(normalized);
        if (strict){
          assert.isTrue(test);
        } else if (test) {
          return;
        }
      }

      if (!strict) {
        assert.fail();
      }
    }

    test('Highlighting does not modify contact text', function(done) {
      searchBox.value = contact.givenName[0][0];
      Search.search(function search_finished() {
        done(function() {
          var selector = '#groups-list-search .contact-item .contact-text';
          assert.equal(contact.givenName[0] + ' ' + contact.familyName[0],
                                searchList.querySelector(selector).textContent);
        });
      });
    });

    test('Correctly highlighted for first char', function(done) {
      searchBox.value = contact.familyName[0][0];
      Search.search(function search_finished() {
        done(function() {
          assertHighlight(contact.familyName[0][0], true);
        });
      });
    });

    test('Correctly highlighted for more than one letter', function(done) {
      searchBox.value = contact.familyName[0];
      Search.search(function search_finished() {
        done(function() {
          assertHighlight(contact.familyName[0], true);
        });
      });
    });

    test('Equivalent extended characters are highlighted', function(done) {
      searchBox.value = 'ae';
      Search.search(function search_finished() {
        done(function() {
          assertHighlight('áe', false);
        });
      });
    });

    test('Accented search term highlights accented and equivalent characters',
        function(done) {
      searchBox.value = 'áe';
      Search.search(function search_finished() {
        done(function() {
          assertHighlight('áe', false);
          assertHighlight('ae', false);
        });
      });
    });
  });
});
