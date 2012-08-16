var fb = window.fb || {};

if(!fb.link) {
  (function(document) {
    var link = fb.link = {};
    var UI = link.ui = {};

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
    ' WHERE uid IN (SELECT uid1 FROM friend WHERE uid2=me()) ',
    ' AND (', null, ')',' ORDER BY name'
    ];

    // Conditions
    var MAIL_COND = ['strpos(email, ' , "'", null , "'", ') >= 0'];
    var CELL_COND = ['strpos(cell, ' , "'", null , "'", ') >= 0'];
    var NAME_COND = ['strpos(lower(name), ' , "'", null ,
                                                              "'", ') >= 0'];

    // Conditions over first name and last name (second query)
    var FIRST_NAME_COND = ['strpos(lower(first_name), ' , "'", null ,
                                                              "'", ') >= 0'];
    var LAST_NAME_COND = ['strpos(lower(last_name), ' , "'", null ,
                                                              "'", ') >= 0'];

    var ALL_QUERY = ['SELECT uid, name, email from user ',
    ' WHERE uid IN (SELECT uid1 FROM friend WHERE uid2=me()) ',
    ' ORDER BY name'];

    var friendsList = document.querySelector('#friends-list');

    // Builds the first query for finding a contact to be linked to
    function buildQuery(contact) {
      var filter = [];

      if(contact.name && contact.name.length > 0
                              && contact.name[0].length > 0) {
        // First the name condition is put there
        NAME_COND[2] = contact.name[0].toLowerCase();
      }
      else {
         // The condition will be false by definition
        NAME_COND[2] = 'A';
      }

      filter.push(NAME_COND.join(''));

      if(contact.tel && contact.tel.length > 0) {
        contact.tel.forEach(function(tel) {
          filter.push(' OR ');
          CELL_COND[2] = tel.number;
          filter.push(CELL_COND.join(''));
        });
      }

      if(contact.email && contact.email.length > 0) {
        contact.email.forEach(function(email) {
          filter.push(' OR ');
          MAIL_COND[2] = email.address;
          filter.push(MAIL_COND.join(''));
        });
      }

      SEARCH_QUERY[3] = filter.join('');

      var out = SEARCH_QUERY.join('');

      window.console.log('OWDError: Query',out);

      return out;
    }

    // Builds the second query (name-based) for findinding a linking contact
    function buildQueryNames(contact) {
      var filter = [];

      if(contact.givenName && contact.givenName.length > 0
                              && contact.givenName[0].length > 0) {
        // First the name condition is put there
        FIRST_NAME_COND[2] = contact.givenName[0].toLowerCase();
      }
      else {
         // The condition will be false by definition
        FIRST_NAME_COND[2] = 'A';
      }

      filter.push(FIRST_NAME_COND.join(''));
      filter.push(' OR ');

      if(contact.familyName && contact.familyName.length > 0
                              && contact.familyName[0].length > 0) {
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

      window.console.log('OWDError: Query2', out);

      return out;
    }


    // entry point for obtaining a remote proposal
    link.getRemoteProposal = function (access_token,cid) {
      var req = fb.utils.getContactData(cid);

      req.onsuccess = function() {
        window.console.log('OWDError: onsuccess called')
        if(req.result) {
          cdata = req.result;
          window.console.log('OWDError: Contact data', cdata.id);
          numQueries = 1;
          doGetRemoteProposal(access_token, cdata,buildQuery(cdata));
        }
        else {
          throw('FB: Contact to be linked not found' + contactId);
        }
      }
      req.onerror = function() {
        throw('FB: Error while retrieving contact data');
      }
    }

    function getRemoteProposalByNames(access_token, contact) {
      window.console.log('OWDError: Get Remote proposal by names');

      numQueries++;
      doGetRemoteProposal(access_token, cdata, buildQueryNames(contact));
    }

    // Performs all the work to obtain the remote proposal
    function doGetRemoteProposal(access_token,contactData,query) {
      document.body.dataset.state = 'waiting';

      /* var searchService = 'https://api.facebook.com/method/phonebook.lookup' +
                                                      '?include_non_fb=false';
      var entries = [];
      entries.push(getEntry(contactData));
      var sentries = JSON.stringify(entries);
      */

      var searchService = 'https://graph.facebook.com/fql?q=';
      searchService += encodeURIComponent(query);

      var params = [fb.ACC_T + '=' + access_token,
                    'format=json','callback=fb.link.proposalReady'];

      var queryParams = params.join('&');

      var jsonp = document.createElement('script');
      jsonp.src = searchService + '&' + queryParams;
      window.console.log('OWDError:',jsonp.src);

      document.body.appendChild(jsonp);
    }

    // Obtains a proposal from the already imported contact list
    function getLocalProposal(contact) {
      var fields = ['givenName','familyName','email','tel'];

      var filterCandidates = {
        filterBy: ['category'],
        filterValue: [fb.NOT_LINKED],
        filterOp: 'contains'
      };

      // fields.forEach()
    }


    function getRemoteAll() {
      document.body.dataset.state = 'waiting';

      var friendsService = 'https://graph.facebook.com/fql?q=';
      friendsService += encodeURIComponent(ALL_QUERY.join(''));

      var params = [fb.ACC_T + '=' + access_token,
                    'format=json','callback=fb.link.friendsReady'];

      var queryParams = params.join('&');

      var jsonp = document.createElement('script');
      jsonp.src = friendsService + '&' + queryParams;
      window.console.log('OWDError:',jsonp.src);

      document.body.appendChild(jsonp);
    }

    // When the access_token is available it is executed
    function tokenReady(at) {
      access_token = at;
      link.getRemoteProposal(at,contactid);
    }

    // Obtains a linking proposal to be shown to the user
    link.getProposal = function (cid) {
      contactid = cid;
      window.console.log('OWDError: Get Proposal called!!');
      fb.oauth.getAccessToken(tokenReady,'proposal');
    }

    // Executed when the jsonp response is available
    link.proposalReady = function (data) {
      window.console.log('OWDError: Data',JSON.stringify(data),numQueries,data.data.length);

      if(data.data.length === 0 && numQueries <= 1) {
        window.console.log('OWDError: ', 'No data');

        getRemoteProposalByNames(access_token,cdata);
      }
      else {
        data.data.forEach(function(item) {
          if(!item.email) {
            item.email = '';
          }
        });

        utils.templates.append('#friends-list',data.data);
      }

      document.body.dataset.state = 'selection';
    }

    /**
     *   Clears the list of contacts
     *
     */
    function clearList() {
      var template = friendsList.querySelector('[data-template]');

      friendsList.innerHTML = '';
      friendsList.appendChild(template);
    }


    link.friendsReady = function (data) {
      data.data.forEach(function(item) {
          if(!item.email) {
            item.email = '';
          }
      });

      clearList();

      utils.templates.append(friendsList,data.data);

      document.body.dataset.state = 'selection';
    }


    UI.selected = function(event) {
      var element = event.target;
      window.console.log('OWDError: ',element.dataset.uuid);
      var msg = {};
      msg.type = 'item_selected';
      msg.data = element.dataset.uuid;

      parent.postMessage(msg,'*');
    }

    UI.viewAllFriends = function(event) {
      getRemoteAll();
    }

  })(document);
}
