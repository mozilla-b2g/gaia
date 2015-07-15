/* global LazyLoader, MergeHelper, ContactsService, utils,
   Matcher, MatchService */


/*
 * Once critical path is loaded, we will listen events dispatched
 * from the UI. This events will come with the info needed in order
 * to execute actions related with the UI (close, save, update...).
 *
 * Controller will *not* contain any code related with the DOM/UI,
 * and will rely on the info provided by the event.
 */

(function(exports) {
  'use strict';

  var _;
  var _activity, _contact, _comesFromActivity;
  const CONTACTS_APP_ORIGIN = location.origin;

  function close() {
    if (_activity) {
      _activity.postResult({});
    } else if (_comesFromActivity) {
      window.close();
    } else {
      window.history.back();
    }
  }

  function hasName(contact) {
    return (Array.isArray(contact.givenName) && contact.givenName[0] &&
              contact.givenName[0].trim()) ||
            (Array.isArray(contact.familyName) && contact.familyName[0] &&
              contact.familyName[0].trim());
  }


  function doMerge(contact, list, cb) {
    var callbacks = {
      success: cb,
      error: function(e) {
        console.error('Failed merging duplicate contacts: ', e.name);
        cb();
      }
    };

    LazyLoader.load('/contacts/js/utilities/merge_helper.js', function() {
      MergeHelper.merge(contact, list).then(callbacks.success, callbacks.error);
    });
  }

  function getCompleteName(contact) {
    var givenName = Array.isArray(contact.givenName) ?
                    contact.givenName[0] : '';

    var familyName = Array.isArray(contact.familyName) ?
                    contact.familyName[0] : '';

    var completeName = givenName && familyName ?
                       givenName + ' ' + familyName :
                       givenName || familyName;

    return completeName;
  }
  // Fills the contact data to display if no givenName and familyName
  function getDisplayName(contact) {
    if (hasName(contact)) {
      return { givenName: contact.givenName, familyName: contact.familyName };
    }

    // TODO Remove l10n deprecated methods:
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1181586
    var givenName = [];
    if (Array.isArray(contact.name) && contact.name.length > 0) {
      givenName.push(contact.name[0]);
    } else if (contact.org && contact.org.length > 0) {
      givenName.push(contact.org[0]);
    } else if (contact.tel && contact.tel.length > 0) {
      givenName.push(contact.tel[0].value);
    } else if (contact.email && contact.email.length > 0) {
      givenName.push(contact.email[0].value);
    } else {
      givenName.push(_('noName'));
    }

    return { givenName: givenName, modified: true };
  }

  function doMatch(contact, callbacks) {
    LazyLoader.load(['/shared/js/text_normalizer.js',
                     '/shared/js/simple_phone_matcher.js',
                     '/shared/js/contacts/contacts_matcher.js'], function() {
      Matcher.match(contact, 'active', callbacks);
    });
  }

  var mergeHandler;
  function cookMatchingCallbacks(contact) {
    return {
      onmatch: function(results) {
        MatchService.showDuplicateContacts();

        mergeHandler = function mergeHandler(e) {
          if (e.origin !== CONTACTS_APP_ORIGIN) {
            return;
          }

          var data = e.data;
          switch (data.type) {
            case 'duplicate_contacts_loaded':
              // UI ready, passing duplicate contacts
              var duplicateContacts = {};
              Object.keys(results).forEach(function(id) {
                duplicateContacts[id] = {
                  matchingContactId: id,
                  matchings: results[id].matchings
                };
              });

              window.postMessage({
                type: 'show_duplicate_contacts',
                data: {
                  name: getCompleteName(getDisplayName(contact)),
                  duplicateContacts: duplicateContacts
                }
              }, CONTACTS_APP_ORIGIN);

            break;

            case 'merge_duplicate_contacts':
              window.removeEventListener('message', mergeHandler);

              // List of duplicate contacts to merge (identifiers)
              var list = [];
              var ids = data.data;
              Object.keys(ids).forEach(id => {
                list.push(results[id]);
              });

              // Cache pontential events based on the contacts with a
              // matching.
              var events = [];
              for (var i = 0; i < list.length; i++) {
                events.push(
                  {
                    contactID: list[i].matchingContact.id,
                    reason: 'merged'
                  }
                );
              }

              listenContactChanges(events);
              window.addEventListener(
                'contacts-merged',
                function() {
                  close();
                }
              );
              doMerge(contact, list, function finished() {
                window.postMessage({
                  type: 'duplicate_contacts_merged',
                  data: ids
                }, CONTACTS_APP_ORIGIN);
              });

            break;

            case 'ready':
              // TODO Use if needed
              break;

            case 'window_close':
              // If user igonores duplicate contacts we save the contact
              window.removeEventListener('message', mergeHandler);
              doSave(contact, true);
              break;
          }
        };

        window.addEventListener('message', mergeHandler);
      },
      onmismatch: function() {
        // Saving because there aren't duplicate contacts
        doSave(contact);
      }
    };
  }

  function doRemove(contact) {
    listenContactChanges().then(function() {
      if (_comesFromActivity) {
        window.close();
      } else {
        window.history.go(-2);
      }
    });
    ContactsService.remove(contact, function(error) {
      // Use if needed.
    });
  }

  /*
   * This function will wait until listen any change in contacts
   * DB, and if the change happens will send back the list of events
   * (created, removed, merged...) to the UI in order to update it
   * consequently.
   * 'events' represents the set of contacts that can be potentially
   * removed due to a merge in the process of saving a new contact.
   * If this happens, will affect to the UI.
   */
  function listenContactChanges(events) {
    return new Promise(function(resolve, reject) {
      ContactsService.addListener('contactchange',
        function oncontactchange(event) {
          ContactsService.removeListener('contactchange', oncontactchange);

          var eventToSave = {
            contactID: event.contactID,
            reason: event.reason
          };
          
          if (!events) {
            events = [];
          }
          events.unshift(eventToSave);
          sessionStorage.setItem('contactChanges', JSON.stringify(events));
          resolve();
        }
      );
    });
  }

  function doSave(contact) {
    listenContactChanges().then(close);
    ContactsService.save(contact, function(error) {
      // Use if needed.
    });
  }

  exports.FormController = {
    init: function() {

      _ = navigator.mozL10n.get;
      window.addEventListener('close-ui', function() {
        close();
      });


      function saveContactHandler(event) {
        var contact;
        var preContact = event.detail;
        if (_contact) {
          var readOnly = ['id', 'updated', 'published'];
          for (var field in _contact) {
            if (readOnly.indexOf(field) == -1) {
              _contact[field] = preContact[field];
            }
          }

          contact = _contact;
        } else {
          contact = utils.misc.toMozContact(preContact);
        }
        LazyLoader.load(
          [
            '/contacts/style/match_service.css',
            '/contacts/js/match_service.js'
          ],
          function() {
            var callbacks = cookMatchingCallbacks(contact);
            doMatch(contact, callbacks);
          }
        );
      }
      
      window.addEventListener(
        'save-contact',
        saveContactHandler
      );

      window.addEventListener(
        'delete-contact',
        function() {
          doRemove(_contact);
        }
      );
    },
    setActivity: function(activity) {
      _activity = activity;
    },
    setContact: function(contact) {
      _contact = contact;
    },
    set comesFromActivity(value) {
      _comesFromActivity = value;
    }
  };
}(window));
