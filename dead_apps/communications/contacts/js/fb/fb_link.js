'use strict';

/* global Curtain, FacebookConnector, ImageLoader, Normalizer, utils,
   ImportStatusData, oauth2 */

var fb = window.fb || {};

if (!fb.link) {
  (function(document) {
    // parameter id for the linking contact
    var link = fb.link = {};
    var UI = link.ui = {};

    link.CID_PARAM = 'contactid';

    // Contact id that the user wants to be linked to
    var contactid;
    // The data of such a contact
    var cdata;

    // Access token
    var access_token;

    // Used to control the number of queries
    var numQueries = 0;

    // The uid of the friend to be linked
    var friendUidToLink;

    // Base query to search for contacts
    var SEARCH_QUERY = ['SELECT uid, name, email from user ',
    ' WHERE uid IN (SELECT uid1 FROM friend WHERE uid2=me()) ',
    ' AND (', null, ')', ' ORDER BY name'
    ];

    // Conditions
    var MAIL_COND, CELL_COND;
    /* jshint ignore:start */
    MAIL_COND = ['strpos(email, ' , "'", null, "'", ') >= 0'];
    CELL_COND = ['strpos(cell, ' , "'", null, "'", ') >= 0'];
    /* jshint ignore:end */

    var ALL_QUERY = ['SELECT uid, name, last_name, first_name,',
      ' middle_name, email from user ',
      ' WHERE uid IN (SELECT uid1 FROM friend WHERE uid2=me()) ',
      ' ORDER BY name'
    ];

    var COUNT_QUERY = 'SELECT uid FROM user WHERE uid IN ' +
                      '(SELECT uid1 FROM friend WHERE uid2=me())';

    var SEARCH_ACCENTS_FIELDS = {
      'last_name': 'familyName',
      'first_name': 'givenName',
      'middle_name': 'givenName'
    };

    var friendsList;
    var viewButton, mainSection;

    var currentRecommendation = null;
    var allFriends = null;
    // Enables cancelation
    var currentNetworkRequest = null;
    // State can be proposal or view All
    var state;
    var imgLoader;

    // Only needed for testing purposes
    var completedCb;

    function notifyParent(message) {
      parent.postMessage({
        type: message.type || '',
        data: message.data || ''
      }, fb.CONTACTS_APP_ORIGIN);
    }

    // Builds the first query for finding a contact to be linked to
    function buildQuery(contact) {
      var filter = [];

      if (contact.tel && contact.tel.length > 0) {
        contact.tel.forEach(function(tel) {
          CELL_COND[2] = tel.value.trim();
          filter.push(CELL_COND.join(''));
          filter.push(' OR ');
        });
      }

      if (contact.email && contact.email.length > 0) {
        contact.email.forEach(function(email) {
          MAIL_COND[2] = email.value.trim();
          filter.push(MAIL_COND.join(''));
          filter.push(' OR ');
        });
      }

      // Remove the last OR
      if (filter.length > 0) {
        filter[filter.length - 1] = null;
      }
      var filterStr = filter.join('');

      var out;
      if (filterStr) {
        SEARCH_QUERY[3] = filterStr;
        out = SEARCH_QUERY.join('');
      }
      else {
        out = null;
      }

      return out;
    }

    // entry point for obtaining a remote proposal
    link.getRemoteProposal = function(acc_tk, contid) {
      var cid = contid || contactid;

      var req = fb.utils.getContactData(cid);
      req.onsuccess = function() {
        if (req.result) {
          cdata = req.result;
          numQueries = 1;
          currentRecommendation = null;
          var query = buildQuery(cdata);
          // Check whether we have enough info for the first query
          // otherwise launch the getAll query
          if (query === null) {
            getRemoteProposalAll(acc_tk);
            return;
          }
          doGetRemoteProposal(acc_tk, cdata, query);
        }
        else {
          throw new Error(
                  'FB: Contact to be linked not found in mozContacts: ' + cid);
        }
      };
      req.onerror = function(e) {
        window.console.error('FB: Error while retrieving contact data: ', cid);
        throw e;
      };
    };

    function getRemoteProposalAll(acc_tk) {
      numQueries++;
      doGetRemoteProposal(acc_tk, null, ALL_QUERY.join(''), true);
    }

    // This function deals with the response for a proposal
    // It takes care whether a response with the number of friends is present
    // and updates the cache accordingly
    function proposalReadyMultiple(done, error, response) {
      // If there is an error we just pass it upstream
      if (response.error) {
        done(response);
        return;
      } else if (!Array.isArray(response.data)) {
        error({
          name: 'QueryResponseError'
        });
        return;
      }

      var friendList, totalFriends;
      if (response.data.length > 0 &&
          Array.isArray(response.data[0].fql_result_set)) {
        friendList = response.data[0].fql_result_set;
        if (response.data[1] &&
            Array.isArray(response.data[1].fql_result_set)) {
          totalFriends = response.data[1].fql_result_set.length;
        }
      }
      else {
        friendList = response.data;
        totalFriends = friendList.length;
      }

      if (typeof totalFriends !== 'undefined') {
        fb.utils.setCachedNumFriends(totalFriends);
      }

      done({
        data: friendList
      });
    }

    // Performs all the work to obtain the remote proposal
    // the "isAll" parameter indicates that the query will get all friends
    function doGetRemoteProposal(acc_tk, contactData, query, isAll) {
      /*
        Phone.lookup was analysed but we were not happy about how it worked

        var searchService = 'https://api.facebook.com/method/phonebook.lookup' +
                                                      '?include_non_fb=false';
      var entries = [];
      entries.push(getEntry(contactData));
      var sentries = JSON.stringify(entries);

      */
      var theQuery = query;
      var callback = proposalReadyMultiple.bind(null, fb.link.proposalReady,
                                              fb.link.errorHandler);
      // If the query is not going to provide a full list of friends
      // We count all in order to refresh the total number of friends
      if (!isAll) {
        theQuery = JSON.stringify({
          query1: query,
          query2: COUNT_QUERY
        });
      }

      state = 'proposal';
      currentNetworkRequest = fb.utils.runQuery(theQuery, {
        success: callback,
        error: fb.link.errorHandler,
        timeout: fb.link.timeoutHandler
      }, acc_tk);
    }

    // Invoked when remoteAll is canceled
    function cancelCb(shouldNotifyParent) {
      if (currentNetworkRequest) {
        currentNetworkRequest.cancel();
        currentNetworkRequest = null;
      }

      Curtain.hide(shouldNotifyParent ? notifyParent.bind(
        null, {type: 'abort'}) : null);
    }

    // Obtains a proposal with all friends
    function getRemoteAll() {
      Curtain.oncancel = cancelCb;
      Curtain.show('wait', 'friends');

      state = 'friends';

      currentNetworkRequest = fb.utils.runQuery(ALL_QUERY.join(''), {
        success: fb.link.friendsReady,
        error: fb.link.errorHandler,
        timeout: fb.link.timeoutHandler
      }, access_token);
    }

    // Obtains a linking proposal to be shown to the user
    link.getProposal = function(cid, acc_tk) {
      link.getRemoteProposal(acc_tk, cid);
    };

    // Executed when the server response is available
    link.proposalReady = function(response) {
      if (typeof response.error !== 'undefined') {
        window.console.error('FB: Error while retrieving link data',
                                  response.error.code, response.error.message);

        if (response.error.code != 190) {
          setCurtainHandlersErrorProposal();
          Curtain.show('error', 'proposal');
        }
        else {
          // access token problem. A new OAuth 2.0 flow has to start
          handleTokenError();
        }

        return;
      }

      if (response.data.length === 0 && numQueries === 1) {
        getRemoteProposalAll(access_token);
      }
      else {
        var data = response.data;
        currentRecommendation = data;

        var sortedByName = [];
        var numFriendsProposed = data.length;
        var searchAccentsArrays = {};
        var index = 0;

        data.forEach(function(item) {
          if (!item.email) {
            item.email = '';
          }
          var box = utils.misc.getPreferredPictureBox();
          item.picwidth = box.width;
          item.picheight = box.height;

          // Only do this if we need to prepare the search accents phase
          if (numQueries === 2) {
            // Saving the original order
            sortedByName.push(item);
            // Populate the arrays for doing the accents related search
            Object.keys(SEARCH_ACCENTS_FIELDS).forEach(function(field) {
              searchAccentsArrays[field] = searchAccentsArrays[field] || [];
              if (item[field]) {
                // The different words for each item
                var words = item[field].split(/[ ]+/);
                // The whole word itself is added
                words.push(item[field]);
                words.forEach(function(word) {
                  var obj = {
                    originalIndex: index
                  };
                  obj[field] = Normalizer.toAscii(word).toLowerCase();
                  searchAccentsArrays[field].push(obj);
                });
              }
            });
            index++;
          }
        });

        if (numQueries === 2) {
          var accentsProposal = searchAccents(searchAccentsArrays, cdata);
          if (accentsProposal.length === 0) {
            data = sortedByName;
            mainSection.classList.add('no-proposal');
            numFriendsProposed = 0;
          }
          else {
            currentRecommendation = [];
            accentsProposal.forEach(function(proposalIndex) {
              currentRecommendation.push(sortedByName[proposalIndex]);
            });
            numFriendsProposed = currentRecommendation.length;
          }
        } else {
          viewButton.setAttribute('data-l10n-id', 'viewAll');
          viewButton.onclick = UI.viewAllFriends;
        }

        utils.templates.append('#friends-list', currentRecommendation);
        imgLoader.reload();

        if (typeof completedCb === 'function') {
          completedCb();
        }

        Curtain.hide(function onCurtainHide() {
          sendReadyEvent();
          window.addEventListener('message', function linkOnViewPort(e) {
            if (e.origin !== fb.CONTACTS_APP_ORIGIN) {
              return;
            }
            var data = e.data;
            if (data && data.type === 'dom_transition_end') {
              window.removeEventListener('message', linkOnViewPort);
              utils.status.show({
                id: 'linkProposal',
                args: {
                  numFriends: numFriendsProposed
                }
              });
            }
          });
        });
      }
    };


    // This function needs to be called because link proposals through FB Query
    //  do not work properly with words with special characters (bug 796714)
    function searchAccents(searchArrays, contactData) {
      var out = [];
      var searchFields = Object.keys(SEARCH_ACCENTS_FIELDS);

      function compareItems(target, item) {
        var out;

        if (typeof target === 'string') {
          out = target.localeCompare(item);
          if (out !== 0) {
            if (item.indexOf(target) === 0) {
              out = 0;
            }
          }
        }

        return out;
      } // compareItems Function

      searchFields.forEach(function(searchField) {
        // The array is ordered according to the search field
        // this enables an efficient binary search
        var searchArray = searchArrays[searchField].sort(function(a, b) {
          return a[searchField].localeCompare(b[searchField]);
        });

        var fieldToSearch = contactData[SEARCH_ACCENTS_FIELDS[searchField]];
        if (fieldToSearch && fieldToSearch[0]) {
          // Splitting in the different words
          var dataToSearch = fieldToSearch[0].trim().split(/[ ]+/);

          dataToSearch.forEach(function(aData) {
            var targetString = Normalizer.toAscii(aData).toLowerCase();
            var searchResult = utils.binarySearch(targetString, searchArray, {
              arrayField: searchField,
              compareFunction: compareItems
            });

            searchResult.forEach(function(aResult) {
              var candidate = searchArray[aResult].originalIndex;
              // Avoiding to show two times the same result element
              if (out.indexOf(candidate) === -1) {
                out.push(candidate);
              }
            });
          });
        }
      });

      return out;
    }

    function sendReadyEvent() {
      parent.postMessage({
        type: 'ready', data: ''
      }, fb.CONTACTS_APP_ORIGIN);
    }

    function setCurtainHandlersErrorProposal() {
      Curtain.oncancel = function() {
        cancelCb(true);
      };

      Curtain.onretry = function getRemoteProposal() {
        Curtain.oncancel = function() {
          cancelCb(true);
        };
        Curtain.show('wait', state);

        link.getRemoteProposal(access_token, contactid);
      };
    }

    link.baseHandler = function(type) {
      if (state === 'friends') {
        Curtain.onretry = getRemoteAll;
        Curtain.oncancel = Curtain.hide;
      } else if (state === 'proposal') {
        setCurtainHandlersErrorProposal();
      }
      else if (state === 'linking') {
        Curtain.onretry = function retry_link() {
          Curtain.show('message', 'linking');
          UI.selected({
            target: {
              dataset: {
                uuid: friendUidToLink
              }
            }
          });
        };
        Curtain.oncancel = Curtain.hide;
      }

      Curtain.show(type, state);
    };

    link.timeoutHandler = function() {
      link.baseHandler('timeout');
    };

    link.errorHandler = function() {
      link.baseHandler('error');
    };

    /**
     *   Clears the list of contacts
     *
     */
    function clearList() {
      if (!friendsList) {
        friendsList = document.querySelector('#friends-list');
      }
      var template = friendsList.querySelector('[data-template]');

      utils.dom.removeChildNodes(friendsList);
      friendsList.appendChild(template);
    }

    link.friendsReady = function(response) {
      if (typeof response.error === 'undefined' && response.data) {
        viewButton.setAttribute('data-l10n-id', 'viewRecommend');
        viewButton.onclick = UI.viewRecommended;

        allFriends = response;

        fb.utils.setCachedNumFriends(response.data.length);

        response.data.forEach(function(item) {
            if (!item.email) {
              item.email = '';
            }
        });

        clearList();

        var fragment = document.createDocumentFragment();
        utils.templates.append(friendsList, response.data, fragment);
        friendsList.appendChild(fragment);

        imgLoader.reload();

        Curtain.hide();
      }
      else {
        window.console.error('FB: Error while retrieving friends',
                              response.error.code, response.error.message);

        if (response.error.code !== 190) {
          Curtain.onretry = getRemoteAll;
          Curtain.oncancel = Curtain.hide;
        }
        else {
          // Error with the access token. It is very unlikely that this happens
          Curtain.onretry = handleTokenError;
        }
        Curtain.show('error', 'friends');
      }
    };

    function setCurtainHandlers() {
      Curtain.oncancel = function curtain_cancel() {
        cancelCb(true);
      };
    }

    link.start = function(contactId, acc_tk, endCb) {
      // Only needed for testing purposes
      completedCb = endCb;

      access_token = acc_tk;
      contactid = contactId;

      setCurtainHandlers();
      clearList();
      imgLoader = new ImageLoader('#mainContent',
                                  'li:not([data-uuid="#uid#"])');

      if (!acc_tk) {
        oauth2.getAccessToken(function proposal_new_token(new_acc_tk) {
          access_token = new_acc_tk;
          link.getProposal(contactId, new_acc_tk);
        }, 'proposal', 'facebook');
      }
      else {
        link.getProposal(contactId, acc_tk);
      }
    };

    link.init = function() {
      mainSection = document.querySelector('#main');
      viewButton = document.querySelector('#view-all');
    };

    function retryOnErrorCb() {
      UI.selected({
        target: {
          dataset: {
            uuid: friendUidToLink
          }
        }
      });
    }

    function handleTokenError() {
      Curtain.hide(notifyParent.bind(null, {
        type: 'token_error'
      }));
      var cb = function() {
        allFriends = null;
        link.start(contactid);
      };
      ImportStatusData.remove(fb.utils.TOKEN_DATA_KEY).then(cb);
    }

    UI.selected = function(event) {
      Curtain.show('message', 'linking');

      var element = event.target.parentNode;
      friendUidToLink = element.dataset.uuid;

      // First it is needed to check whether is an already imported friend
      var req = fb.contacts.get(friendUidToLink);
      req.onsuccess = function() {
        if (req.result) {
          window.setTimeout(function delay() {
            Curtain.hide(notifyParent.bind(null, {
              type: 'item_selected',
              data: {
                uid: friendUidToLink
              }
            }));
          }, 1000);
        }
        else {
          state = 'linking';
          var callbacks = { };

          callbacks.success = function(data) {
            Curtain.hide(notifyParent.bind(null, {
              type: 'item_selected',
              data: data
            }));
          };

          callbacks.error = function(e) {
            var error = e.target.error;
            window.console.error('FB: Error while importing friend data ',
                                 JSON.stringify(error));
            Curtain.oncancel = Curtain.hide;
            if (error.code != 190) {
              Curtain.onretry = retryOnErrorCb;
            }
            else {
              Curtain.onretry = handleTokenError;
            }
            Curtain.show('error', 'linking');
          };

          callbacks.timeout = function() {
            link.baseHandler('timeout');
          };

          imgLoader.unload(); // Removing listeners
          FacebookConnector.importContact(friendUidToLink, access_token,
                                          callbacks, 'not_match');
        }
      };

      req.onerror = function() {
        window.console.error('FB: Error while importing friend data');
        Curtain.oncancel = Curtain.hide;
        Curtain.onretry = retryOnErrorCb;
        Curtain.show('error', 'linking');
      };
    };


    UI.end = function(event) {
      var msg = {
        type: 'window_close',
        data: ''
      };

      parent.postMessage(msg, fb.CONTACTS_APP_ORIGIN);
    };

    UI.viewAllFriends = function(event) {
      if (!allFriends) {
        getRemoteAll();
      }
      else {
        link.friendsReady(allFriends);
      }

      return false;
    };

    UI.viewRecommended = function(event) {
      // event.target === viewButton
      event.target.onclick = UI.viewAllFriends;
      event.target.setAttribute('data-l10n-id', 'viewAll');

      clearList();
      utils.templates.append(friendsList, currentRecommendation);
      imgLoader.reload();

      return false;
    };

  })(document);
}
