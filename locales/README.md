Building multilocale Gaia
=========================

You can build a multilocale Gaia profile with the following `make` command:

    make profile \
      LOCALE_BASEDIR=locales/ \
      LOCALES_FILE=locales/languages_basecamp.json \
      GAIA_DEFAULT_LOCALE=pt-BR

Use `make multilocale-clean` to clean the working directory after the above.

Use `GAIA_INLINE_LOCALES=1` to precompile all HTML to include text content in 
the deafult locale.

See `build/multilocale.py --help` for other l10n-related tasks that you may be 
interested in (e.g., modifying the \*.ini files).

The full documentation on building multilocale Gaia and B2G is avaiable on MDN: https://developer.mozilla.org/en-US/docs/Mozilla/Firefox_OS/Building#Building_multilocale


Localization Testing
====================

This directory can be used for localization testing.  You can put localization 
files here and Gaia will use them when run in the `debug` mode.

Running Gaia in debug mode
--------------------------

In order to enable the the `debug` mode (in a desktop build or in Firefox), 
run:

    $ DEBUG=1 make profile

Localization file layout
------------------------

Files put in this directory should follow the l10n HG repos directory layout.  

In the `debug` mode, Gaia will first try to find the `.properties` file in 

    locales/LOCALE/apps/APP/APP.properties

For instance, the localization file for the browser app for French would be 
located under:

    locales/fr/apps/browser/browser.properties

Notice that this way `locales/fr` can be an HG clone of the French gaia-l10n 
repository.

If the file does not exist, Gaia will fallback to looking in its regular 
location, i.e.:

    apps/APP/locales/APP.LOCALE.properties

Use-case: working in HG
-----------------------

Clone your locale's Gaia l10n repository into this directory.  For instace, for 
French (run from the git clone root):

    $ hg clone ssh://hg.mozilla.org/gaia-l10n/fr locales/fr

Create Gaia's profile with:

    $ DEBUG=1 make profile

And launch it in a desktop build:

    $ b2g-bin -profile profile-debug/

...or in Firefox:

    $ firefox -profile profile-debug/

You can now use Gaia and test the localization.  When you make changes to the 
files in the HG clone, just reload the Gaia app to see changes.

Once you're done, commit your changes to HG from the clone you were working in.
