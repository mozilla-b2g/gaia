'use strict';

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

    // Base query to search for contacts
    var SEARCH_QUERY = ['SELECT uid, name, email from user ',
    ' WHERE uid IN (SELECT uid1 FROM friend WHERE uid2=me() ORDER BY rank) ',
    ' AND (', null, ')', ' ORDER BY name'
    ];

    // Conditions
    var MAIL_COND = ['strpos(email, ' , "'", null, "'", ') >= 0'];
    var CELL_COND = ['strpos(cell, ' , "'", null, "'", ') >= 0'];
    var NAME_COND = ['strpos(lower(name), ' , "'", null,
                                                              "'", ') >= 0'];

    // Conditions over first name and last name (second query)
    var FIRST_NAME_COND = ['strpos(lower(first_name), ' , "'", null,
                                                              "'", ') >= 0'];
    var LAST_NAME_COND = ['strpos(lower(last_name), ' , "'", null,
                                                              "'", ') >= 0'];

    var ALL_QUERY = ['SELECT uid, name, email from user ',
    ' WHERE uid IN (SELECT uid1 FROM friend WHERE uid2=me()) ',
    ' ORDER BY name'];

    var friendsList;
    var viewButton = document.querySelector('#view-all');

    var currentRecommendation = null;
    var allFriends = null;

    // Builds the first query for finding a contact to be linked to
    function buildQuery(contact) {
      var filter = [];

      if (contact.name && contact.name.length > 0 &&
                                      contact.name[0].length > 0) {
        // First the name condition is put there
        NAME_COND[2] = contact.name[0].toLowerCase();
      }
      else {
         // The condition will be false by definition
        NAME_COND[2] = 'A';
      }

      filter.push(NAME_COND.join(''));

      if (contact.tel && contact.tel.length > 0) {
        contact.tel.forEach(function(tel) {
          filter.push(' OR ');
          CELL_COND[2] = tel.value;
          filter.push(CELL_COND.join(''));
        });
      }

      if (contact.email && contact.email.length > 0) {
        contact.email.forEach(function(email) {
          filter.push(' OR ');
          MAIL_COND[2] = email.value;
          filter.push(MAIL_COND.join(''));
        });
      }

      SEARCH_QUERY[3] = filter.join('');

      return SEARCH_QUERY.join('');
    }

    // Builds the second query (name-based) for findinding a linking contact
    function buildQueryNames(contact) {
      var filter = [];

      if (contact.givenName && contact.givenName.length > 0 &&
                               contact.givenName[0].length > 0) {
        // First the name condition is put there
        FIRST_NAME_COND[2] = contact.givenName[0].toLowerCase();
      }
      else {
         // The condition will be false by definition
        FIRST_NAME_COND[2] = 'A';
      }

      filter.push(FIRST_NAME_COND.join(''));
      filter.push(' OR ');

      if (contact.familyName && contact.familyName.length > 0 &&
                                contact.familyName[0].length > 0) {
        // First the name condition is put there
        LAST_NAME_COND[2] = contact.familyName[0].toLowerCase();
      }
      else {
         // The condition will be false by definition
        LAST_NAME_COND[2] = 'A';
      }

      filter.push(LAST_NAME_COND.join(''));

      SEARCH_QUERY[3] = filter.join('');

      var out = SEARCH_QUERY.join('');

      return out;
    }


    // entry point for obtaining a remote proposal
    link.getRemoteProposal = function(acc_t, contid) {
      access_token = acc_t;

      var cid = contid || contactid;

      var req = fb.utils.getContactData(cid);

      req.onsuccess = function() {
        if (req.result) {
          cdata = req.result;
          numQueries = 1;
          currentRecommendation = null;
          doGetRemoteProposal(access_token, cdata, buildQuery(cdata));
        }
        else {
          throw ('FB: Contact to be linked not found' + contactId);
        }
      }
      req.onerror = function() {
        throw ('FB: Error while retrieving contact data');
      }
    }

    function getRemoteProposalByNames(access_token, contact) {
      numQueries++;
      doGetRemoteProposal(access_token, cdata, buildQueryNames(contact));
    }

    // Performs all the work to obtain the remote proposal
    function doGetRemoteProposal(access_token, contactData, query) {
      document.body.dataset.state = 'waiting';

      /*
        Phone.lookup was analysed but we were not happy about how it worked

        var searchService = 'https://api.facebook.com/method/phonebook.lookup' +
                                                      '?include_non_fb=false';
      var entries = [];
      entries.push(getEntry(contactData));
      var sentries = JSON.stringify(entries);

      */

      fb.utils.runQuery(query, {
        success: fb.link.proposalReady,
        error: fb.link.errorHandler,
        timeout: fb.link.timeoutHandler
      }, access_token);
    }


    function getRemoteAll() {
      document.body.dataset.state = 'waiting';

      fb.utils.runQuery(ALL_QUERY.join(''), {
        success: fb.link.friendsReady,
        error: fb.link.errorHandler,
        timeout: fb.link.timeoutHandler
      }, access_token);
    }

    // When the access_token is available it is executed
    function tokenReady(at) {
      access_token = at;
      link.getRemoteProposal(at, contactid);
    }

    // Obtains a linking proposal to be shown to the user
    link.getProposal = function(cid) {
      contactid = cid;

      fb.oauth.getAccessToken(tokenReady, 'proposal');
    }

    // Executed when the server response is available
    link.proposalReady = function(response) {
      var inError = false;

      if (typeof response.error !== 'undefined') {
        inError = true;
        window.console.log('FB: Error while retrieving link data',
                                  response.error.code, response.error.message);
      }

      if ((inError || response.data.length === 0) && numQueries <= 1) {
        getRemoteProposalByNames(access_token, cdata);
      }
      else {
        var data = response.data;
        currentRecommendation = data;

        data.forEach(function(item) {
          if (!item.email) {
            item.email = '';
          }
        });

        utils.templates.append('#friends-list', data);

        document.body.dataset.state = 'selection';
      }

      // Guarantee that the user always return to a known state
      if (numQueries > 1) {
        document.body.dataset.state = 'selection';
      }
    }

    link.timeoutHandler = function() {
       // TODO: figure out with UX what to do in that case
      window.alert('Timeout!!');
      document.body.dataset.state = 'selection';
    }

    link.errorHandler = function() {
       // TODO: figure out with UX what to do in that case
      window.alert('Error!!');
      document.body.dataset.state = 'selection';
    }

    /**
     *   Clears the list of contacts
     *
     */
    function clearList() {
      if (!friendsList) {
        friendsList = document.querySelector('#friends-list');
      }
      var template = friendsList.querySelector('[data-template]');

      friendsList.innerHTML = '';
      friendsList.appendChild(template);
    }


    link.friendsReady = function(response) {
      if (typeof response.error === 'undefined') {
        viewButton.textContent = 'View Only Recommended';
        viewButton.onclick = UI.viewRecommended;

        allFriends = response;

        fb.utils.setCachedNumFriends(response.data.length);

        response.data.forEach(function(item) {
            if (!item.email) {
              item.email = '';
            }
        });

        clearList();

        utils.templates.append(friendsList, response.data);
      }
      else {
        window.console.error('FB: Error while retrieving friends',
                              response.error.code, response.error.message);
      }

      document.body.dataset.state = 'selection';
    }


    UI.selected = function(event) {
      var element = event.target;
      var friendUid = element.dataset.uuid;

      // First it is needed to check whether is an already imported friend
      var req = fb.contacts.get(friendUid);
      req.onsuccess = function() {
        if (req.result) {
          notifyParent({
            uid: friendUid
          });
        }
        else {
          var importReq = fb.importer.importFriend(friendUid, access_token);
          document.body.dataset.state = 'waiting';

          importReq.onsuccess = function() {
            document.body.dataset.state = 'selection';
            notifyParent(importReq.result);
          }

          importReq.onerror = function() {
            window.console.error('FB: Error while importing friend data');
            document.body.dataset.state = 'selection';
          }
        }
      }
      req.onerror = function() {
        window.console.error('FB: Error while importing friend data');
      }
    }

    UI.end = function(event) {
      var msg = {
        type: 'window_close',
        data: ''
      };

      parent.postMessage(msg, fb.CONTACTS_APP_ORIGIN);
    }

    function notifyParent(data) {
      var msg = {
        type: 'item_selected',
        data: data
      };

      parent.postMessage(msg, fb.CONTACTS_APP_ORIGIN);

      // Uncomment this to make this work in B2G-Desktop
      // parent.postMessage(msg, '*');
    }

    UI.viewAllFriends = function(event) {
      if (!allFriends) {
        getRemoteAll();
      }
      else {
        link.friendsReady(allFriends);
      }
    }

    UI.viewRecommended = function(event) {
      // event.target === viewButton
      event.target.onclick = UI.viewAllFriends;
      event.target.textContent = 'View All Facebook Friends';

      clearList();
      utils.templates.append(friendsList, currentRecommendation);
    }

  })(document);
}
