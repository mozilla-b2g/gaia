define({
  "google": {
    "providerType": "Caldav",
    "group": "remote",
    "authenticationType": "oauth2",
    "apiCredentials": {
      "tokenUrl": "https://accounts.google.com/o/oauth2/token",
      "authorizationUrl": "https://accounts.google.com/o/oauth2/auth",
      "user_info": {
        "url": "https://www.googleapis.com/oauth2/v3/userinfo",
        "field": "email"
      },
      "client_secret": "jQTKlOhF-RclGaGJot3HIcVf",
      "client_id": "605300196874-1ki833poa7uqabmh3hq6u1onlqlsi54h.apps.googleusercontent.com",
      "scope": "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email",
      "redirect_uri": "https://oauth.gaiamobile.org/authenticated"
    },
    "options": {
      "domain": "https://apidata.googleusercontent.com",
      "entrypoint": "/caldav/v2/",
      "providerType": "Caldav"
    }
  },
  "yahoo": {
    "providerType": "Caldav",
    "group": "remote",
    "options": {
      "domain": "https://caldav.calendar.yahoo.com",
      "entrypoint": "/",
      "providerType": "Caldav",
      "user": "@yahoo.com",
      "usernameType": "email"
    }
  },
  "caldav": {
    "providerType": "Caldav",
    "group": "remote",
    "options": {
      "domain": "",
      "entrypoint": "",
      "providerType": "Caldav"
    }
  },
  "local": {
    "singleUse": true,
    "providerType": "Local",
    "group": "local",
    "options": {
      "providerType": "Local"
    }
  }
});