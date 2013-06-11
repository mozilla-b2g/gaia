Evme.__config = {
    "appVersion": "2.0.145",
    "apiHost": "api.everything.me",
    "apiKey": "68f36b726c1961d488b63054f30d312c",
    "authCookieName": "prod-credentials",
    "debugMode": false,
    "unsupportedRedirectMode": false,
    "buildNum": 145,
    "timeoutBeforeSessionInit": 0,
    "apps": {
        "appsPerRow": 4,
        "appHeight": 89,
        "widthForFiveApps": 400,
        "displayInstalledApps": true
    },
    "numberOfAppsToLoad": 16,
    "minHeightForMoreButton": 470,
    "minimumLettersForSearch": 1,
    "defaultBGImage": "",
    "bgImageSize": [320, 460],
     // 24 hours
    "taskerTriggerInterval": 24 * 60 * 60 * 1000,
    "searchbar": {
        "timeBeforeEventPause": 10000,
        "timeBeforeEventIdle": 10000
    },
    "searchSources": {
        "URL": "url",
        "TRENDING": "trnd",
        "SHORTCUT": "shrt",
        "SHORTCUT_ENTITY": "enty",
        "SHORTCUT_CONTINUE_BUTTON": "shrb",
        "SHORTCUT_SMART_FOLDER": "fldr",
        "RETURN_KEY": "rtrn",
        "SUGGESTION": "sugg",
        "SPELLING": "spel",
        "REFINE": "refi",
        "HISTORY": "hist",
        "TYPING": "type",
        "LOCATION_REFRESH": "locn",
        "PAUSE": "wait",
        "MORE": "more",
        "INFO_WHATIS": "infw",
        "EMPTY_SEARCHBOX": "mpty",
        "ME_LIKES": "like"
    },
    "pageViewSources": {
        "URL": "url",
        "TAB": "tab",
        "BACK": "back",
        "CLEAR_SEARCHBOX": "clear",
        "SHORTCUT": "shrt"
    },
    "analytics": {
        "enabled": true,
        "providers": {            
            "APIStatsEvents": {
                "enabled": true,
                "requestsPerEventCount": 1
            }
        }
    },
    "maxHistoryEntries": "10",
    "iconsGroupSettings": [
        {
            "x": 28,
            "y": 13,
            "size": 33,
            "darken": 0.5,
            "shadowOffset": 2,
            "shadowBlur": 1,
            "shadowOpacity": 0.2
        },
        {
            "x": 22,
            "y": 7,
            "size": 33,
            "darken": 0.3,
            "shadowOffset": 2,
            "shadowBlur": 2,
            "shadowOpacity": 0.2
        },
        {
            "x": 8,
            "y": 3,
            "size": 38,
            "shadowOffset": 4,
            "shadowOffsetX": 2,
            "shadowBlur": 4,
            "shadowOpacity": 0.3
        }
    ],
    "design": {
        "apps": {
            "defaultIconUrl": {
                "20": [
                    "/everything.me/images/icn/default1.png?cb=1346169250",
                    "/everything.me/images/icn/default2.png?cb=1346169250",
                    "/everything.me/images/icn/default3.png?cb=1346169250"
                ]
            }
        }
    },
    // disableAfter: if the app can't render the feature under the timeout, it will disable it
    // bringBack: if, after disabling the feature, it's faster than bringBack- re-enable it
    "featureStateByConnection": {
      "iconQuality": {
        "disableAfter": 2500,
        "bringBack": 600
      },
      "typingImage": {
        "disableAfter": 3000,
        "bringBack": 1500
      },
      "typingApps": {
        "disableAfter": 3500,
        "bringBack": 800
      }
    },
    // time before refreshing user location (milliseconds)
    "locationInterval": 10 * 60 * 1000,
    // timeout for get location request (milliseconds)
    "locationRequestTimeout": 4000,
    // internal mapping of IDs to l10n keys- DON'T TOUCH
    "shortcutIdsToL10nKeys": {
        "243": "answers",
        "297": "astrology",
        "288": "autos",
        "347": "baby",
        "356": "beauty",
        "22": "books",
        "225": "celebs",
        "280": "city-guides",
        "338": "classifieds",
        "292": "daily-deals",
        "320": "dating",
        "286": "electronics",
        "248": "email",
        "376": "entertainment",
        "361": "environment",
        "282": "fashion",
        "321": "financial-news",
        "303": "financial-services",
        "301": "flights",
        "277": "funny",
        "207": "games",
        "330": "history",
        "242": "images",
        "194": "internet",
        "274": "jobs",
        "302": "kids",
        "366": "lifestyle",
        "296": "local",
        "278": "maps",
        "181": "movies",
        "142": "music",
        "276": "near-me",
        "245": "news",
        "295": "nightlife",
        "283": "pets",
        "360": "productivity",
        "270": "recipes",
        "271": "reference",
        "220": "restaurants",
        "335": "shoes",
        "238": "shopping",
        "289": "social",
        "260": "sports",
        "306": "travel",
        "272": "travel-guides",
        "213": "tv",
        "314": "universities",
        "357": "utilities",
        "211": "video",
        "291": "video-games",
        "249": "weather"
    }
};