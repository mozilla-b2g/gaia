
var OpenSearchPlugins = (function OpenSearchPlugins() {

'use strict';

var defaults = {

'Marketplace': {
    'shortname': 'Mozilla Marketplace',
    'icon': '',
    'description': 'Marketplace opensearch plugin',
    'encoding': 'UTF-8',
    'url': {
      'method': 'get',
      'type': 'text/html',
      'template': 'https://marketplace.firefox.com/search?q={searchTerms}'
    },
    'suggestions': {
      'includeSelf': false,
      'method': 'get',
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
      'method': 'get',
      'type': 'text/html',
      'template': 'http://54.241.22.16/everythingme/?q={searchTerms}'
    },
    'suggestions': {
      'includeSelf': false,
      'method': 'get',
      'type': 'application/x-suggestions+json',
      'template': 'http://54.241.22.16/everythingme',
      'parameters': {
        'q': '{searchTerms}'
      }
    }
  },

  'Bing': {
    'shortname': 'Bing',
    'icon': 'data:image/x-icon;base64,AAABAAIAEBAAAAAAAAD/AAAAJgAAACAgAAAAAAAA+AMAACUBAACJUE5HDQoaCgAAAA1JSERSAAAAEAAAABAIBgAAAB/z/2EAAADGSURBVDjLY/i/TPQ/JZiBOgZsd/z/f08AhCbLgJdH/4MBiKaaAWtUIK4i4DJUA95d/v//xsz//788+o8VPN4GMRCnATAAMuByF8IFx3NR1dxbjscAkCTI+dicDDIIBkAuxWoALs0wDLIABH5+QDIA5DeY0wmFPMhrMAA34Gw1QhAtkFAwyHWwAIZahkiJoBiAOQ1kILpmkMHIaqBRy4BiOihgYACkCBQ2IIwcrSBDkNIFZl7YaARxAShcYAaAMCxaaZOZKMAAOzkOfhyf540AAAAASUVORK5CYIKJUE5HDQoaCgAAAA1JSERSAAAAIAAAACAIBgAAAHN6evQAAAO/SURBVFjDxZRJTxRBFMfrJiC7enKJ28nEGL+AXo2J+gFcrkr0C4gLKjCAoILKIgKyjSZG40FFMephHERcLm4XVzTRi7I4DHRPL8/3qqq7q6d7ZIgRO/mFzlT1+/3fq6ZZ8lzB9smq3JGxQwtgPhmvyHk1XpO3kZF8/EgOjB2eX8hJbkY3/4WjOTBRkQuMbuaVCsHEsVwOoxTzhpROHs8TnMjDAMe8hX/KcQFJOZVIFQaYPEE//mMqBb9QyKlGInmQiFCASpkG0WPVoF7m5xio63OmSvCreqEgIkjUILVEPjCeRhIWQF2fCwmCZI5QSqeIunyYOilg7iZEf5QWYDQG6nrW1OQLaj08aQFM1RdAskHApmhRkopHAgHU9ayp84RJop6Q0lMFME2cRs4UYoA674HQAHIt2bgUtNt7+R76PYzUUAS0gb2QbF8npA35rjTpSKV4urEQZhopQL0YCUEFfAG+xEC7s4//netFz+iDZZA8XSiEUsrFTUUwc1bAnHRE6nEk6+K012U4AtbX8JD25Cjo17e6wplzRaAR55FmCnAG5RIqlOnihQb3wXTLMnf/tAp11roc9HtlfG/6lbpf5ko5LcWgI2xGngVhPKkJ7/hNP2hYXN3LaZLjVEZKaO0rwHwbDdQx7uzkUr2VKIFUWwkGOItFJMZIMID54SaoewRFvpH6xup2WQzWx1v+YtoE6G1CnLqAtGMA9yHEfBoMoPesB3WPdr5Y0OyhN4txujgdRjcEG7q3i4uNi6UcphYyn9YGHlDXOS0enkzSVsw71J0OkfTLelEHRkepoBMDqMnN+MHgBMJEUpZSueBJeYe8y5AAT8rBRDGniwLIxDx12MiGyr11pTNV5iLHysEOreHyYL2rG1G8CMxLApZe0PqU9uLoE2Bc2+TvTOlQFTpQd9aNzfxZ37/y6G0utYhuAfN1QHSvBPvHy0AI6kYIJYqQztJwxkrykfKg/OcrsC6vdsVWj4D5Cjn0rgL7Wzz4QUiMgv26FayBbWD2r+JnyOnHwgPbwX7TyvcEPmLf42BdWe1KrZ7FYPUKmJM+DCu2P7Rg1lfiC9jxA5641xPbRB8FwBeCMDNB5/VgN9jvLmcXhqTvr4D9cI9P6Ir7/DDnbcyEe2YOeI72XRz3YDo7cMxrgl2GSDn9AmZiUZWAsOcPhHWYSahIVRh/IWYjrKvZZBmlSwTRJQAISxdk7CobWYYuXXHUA5wARlfJkD1XyawyD1Bk6Rhdpc+Z1lG4Fm+G/1bkEhX8SczlnaXP8Juz5TddEmZvDz4eOQAAAABJRU5ErkJggg==',
    'description': 'Bing opensearch plugin',
    'encoding': 'UTF-8',
    'url': {
      'method': 'get',
      'type': 'text/html',
      'template': 'http://www.bing.com/search?q={searchTerms}&FORM=MO0001'
    },
    'suggestions': {
      'includeSelf': true,
      'method': 'get',
      'type': 'application/x-suggestions+json',
      'template': 'http://api.bing.com/osjson.aspx',
      'parameters': {
        'query': '{searchTerms}',
        'form': 'OSDJAS'
      }
    }
  },

  'Wikipedia': {
    'shortname': 'Wikipedia',
    'icon': 'data:image/x-icon;base64,AAABAAIAEBAAAAAAAAA4AQAAJgAAACAgAAAAAAAAJAMAAGQBAACJUE5HDQoaCgAAAA1JSERSAAAAEAAAABAIBgAAAB/z/2EAAAEFSURBVDjLxZPRDYJAEESJoQjpgBoM/9IBtoAl4KcUQQlSAjYgJWAH0gPmyNtkzEEuxkQTPzawc3Ozc3MQTc/JfVPR/wW6a+eKQ+Hyfe54B2wvrfXVqXLDfTCMd3j0VHksrTcH9bl2aZq+BCgEwCCPj9E4TdPYGj0C9CYAKdkmBrIIxiIYbvpbb2sSl8AiA+ywAbJE5YLpCImLU/WRDyIAWRgu4k1s4v50ODru4haYSCk4ntkuM0wcMAINXiPKTJQ9CfgB40phBr8DyFjGKkKEhYhCY4iCDgpAYAM2EZBlhJnsZxQUYBNkSkfBvjDd0ttPeR0mxREQ+OhfYOJ6EmL+l/qzn2kGli9cAF3BOfkAAAAASUVORK5CYIKJUE5HDQoaCgAAAA1JSERSAAAAIAAAACAIBgAAAHN6evQAAAIKSURBVFjD7ZdBSgNRDIYLguAB7FLwAkXwBl0JgiDYjQcY8ARduBJKu3I5C0EoWDxAT9AL9AK9QBeCIHQlCM/3DZOSmeZNZ2r1bQyEGV7yXv7kJZlJq6XIOXfs+crzwPPTnvnR863n05ZFufDD/T595Q4eauM37u/pWYwfeX53cegcABcuHg0AkEQE8AKAu4gAXv8BrAEMh0PXbrddt9t1vV4v406nk62laeqm02n2LjKYIuK5WCyyfeiLDF32yLn6TJ5mBFarlev3+9nBMMqsabkYhmezWcEd2ctTE/tYBwhgt14BhtmAV2VaLpdrAHioCW+VdwWy9IMAUBQjJcQFTwGqvcTD+Xy+oc8askZJyAYrnKEokCeWLpQkSSZvBIANYgSDVVEQQJaeyHQu1QIgiQNb6AmrTtaQ9+RFSLa1D4iXgfsrVITloeSFFZlaAEjAUMaXo2DJWQtVRe1OKF5aJUkf0NdglXO5VzQGoI2USwwD3LEl590CtdO3QBoT5WSFV+Q63Oha17ITgMlkslGSGBWPdeNiDR2SL1B6zQFINmOAkFOW5eTSURCdvX6OdUlapaWjsKX0dgOg26/VWHSUKhrPz35ISKwq76R9Wx+kKgC1f0o5mISsypUG3kPj2L/lDzKYvEUwzoh2JtPRdQQAo1jD6afne88H1oTMeH6ZK+x7PB/lQ/CJtvkNEgDh1dr/bVYAAAAASUVORK5CYII=',
    'description': 'Wikipedia opensearch plugin',
    'encoding': 'UTF-8',
    'url': {
      'method': 'get',
      'type': 'text/html',
      'template': 'http://en.wikipedia.org/wiki/Special:Search?search={searchTerms}'
    },

    'suggestions': {
      'includeSelf': true,
      'method': 'get',
      'type': 'application/x-suggestions+json',
      'template': 'http://en.wikipedia.org/w/api.php',
      'parameters': {
        'action': 'opensearch',
        'search': '{searchTerms}'
      }
    }
  },

 'DuckDuckGo': {
    'shortname': 'DuckDuckGo',
    'icon': 'data:image/x-icon;base64,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',
    'description': 'DuckDuckGo opensearch plugin',
    'encoding': 'UTF-8',
    'url': {
      'method': 'get',
      'type': 'text/html',
      'template': 'https://duckduckgo.com/?q={searchTerms}'
    },

   'suggestions': {
      'includeSelf': true,
      'method': 'get',
      'type': 'application/x-suggestions+json',
      'template': 'http://api.bing.com/osjson.aspx',
      'parameters': {
        'query': '{searchTerms}',
        'form': 'OSDJAS'
      }
    }
  },

 'Google': {
    'shortname': 'Google',
    'icon': 'data:image/x-icon;base64,AAABAAIAEBAAAAEAIABoBAAAJgAAACAgAAABACAAqBAAAI4EAAAoAAAAEAAAACAAAAABACAAAAAAAAAEAAASCwAAEgsAAAAAAAAAAAAA9IVCSvSFQuf0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hULk9IVCSvSFQub0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQuf0hUL/9IVC//SFQv/0hUL/9Y1O//rIq//+7+f//eXX//vUvf/7z7X/96Fu//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//vYwv/97OH/9ZRZ//SFQv/0hUL/9IhG//zbx//3om7/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/97uX/+buW//SFQv/0hUL/9IVC//SFQv/5upT/+9O6//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/+b6b//zezP/0iEf/9IVC//SFQv/1klf//ezh//vPtP/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/3qXr/+siq//m8lv/5wqD//vTu//3t4//1klb/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0h0b//vbx//zi0//1j1H/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/2nmn/+bmS/////v/4sIX/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/5uJH///v5//eoef/1jU//+82y//afav/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL//vXw//vOs//0hUL/9IVC//ekcf/96+D/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//728v/4sIX/9IVC//SFQv/4s4n///v4//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/6yKn/+byX//SFQv/0hkT//eTV//vWv//0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IZE//m6lP/5u5b//OHQ///+/f/6y6//96d3//SFQv/0hUL/9IVC//SFQv/0hULm9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hULm9IVCSfSFQub0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hULm9IVCSQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAIAAAAEAAAAABACAAAAAAAAAQAAASCwAAEgsAAAAAAAAAAAAA9IVCAPSFQif0hUKt9IVC8vSFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQvL0hUKt9IVCJ/SFQgD0hUIo9IVC7/SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hULv9IVCKPSFQq30hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUKt9IVC8fSFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQvP0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9YtL//i2jv/828f//vLr///7+P///Pv//vTu//3n2v/6zbH/96Nw//SFQ//0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//ekcv/+8+z////////////+9fD/+9K5//m9mf/4to7/+buV//vSuf/++PT//OPT//aYYP/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/2l13///r3/////////fv/+b2Z//SIRv/0hUL/9IVC//SFQv/0hUL/9IVC//WNT//84M///vXv//aZYf/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//vPtP////////////i0i//0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//WQUv///Pr//OPU//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL//eTV///////+9O7/9IVD//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//3m2P//////9ppi//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/718H///////3s4f/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL//vDn///////4soj/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//erff////////38//WTWP/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//iziv////////////iwhf/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//rMsP///////eXW//WSVv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/4sYb///z7/////////Pv/9ZFV//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//ixhv/+8Of//vn1//rMsP/4rH//9plh//WQUv/1j1L/+s2x//////////////////m9mf/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SGQ//2nmn/+buW//vNsv/82sb//e3j/////////////////////v/5wZ//9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/83Mj////////////++fb/+K+C//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9ZRZ/////////////vTt//aaYv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/1lFr////////////6xqf/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//ehbf/70bj//end//3o2////v3///////3l1//0iEb/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/5wqD////////////96t7/96Z2//WOUP/2nWf//NvH//zcyP/1i0z/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/96l6/////////////vLr//WPUf/0hUL/9IVC//SFQv/0h0b//end//3k1f/0iUn/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/8387////////////4sYf/9IVC//SFQv/0hUL/9IVC//SFQv/6w6L///////nBn//0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC///69////////vj1//SIR//0hUL/9IVC//SFQv/0hUL/9IVC//m+mv///////e3j//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL///r3///////8387/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/+syw///////++fb/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/95NX///////vUvP/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/97OH///////7y6//0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//i2jv///////N/O//SFQv/0hUL/9IVC//SFQv/0hUL/96Nx////////////+s2x//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IdF//zh0P//+/j/9ZJW//SFQv/0hUL/9IVC//SKSv/96t7///////738v/1k1f/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9YxN//vUvf/96+D/96Z0//WNT//3om///ebY/////////Pv/+LKI//WVW//0h0X/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//agbP/7zbL//enc//749P////////////////////////////3r4P/3p3f/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hULx9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC8/SFQq30hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUKt9IVCJ/SFQu/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC7/SFQif0hUIA9IVCJfSFQq30hULx9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC//SFQv/0hUL/9IVC8fSFQq30hUIl9IVCAIAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAB',
    'description': 'Google opensearch plugin',
    'encoding': 'UTF-8',
    'url': {
      'method': 'get',
      'type': 'text/html',
      'template': 'http://www.google.com/search?q={searchTerms}&hl=en'
    },

   'suggestions': {
      'includeSelf': true,
      'method': 'get',
      'type': 'application/x-suggestions+xml',
      'template': 'http://google.com/complete/search',
      'parameters': {
        'output': 'toolbar',
        'q': '{searchTerms}'
      }
    }
  }
};

function debug(str) {
  console.log('OpenSearchPlugins: ' + str + '\n');
}

var OpenSearch = {
  plugins: defaults,

  getSuggestions: function os_getSuggestions(name, search, count, callback) {

    var plugin = this.plugins[name];
    if (!plugin || !plugin.suggestions) {
      debug('Can\'t find a plugin or suggestions for ' + name);
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
      params += param + '=' + parameters[param].replace(
        '{searchTerms}', search);
    }

    if (params) {
      uri += '?' + params;
    }

    var type = suggestions.type;

    var xhr = new XMLHttpRequest({mozSystem: true, mozAnon: true});
    xhr.open('GET', uri, true);
    xhr.responseType = type;
    xhr.onload = function() {
      switch (type) {
        case 'application/x-suggestions+json':
          debug('uri: ' + uri);
          debug('load: ' + xhr.responseText);
          var json = JSON.parse(xhr.responseText);

          var results = [];
          var baseURI = plugin.url.template;
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
          break;

        case 'application/x-suggestions+xml':
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
          var baseURI = plugin.url.template;

          for (var i = 0; i < snapshot.snapshotLength; i++) {
            if (i >= count) {
              break;
            }

            var words = snapshot.snapshotItem(i).nodeValue;
            var uri = baseURI.replace('{searchTerms}', words);
            results.push({ 'title': words, 'uri': uri});
          }

          break;

        default:
          debug('Unsupported type: ' + type);
          break;
      }

      // Insert the query into the response if it's not there
      // We might want to control this with a parameter
      var found = false;
      for (var i = 0, result; result = results[i]; i++) {
        if (result.title &&
          result.title.toLowerCase() === search.toLowerCase()) {
          found = true;
          break;
        }
      }
      if (!found && suggestions.includeSelf) {
        var uri = baseURI.replace('{searchTerms}', search);
        results.push({ 'title': search, 'uri': uri});
      }

      callback(results);
    };

    xhr.onerror = function() {
      debug('error: ' + xhr.status);
    };

    xhr.send();
  }
};

return OpenSearch;
})();
