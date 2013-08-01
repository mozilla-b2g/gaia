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
    'icon': 'data:image/png;base64,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',
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
    var images = json[4] || [];

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
