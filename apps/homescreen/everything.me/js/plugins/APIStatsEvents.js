'use strict';

/*
 * APIStatsEvents class
 */
Evme.APIStatsEvents = function Evme_APIStatsEvents(Sandbox) {
  var self = this, config, processedItems, tracker = Sandbox.DoATAPI,
    tempEventArr = [], templatesStr = '',
    templates = {
      'Results_search': {
        'userEvent': 'pageView',
        'page': 'searchResults',
        'query': '{query}',
        'type': '{type}',
        'feature': '{feature}',
        'src': '{source}'
      },
      'DoATAPI_loadmore': {
        'userEvent': 'loadMore'
      },
      'Core_redirectedToApp': {
        'userEvent': 'appClick',
        'url': '{url}',
        'rowIdx': '{rowIndex}',
        'totalRows': '{totalRows}',
        'colIdx': '{colIndex}',
        'totalCols': '{totalCols}',
        'keyboardVisible': '{keyboardVisible}',
        'more': '{more}',
        'appName': '{appName}',
        'appId': '{appId}',
        'appType': '{appType}',
        'query': '{query}',
        'feature': '{source}'
      },
      'Result_addToHomeScreen': {
        'userEvent': 'addToHomeScreen',
        'appName': '{name}',
        'appId': '{id}'
      }
    };

  this.name = 'APIStatsEvents';

  this.init = function init(_config) {
    // set config
    config = _config;

    // add common params
    for (var k in templates) {
      templates[k]['sessionId'] = '{sid}';
      templates[k]['elapsed'] = '{elapsed}';
      templates[k]['deviceId'] = Evme.DoATAPI.getDeviceId();
    }

    // stringify templates
    templatesStr = stringify(templates);
  };

  function stringify(old) {
    var temp = {};

  for (var key in old) {
      var value = old[key];
        value = JSON.stringify(value);
      temp[key] = value;
    }

    return temp;
  }

  // actual report
  this.dispatch = function dispatch(items) {
    // leave if no items
    if (!items.length) { return false;}

    // process
    items = process(items);

    // report
    items.length && tracker.report({
      'data': '[' + items.toString() + ']'
    });
  };

  function process(items) {
    processedItems = [];

    // make into an array if not
    if (!(items instanceof Array)) {
      items = [items];
    }

    // process
    items.forEach(function itemIteration(item) {

      // authenticate
      if (authenticate(item)) {

        // render template
        var template = templatesStr[item['class'] + '_' + item['event']],
          data = renderTemplate(template, item['data']);

        data && processedItems.push(data);
      }
    });

    return processedItems;
  }

  function authenticate(item) {
    var method = item['class'] + '_' + item['event'];
    return method in templates;
  }

  // template rendering
  function renderTemplate(str, attrArr) {
    if (str && attrArr) {
      for (var key in attrArr) {
        str = str.replace('{' + key + '}', attrArr[key]);
      }
    }
    return str;
  }
};
