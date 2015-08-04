/* global ParamUtils, ContactsService, utils, LazyLoader,
ContactToVcardBlob, VcardFilename, ConfirmDialog, ActionMenu */

(function(exports) {
  'use strict';
  var _activity, _actionMenu;

  /**
   * Per RFC 6350, text/vcard is the canonical MIME media type for vCards, but
   * there are also deprecated types as well.  Whenever we disambiguate what an
   * activity is requesting based on its MIME media type, we need to check if it
   * is any of these, and not just text/vcard.
   */
  const VCARD_MIME_TYPES = [
    'text/vcard',
    'text/x-vcard',
    'text/directory'
  ];

  function update(evt) {
    var optionalParams;
    var params = _activity.source.data.params;

    if (!_activity) {
      return;
    }

    if (params.tel) {
      optionalParams = {
        action: 'update',
        contact: evt.detail.uuid,
        isActivity: true,
        tel: params.tel
      };
    }

    if (params.email) {
      optionalParams = {
        action: 'update',
        contact: evt.detail.uuid,
        isActivity: true,
        email: params.email
      };
    }
    window.location.href = ParamUtils.generateUrl(
      'form',
      optionalParams
    );
  }

  function pick(evt) {
    ContactsService.get(evt.detail.uuid, function onSuccess(savedContact) {
      doPick(savedContact);
    }, function onError() {
      console.error('Error retrieving contact');
    });
  }

  function onItemClick(evt) {
    if (evt.detail && evt.detail.uuid) {
      clickHandler(evt.detail.uuid);
    }
  }

  function clickHandler(uuid) {
    window.location.href = ParamUtils.generateUrl('detail', {contact: uuid});
  }

  function doPick(theContact) {
    var type, dataSet, noDataStr;
    var result = {};

    // Keeping compatibility with previous implementation. If
    // we want to get the full contact, just pass the parameter
    // 'fullContact' equal true.
    if (_activity.source.data.type === 'webcontacts/contact' &&
        _activity.source.data.fullContact === true) {
      result = utils.misc.toMozContact(theContact);
      postPickSuccess(result);
      return;
    }

    // Was this a request for vCard export as a blob?  Check all supported MIME
    // types.
    var isVcardDataType = VCARD_MIME_TYPES.some((mime) => {
      return _activity.source.data.type.indexOf(mime) !== -1;
    });

    if (isVcardDataType) {
      // Normalize the type to text/vcard so other places that check MIME types
      // (ex: the Facebook guards) experience a consistent MIME type.
      _activity.source.data.type = 'text/vcard';
      LazyLoader.load([
                       '/shared/js/text_normalizer.js',
                       '/shared/js/contact2vcard.js',
                       '/shared/js/setImmediate.js'
                      ], function lvcard() {
        ContactToVcardBlob([theContact], function blobReady(vcardBlob) {
          VcardFilename(theContact).then(filename => {
            postPickSuccess({
              name: filename,
              blob: vcardBlob
            });
          });
        }, {
          // Some MMS gateways prefer this MIME type for vcards
          type: 'text/x-vcard'
        });
      });
      return;
    }

    switch (_activity.source.data.type) {
      case 'webcontacts/tel':
        type = 'contact';
        dataSet = theContact.tel;
        noDataStr = 'no_contact_phones';
        break;
      case 'webcontacts/contact':
        type = 'number';
        dataSet = theContact.tel;
        noDataStr = 'no_contact_phones';
        break;
      case 'webcontacts/email':
        type = 'email';
        dataSet = theContact.email;
        noDataStr = 'no_contact_email';
        break;
      case 'webcontacts/select':
        type = 'select';
        var data = [];
        if (_activity.source.data.contactProperties.indexOf('tel') !== -1) {
          if (theContact.tel && theContact.tel.length) {
            data = data.concat(theContact.tel);
          }
        }
        if (_activity.source.data.contactProperties.indexOf('email') !== -1) {
          if (theContact.email && theContact.email.length) {
            data = data.concat(theContact.email);
          }
        }

        dataSet = data;
        noDataStr = 'no_contact_data';
        break;
    }
    var hasData = dataSet && dataSet.length;
    var numOfData = hasData ? dataSet.length : 0;


    result.name = theContact.name;
    switch (numOfData) {
      case 0:
        LazyLoader.load(['/shared/js/confirm.js',
          document.getElementById('confirmation-message')], function() {
          // If no required type of data
          var dismiss = {
            title: 'ok',
            callback: function() {
              ConfirmDialog.hide();
            }
          };
          ConfirmDialog.show(null, noDataStr, dismiss);
        });
        break;
      case 1:
        // if one required type of data
        if (_activity.source.data.type == 'webcontacts/tel' ||
            _activity.source.data.type == 'webcontacts/select') {
          result = pickContactsResult(theContact);
        } else {
          result[type] = dataSet[0].value;
        }

        postPickSuccess(result);
        break;
      default:
        // if more than one required type of data
        LazyLoader.load('/contacts/js/action_menu.js', function() {
          if (!_actionMenu) {
            _actionMenu = new ActionMenu();
          } else {
            // To be sure that the action menu is empty
            _actionMenu.hide();
          }

          var itemData;
          var capture = function(itemData) {
            return function() {
              if (_activity.source.data.type == 'webcontacts/tel' ||
                  _activity.source.data.type == 'webcontacts/select') {
                result = pickContactsResult(theContact, itemData);
              } else {
                result[type] = itemData;
              }
              _actionMenu.hide();
              postPickSuccess(result);
            };
          };
          for (var i = 0, l = dataSet.length; i < l; i++) {
            itemData = dataSet[i].value;
            var carrier = dataSet[i].carrier || '';
            _actionMenu.addToList(
              {
                id: 'pick_destination',
                args: {destination: itemData, carrier: carrier}
              },
              capture(itemData)
            );
          }
          _actionMenu.show();
        });
    } // switch
  }

  function pickContactsResult(theContact, itemData) {
    var pickResult = {};
    var contact = utils.misc.toMozContact(theContact);

    if (_activity.source.data.type == 'webcontacts/tel') {
      pickResult = contact;

      if (itemData) {
        pickResult.tel = filterDestinationForActivity(
                            itemData, pickResult.tel);
      }
    } else if (_activity.source.data.type == 'webcontacts/select') {
      pickResult.contact = contact;

      if (!itemData) {
        pickResult.select = pickResult.contact.tel;

        if (!pickResult.select || !pickResult.select.length) {
          pickResult.select = pickResult.contact.email;
        }
      } else {
        pickResult.select = filterDestinationForActivity(
                                itemData, pickResult.contact.tel);

        if (!pickResult.select || !pickResult.select.length) {
          pickResult.select = filterDestinationForActivity(
                                  itemData, pickResult.contact.email);
        }
      }
    }

    return pickResult;
  }

  function filterDestinationForActivity(itemData, dataSet) {
    return dataSet.filter(function isSamePhone(item) {
      return item.value == itemData;
    });
  }

  function postPickSuccess(result) {
    _activity.postResult(result);
  }

  exports.ListController = {
    'init': function init() {
      window.addEventListener('itemClicked', onItemClick);
      window.addEventListener('pickAction', pick);
      window.addEventListener('updateAction', update);
    },
    'setActivity': function setActivity(activity) {
      _activity = activity;
    }
  };
})(window);
