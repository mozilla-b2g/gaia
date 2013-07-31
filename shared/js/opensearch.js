var OpenSearchPlugins = (function OpenSearchPlugins() {

'use strict';

var defaults = {


 'Google': {
    'shortname': 'Google',
    'icon': 'data:image/x-icon;base64,AAABAAIAEBAAAAEAIABoBAAAJgAAACAgAAABACAAqBAAAI4EAAAoAAAAEAAAACAAAAABACAAAAAAAAAEAAASCwAAEgsAAAAAAAAAAAAA9IVCSvSFQuf0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hULk9IVCSvSFQub0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQuf0hUL/9IVC//SFQv/0hUL/9Y1O//rIq//+7+f//eXX//vUvf/7z7X/96Fu//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//vYwv/97OH/9ZRZ//SFQv/0hUL/9IhG//zbx//3om7/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/97uX/+buW//SFQv/0hUL/9IVC//SFQv/5upT/+9O6//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/+b6b//zezP/0iEf/9IVC//SFQv/1klf//ezh//vPtP/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/3qXr/+siq//m8lv/5wqD//vTu//3t4//1klb/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0h0b//vbx//zi0//1j1H/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/2nmn/+bmS/////v/4sIX/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/5uJH///v5//eoef/1jU//+82y//afav/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL//vXw//vOs//0hUL/9IVC//ekcf/96+D/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//728v/4sIX/9IVC//SFQv/4s4n///v4//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/6yKn/+byX//SFQv/0hkT//eTV//vWv//0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IZE//m6lP/5u5b//OHQ///+/f/6y6//96d3//SFQv/0hUL/9IVC//SFQv/0hULm9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hULm9IVCSfSFQub0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hULm9IVCSQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAIAAAAEAAAAABACAAAAAAAAAQAAASCwAAEgsAAAAAAAAAAAAA9IVCAPSFQif0hUKt9IVC8vSFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQvL0hUKt9IVCJ/SFQgD0hUIo9IVC7/SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hULv9IVCKPSFQq30hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUKt9IVC8fSFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQvP0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9YtL//i2jv/828f//vLr///7+P///Pv//vTu//3n2v/6zbH/96Nw//SFQ//0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//ekcv/+8+z////////////+9fD/+9K5//m9mf/4to7/+buV//vSuf/++PT//OPT//aYYP/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/2l13///r3/////////fv/+b2Z//SIRv/0hUL/9IVC//SFQv/0hUL/9IVC//WNT//84M///vXv//aZYf/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//vPtP////////////i0i//0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//WQUv///Pr//OPU//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL//eTV///////+9O7/9IVD//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//3m2P//////9ppi//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/718H///////3s4f/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL//vDn///////4soj/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//erff////////38//WTWP/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//iziv////////////iwhf/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//rMsP///////eXW//WSVv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/4sYb///z7/////////Pv/9ZFV//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//ixhv/+8Of//vn1//rMsP/4rH//9plh//WQUv/1j1L/+s2x//////////////////m9mf/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SGQ//2nmn/+buW//vNsv/82sb//e3j/////////////////////v/5wZ//9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/83Mj////////////++fb/+K+C//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9ZRZ/////////////vTt//aaYv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/1lFr////////////6xqf/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//ehbf/70bj//end//3o2////v3///////3l1//0iEb/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/5wqD////////////96t7/96Z2//WOUP/2nWf//NvH//zcyP/1i0z/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/96l6/////////////vLr//WPUf/0hUL/9IVC//SFQv/0h0b//end//3k1f/0iUn/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/8387////////////4sYf/9IVC//SFQv/0hUL/9IVC//SFQv/6w6L///////nBn//0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC///69////////vj1//SIR//0hUL/9IVC//SFQv/0hUL/9IVC//m+mv///////e3j//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL///r3///////8387/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/+syw///////++fb/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/95NX///////vUvP/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/97OH///////7y6//0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//i2jv///////N/O//SFQv/0hUL/9IVC//SFQv/0hUL/96Nx////////////+s2x//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IdF//zh0P//+/j/9ZJW//SFQv/0hUL/9IVC//SKSv/96t7///////738v/1k1f/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9YxN//vUvf/96+D/96Z0//WNT//3om///ebY/////////Pv/+LKI//WVW//0h0X/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//agbP/7zbL//enc//749P////////////////////////////3r4P/3p3f/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hULx9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC8/SFQq30hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUKt9IVCJ/SFQu/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC7/SFQif0hUIA9IVCJfSFQq30hULx9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC8fSFQq30hUIl9IVCAIAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAB',
    'description': 'Google opensearch plugin',
    'encoding': 'UTF-8',
    'url': {
      'type': 'text/html',
      'template': 'http://www.google.com/search?q={searchTerms}&hl=en'
    },

   'suggestions': {
      'type': 'application/x-suggestions+xml',
      'template': 'http://google.com/complete/search',
      'parameters': {
        'output': 'toolbar',
        'q': '{searchTerms}'
      }
    }
  },

  'Wikipedia': {
    'shortname': 'Wikipedia',
    'icon': 'data:image/x-icon;base64,AAABAAIAEBAAAAAAAAA4AQAAJgAAACAgAAAAAAAAJAMAAGQBAACJUE5HDQoaCgAAAA1JSERSAAAAEAAAABAIBgAAAB/z/2EAAAEFSURBVDjLxZPRDYJAEESJoQjpgBoM/9IBtoAl4KcUQQlSAjYgJWAH0gPmyNtkzEEuxkQTPzawc3Ozc3MQTc/JfVPR/wW6a+eKQ+Hyfe54B2wvrfXVqXLDfTCMd3j0VHksrTcH9bl2aZq+BCgEwCCPj9E4TdPYGj0C9CYAKdkmBrIIxiIYbvpbb2sSl8AiA+ywAbJE5YLpCImLU/WRDyIAWRgu4k1s4v50ODru4haYSCk4ntkuM0wcMAINXiPKTJQ9CfgB40phBr8DyFjGKkKEhYhCY4iCDgpAYAM2EZBlhJnsZxQUYBNkSkfBvjDd0ttPeR0mxREQ+OhfYOJ6EmL+l/qzn2kGli9cAF3BOfkAAAAASUVORK5CYIKJUE5HDQoaCgAAAA1JSERSAAAAIAAAACAIBgAAAHN6evQAAAIKSURBVFjD7ZdBSgNRDIYLguAB7FLwAkXwBl0JgiDYjQcY8ARduBJKu3I5C0EoWDxAT9AL9AK9QBeCIHQlCM/3DZOSmeZNZ2r1bQyEGV7yXv7kJZlJq6XIOXfs+crzwPPTnvnR863n05ZFufDD/T595Q4eauM37u/pWYwfeX53cegcABcuHg0AkEQE8AKAu4gAXv8BrAEMh0PXbrddt9t1vV4v406nk62laeqm02n2LjKYIuK5WCyyfeiLDF32yLn6TJ5mBFarlev3+9nBMMqsabkYhmezWcEd2ctTE/tYBwhgt14BhtmAV2VaLpdrAHioCW+VdwWy9IMAUBQjJcQFTwGqvcTD+Xy+oc8askZJyAYrnKEokCeWLpQkSSZvBIANYgSDVVEQQJaeyHQu1QIgiQNb6AmrTtaQ9+RFSLa1D4iXgfsrVITloeSFFZlaAEjAUMaXo2DJWQtVRe1OKF5aJUkf0NdglXO5VzQGoI2USwwD3LEl590CtdO3QBoT5WSFV+Q63Oha17ITgMlkslGSGBWPdeNiDR2SL1B6zQFINmOAkFOW5eTSURCdvX6OdUlapaWjsKX0dgOg26/VWHSUKhrPz35ISKwq76R9Wx+kKgC1f0o5mISsypUG3kPj2L/lDzKYvEUwzoh2JtPRdQQAo1jD6afne88H1oTMeH6ZK+x7PB/lQ/CJtvkNEgDh1dr/bVYAAAAASUVORK5CYII=',
    'description': 'Wikipedia opensearch plugin',
    'encoding': 'UTF-8',
    'url': {
      'type': 'text/html',
      'template': 'http://en.wikipedia.org/wiki/Special:Search?search={searchTerms}'
    },

    'suggestions': {
      'type': 'application/x-suggestions+json',
      'template': 'http://en.wikipedia.org/w/api.php',
      'parameters': {
        'action': 'opensearch',
        'search': '{searchTerms}'
      }
    }
  },

  'Marketplace': {
    'shortname': 'Mozilla Marketplace',
    'icon': '',
    'description': 'Marketplace opensearch plugin',
    'encoding': 'UTF-8',
    'url': {
      'type': 'text/html',
      'template': 'https://marketplace.firefox.com/search?q={searchTerms}'
    },
    'suggestions': {
      'type': 'application/x-suggestions+json',
      'template': 'http://54.241.22.16/marketplace',
      'parameters': {
        'q': '{searchTerms}'
      }
    }
  },

'EverythingMe': {
    'shortname': 'Everything.Me',
    'icon': '',
    'description': 'Everything.Me opensearch plugin',
    'encoding': 'UTF-8',
    'url': {
      'type': 'text/html',
      'template': 'http://54.241.22.16/everythingme/?q={searchTerms}'
    },
    'suggestions': {
      'type': 'application/x-suggestions+json',
      'template': 'http://54.241.22.16/everythingme',
      'parameters': {
        'q': '{searchTerms}'
      }
    }
  }
};

function debug(str) {
  //console.log('OpenSearchPlugins: ' + str + '\n');
}

// Handles processing of suggestion results
var process = {
  /**
   * Handles parsing application/x-suggestions+json
   */
  json: function(baseURI, count, xhr) {
    var json = JSON.parse(xhr.responseText);

    var results = [];
    var keywords = json[1];
    var urls = json[2] || [];
    var images = json[3] || [];

    var limit = Math.min(count || keywords.length);
    for (var i = 0; i < limit; i++) {
      var uri = baseURI.replace('{searchTerms}', keywords[i]);
      var thisResult = {
        title: keywords[i],
        uri: uri
      };

      if (urls[i]) {
        thisResult.uri = urls[i];
      }

      if (images[i]) {
        thisResult.icon = images[i];
      }

      results.push(thisResult);
    }

    return {
      items: results,
      isVisual: (images.length > 0)
    };
  },

  /**
   * Handles parsing application/x-suggestions+xml
   * This is not really defined in the opensearch spec
   * We have this implemented solely to get results from google.
   */
  xml: function(baseURI, count, xhr) {
    var parser = new DOMParser();
    var responseXML = parser.parseFromString(
      xhr.responseText,
      'text/xml'
    );

    var snapshot = responseXML.evaluate(
      '//suggestion/@data',
      responseXML,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );

    var results = [];

    var limit = Math.min(count || snapshot.snapshotLength);
    for (var i = 0; i < limit; i++) {
      var words = snapshot.snapshotItem(i).nodeValue;
      var uri = baseURI.replace('{searchTerms}', words);
      results.push({ 'title': words, 'uri': uri});
    }

    return {
      items: results,
      isVisual: false
    };
  }
};

var KEY = 'opensearch';

var OpenSearch = {
  plugins: null,

  _transactions: [],

  init: function(callback) {
    asyncStorage.getItem(KEY, function(value) {
      if (!value) {
        this.plugins = defaults;
        asyncStorage.setItem(KEY, this.plugins);
      } else {
        this.plugins = value;
      }
      callback();
    }.bind(this));
  },

  abort: function() {
    this._transactions.forEach(function eachTransaction(xhr) {
      xhr.abort();
    });
    this._transactions = [];
  },

  getSuggestions: function(name, search, count, callback) {
    var plugin = this.plugins[name];
    if (!plugin) {
      debug('Can\'t find a plugin for ' + name);
    }

    // If there is no plugin, call the callback and let them handle it
    if (!plugin.suggestions) {
      callback([
        {
          'title': search,
          'uri': plugin.url.template.replace('{searchTerms}', search)
        }
      ]);
      return;
    }

    var suggestions = plugin.suggestions;
    var uri = suggestions.template.replace('{searchTerms}', search);

    // Apply search params if any.
    var params = '';
    var parameters = suggestions.parameters;
    for (var param in parameters) {
      if (params) {
        params += '&';
      }
      params += param + '=' + parameters[param]
    }

    if (params) {
      uri += '?' + params;
    }

    uri = uri.replace('{searchTerms}', search);

    var type = suggestions.type;
    var baseURI = plugin.url.template;
    var xhr = new XMLHttpRequest({mozSystem: true, mozAnon: true});
    xhr.open('GET', uri, true);
    xhr.responseType = type;
    xhr.onload = function() {
      var results = process[type.match(/suggestions\+(.*)/)[1]](
        baseURI, count, xhr);

      // Insert the query into the response if it's not there
      // We might want to control this with a parameter
      var found = false;
      for (var i = 0, result; result = results.items[i]; i++) {
        if (result.title &&
          result.title.toLowerCase() === search.toLowerCase()) {
          found = true;
          break;
        }
      }
      if (!found) {
        var uri = baseURI.replace('{searchTerms}', search);
        results.items.push({ 'title': search, 'uri': uri});
      }

      callback(results);
    };

    xhr.onerror = function() {
      debug('error: ' + xhr.status);
    };

    xhr.send();

    this._transactions.push(xhr);
  },

  add: function(url, callback) {
    var xhr = new XMLHttpRequest({mozSystem: true, mozAnon: true});

    xhr.open('GET', url, true);
    xhr.onload = function() {
      var description = xhr.responseXML.firstChild;
      var children = description.childNodes;
      var provider = {};

      for (var i = 0, child; child = children[i]; i++) {
        switch (child.nodeName) {
          case 'ShortName':
            provider.shortname = child.textContent;
            break;
          case 'Description':
            provider.description = child.textContent;
            break;
          case 'InputEncoding':
            provider.encoding = child.textContent;
            break;
          case 'Image':
            provider.icon = child.textContent;
            break;
          case 'Url':
            var attributes = {};
            var xmlAttrs = child.attributes;
            for (var j = xmlAttrs.length - 1; j >= 0; j--) {
              var xmlAttr = xmlAttrs[j];
              attributes[xmlAttr.name] = xmlAttr.value;
            }

            if (attributes.type === 'text/html') {
              provider.url = {
                'type': 'text/html',
                'template': attributes.template
              };
            }

            if (attributes.type === 'application/x-suggestions+json') {
                var urlParts = attributes.template.split('?');
                provider.suggestions = {
                  'type': 'text/html',
                  'template': urlParts[0],
                  'parameters': {}
                };

                if (urlParts[1]) {
                  var tuples = urlParts[1].split('&');
                  tuples.forEach(function(tuple) {
                    var each = tuple.split('=');
                    provider.suggestions.parameters[each[0]] = each[1];
                  });
                }
            }

            break;
        }
      }
      OpenSearch.persist(provider, callback);
    };

    xhr.onerror = function() {
      debug('error: ' + xhr.status);
    };

    xhr.send();
  },

  /**
   * Persists an open search provider to async storage
   */
  persist: function(provider, callback) {
    this.plugins[provider.shortname] = provider;
    asyncStorage.setItem(KEY, this.plugins, callback);
  }
};

OpenSearch.init();

return OpenSearch;
})();
