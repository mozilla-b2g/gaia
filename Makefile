###############################################################################
# Global configurations.  Protip: set your own overrides in a local.mk file.  #
#                                                                             #
# GAIA_DOMAIN : change that if you plan to use a different domain to update   #
#               your applications or want to use a local domain               #
#                                                                             #
# HOMESCREEN  : url of the homescreen to start on                             #
#                                                                             #
# ADB         : if you use a device and plan to send update it with your work #
#               you need to have adb in your path or you can edit this line to#
#               specify its location.                                         #
#                                                                             #
# DEBUG       : debug mode enables mode output on the console and disable the #
#               the offline cache. This is mostly for desktop debugging.      #
#                                                                             #
# REPORTER    : Mocha reporter to use for test output.                        #
#                                                                             #
# GAIA_APP_SRCDIRS : list of directories to search for web apps               #
#                                                                             #
###############################################################################
-include local.mk

GAIA_DOMAIN?=gaiamobile.org

HOMESCREEN?=http://system.$(GAIA_DOMAIN)

LOCAL_DOMAINS?=1

ADB?=adb

DEBUG?=0

REPORTER=Spec

GAIA_APP_SRCDIRS?=apps test_apps

ifeq ($(MAKECMDGOALS), demo)
GAIA_DOMAIN=thisdomaindoesnotexist.org
GAIA_APP_SRCDIRS=apps
endif


###############################################################################
# The above rules generate the profile/ folder and all its content.           #
# The profile folder content depends on different rules:                      #
#  1. webapp manifest                                                         #
#     A directory structure representing the applications installed using the #
#     Apps API. In Gaia all applications use this method.                     #
#     See https://developer.mozilla.org/en/Apps/Apps_JavaScript_API           #
#                                                                             #
#  2. offline                                                                 #
#     An Application Cache database containing Gaia apps, so the phone can be #
#     used offline and application can be updated easily. For details about it#
#     see: https://developer.mozilla.org/en/Using_Application_Cache           #
#                                                                             #
#  3. preferences                                                             #
#     A preference file used by the platform to configure permissions         #
#                                                                             #
###############################################################################

# In debug mode the offline cache is not used (even if it is generated) and
# Gaia is loaded by a built-in web server via port GAIA_PORT.
#
# XXX For now the name of the domain should be mapped to localhost manually
# by editing /etc/hosts on linux/mac. This steps would not be required
# anymore once https://bugzilla.mozilla.org/show_bug.cgi?id=722197 will land.
ifeq ($(DEBUG),1)
GAIA_PORT?=:8080
else
GAIA_PORT?=
endif


# what OS are we on?
SYS=$(shell uname -s)
ARCH=$(shell uname -m)

ifeq ($(SYS),Darwin)
MD5SUM = md5 -r
SED_INPLACE_NO_SUFFIX = sed -i ''
DOWNLOAD_CMD = curl -s -O
else
MD5SUM = md5sum -b
SED_INPLACE_NO_SUFFIX = sed -i
DOWNLOAD_CMD = wget
endif

# Test agent setup
TEST_AGENT_DIR=tools/test-agent/
ifeq ($(strip $(NODEJS)),)
	NODEJS := `which node`
endif

ifeq ($(strip $(NPM)),)
	NPM := `which npm`
endif

TEST_AGENT_CONFIG="./test_apps/test-agent/config.json"

#Marionette testing variables
#make sure we're python 2.7.x
ifeq ($(strip $(PYTHON_27)),)
PYTHON_27 := `which python`
endif
PYTHON_FULL := $(wordlist 2,4,$(subst ., ,$(shell $(PYTHON_27) --version 2>&1)))
PYTHON_MAJOR := $(word 1,$(PYTHON_FULL))
PYTHON_MINOR := $(word 2,$(PYTHON_FULL))
MARIONETTE_HOST ?= localhost
MARIONETTE_PORT ?= 2828
TEST_DIRS ?= $(CURDIR)/tests

# Generate profile/
profile: stamp-commit-hash update-offline-manifests preferences webapp-manifests test-agent-config offline extensions
	@echo "\nProfile Ready: please run [b2g|firefox] -profile $(CURDIR)/profile"

LANG=POSIX # Avoiding sort order differences between OSes

# Generate profile/webapps/
# We duplicate manifest.webapp to manifest.webapp and manifest.json
# to accommodate Gecko builds without bug 757613. Should be removed someday.
webapp-manifests:
	@echo "Generated webapps"
	@mkdir -p profile/webapps
	@echo { > profile/webapps/webapps.json
	for d in `find ${GAIA_APP_SRCDIRS} -mindepth 1 -maxdepth 1 -type d` ;\
	do \
	  if [ -f $$d/manifest.webapp ]; \
		then \
			n=$$(basename $$d); \
			mkdir -p profile/webapps/$$n; \
			cp $$d/manifest.webapp profile/webapps/$$n/manifest.webapp  ;\
			cp $$d/manifest.webapp profile/webapps/$$n/manifest.json  ;\
			(\
			echo \"$$n\": { ;\
			echo \"origin\": \"http://$$n.$(GAIA_DOMAIN)$(GAIA_PORT)\", ;\
			echo \"installOrigin\": \"http://$$n.$(GAIA_DOMAIN)$(GAIA_PORT)\", ;\
			echo \"receipt\": null, ;\
			echo \"installTime\": 132333986000, ;\
			echo \"manifestURL\": \"http://$$n.$(GAIA_DOMAIN)$(GAIA_PORT)/manifest.webapp\" ;\
			echo },) >> profile/webapps/webapps.json;\
		fi \
	done
	@cd external-apps; \
	for d in `find * -maxdepth 0 -type d` ;\
	do \
	  if [ -f $$d/manifest.webapp ]; \
		then \
		  mkdir -p ../profile/webapps/$$d; \
		  cp $$d/manifest.webapp ../profile/webapps/$$d/manifest.webapp  ;\
                  (\
			echo \"$$d\": { ;\
			echo \"origin\": \"`cat $$d/origin`\", ;\
			echo \"installOrigin\": \"`cat $$d/origin`\", ;\
			echo \"receipt\": null, ;\
			echo \"installTime\": 132333986000, ;\
			echo \"manifestURL\": \"`cat $$d/origin`/manifest.webapp\" ;\
			echo },) >> ../profile/webapps/webapps.json;\
		fi \
	done
	@$(SED_INPLACE_NO_SUFFIX) -e '$$s|,||' profile/webapps/webapps.json
	@echo } >> profile/webapps/webapps.json
	@cat profile/webapps/webapps.json
	@echo "Done"


# Generate profile/OfflineCache/
offline: install-xulrunner
ifneq ($(DEBUG),1)
	@echo "Building offline cache"
	@rm -rf profile/OfflineCache
	@mkdir -p profile/OfflineCache
	@cd ..
	$(XULRUNNER) $(XPCSHELL) -e 'const GAIA_DIR = "$(CURDIR)"; const PROFILE_DIR = "$(CURDIR)/profile"; const GAIA_DOMAIN = "$(GAIA_DOMAIN)$(GAIA_PORT)"; const GAIA_APP_SRCDIRS = "$(GAIA_APP_SRCDIRS)"' build/offline-cache.js
	@echo "Done"
endif


# The install-xulrunner target arranges to get xulrunner downloaded and sets up
# some commands for invoking it. But it is platform dependent
XULRUNNER_BASE_URL=http://ftp.mozilla.org/pub/mozilla.org/xulrunner
ifeq ($(SYS),Darwin)
# We're on a mac
XULRUNNER_DOWNLOAD=$(XULRUNNER_BASE_URL)/nightly/2012/05/2012-05-08-03-05-17-mozilla-central/xulrunner-15.0a1.en-US.mac-x86_64.sdk.tar.bz2
XULRUNNER=./xulrunner-sdk/bin/run-mozilla.sh
XPCSHELL=./xulrunner-sdk/bin/xpcshell

install-xulrunner:
	test -d xulrunner-sdk || ($(DOWNLOAD_CMD) $(XULRUNNER_DOWNLOAD) && tar xjf xulrunner*.tar.bz2 && rm xulrunner*.tar.bz2)

else
# Not a mac: assume linux
# Linux only!
# downloads and installs locally xulrunner to run the xpchsell
# script that creates the offline cache
ifeq ($(ARCH),x86_64)
XULRUNNER_DOWNLOAD=$(XULRUNNER_BASE_URL)/releases/11.0/runtimes/xulrunner-11.0.en-US.linux-x86_64.tar.bz2
else
XULRUNNER_DOWNLOAD=$(XULRUNNER_BASE_URL)/releases/11.0/runtimes/xulrunner-11.0.en-US.linux-i686.tar.bz2
endif
XULRUNNER=./xulrunner/run-mozilla.sh
XPCSHELL=./xulrunner/xpcshell

install-xulrunner :
	test -d xulrunner || ($(DOWNLOAD_CMD) $(XULRUNNER_DOWNLOAD) && tar xjf xulrunner*.tar.bz2 && rm xulrunner*.tar.bz2)
endif

settingsdb :
ifeq ($(SYS),Darwin)
	@echo "B2G pre-populate settings DB."
	$(XULRUNNER) $(XPCSHELL) -e 'const PROFILE_DIR = "$(CURDIR)/profile"' build/settings.js
else 
	@echo "Can't populate on Linux. You can still install."
endif

DB_TARGET_PATH = /data/local/indexedDB
ifneq ($(SYS),Darwin)
DB_SOURCE_PATH = $(CURDIR)/build/indexeddb
else
DB_SOURCE_PATH = profile/indexedDB/chrome
endif
.PHONY: install-settingsdb
install-settingsdb: settingsdb install-xulrunner
	$(ADB) start-server
	$(ADB) push $(DB_SOURCE_PATH)/2588645841ssegtnti ${DB_TARGET_PATH}/chrome/2588645841ssegtnti
	$(ADB) push $(DB_SOURCE_PATH)/2588645841ssegtnti.sqlite ${DB_TARGET_PATH}/chrome/2588645841ssegtnti.sqlite
	$(ADB) shell kill $(shell $(ADB) shell toolbox ps | grep "b2g" | awk '{ print $$2; }')
	@echo 'Rebooting b2g now. '

# Generate profile/prefs.js
preferences: install-xulrunner
	@echo "Generating prefs.js..."
	@mkdir -p profile
	$(XULRUNNER) $(XPCSHELL) -e 'const GAIA_DIR = "$(CURDIR)"; const PROFILE_DIR = "$(CURDIR)/profile"; const GAIA_DOMAIN = "$(GAIA_DOMAIN)"; const DEBUG = $(DEBUG); const LOCAL_DOMAINS = $(LOCAL_DOMAINS); const HOMESCREEN = "$(HOMESCREEN)"; const GAIA_PORT = "$(GAIA_PORT)"' build/preferences.js
	if [ -f custom-prefs.js ]; \
	  then \
	    cat custom-prefs.js >> profile/user.js; \
	  fi
	@echo "Done"


# Generate profile/extensions
EXT_DIR=profile/extensions
extensions:
	@echo "Generating extensions..."
	@mkdir -p profile
	@rm -rf $(EXT_DIR)
ifeq ($(DEBUG),1)
	cp -r tools/extensions $(EXT_DIR)
	# httpd
	@$(SED_INPLACE_NO_SUFFIX) -e 's|@GAIA_DIR@|$(CURDIR)|g' $(EXT_DIR)/httpd@gaiamobile.org
	@$(SED_INPLACE_NO_SUFFIX) -e 's|@GAIA_DOMAIN@|$(GAIA_DOMAIN)|g' $(EXT_DIR)/httpd/content/httpd.js
	@$(SED_INPLACE_NO_SUFFIX) -e 's|@GAIA_DIR@|$(CURDIR)|g' $(EXT_DIR)/httpd/content/loader.js
	@$(SED_INPLACE_NO_SUFFIX) -e 's|@GAIA_DOMAIN@|$(GAIA_DOMAIN)|g' $(EXT_DIR)/httpd/content/loader.js
	@$(SED_INPLACE_NO_SUFFIX) -e 's|@GAIA_PORT@|$(subst :,,$(GAIA_PORT))|g' $(EXT_DIR)/httpd/content/loader.js
endif
	@echo "Done"



###############################################################################
# Tests                                                                       #
###############################################################################

MOZ_TESTS = "$(MOZ_OBJDIR)/_tests/testing/mochitest"
INJECTED_GAIA = "$(MOZ_TESTS)/browser/gaia"

TEST_PATH=gaia/tests/${TEST_FILE}

.PHONY: tests
tests: webapp-manifests offline
	echo "Checking if the mozilla build has tests enabled..."
	test -d $(MOZ_TESTS) || (echo "Please ensure you don't have |ac_add_options --disable-tests| in your mozconfig." && exit 1)
	echo "Checking the injected Gaia..."
	test -L $(INJECTED_GAIA) || ln -s $(CURDIR) $(INJECTED_GAIA)
	TEST_PATH=$(TEST_PATH) make -C $(MOZ_OBJDIR) mochitest-browser-chrome EXTRA_TEST_ARGS="--browser-arg=\"\" --extra-profile-file=$(CURDIR)/profile/webapps --extra-profile-file=$(CURDIR)/profile/OfflineCache --extra-profile-file=$(CURDIR)/profile/user.js"

.PHONY: common-install
common-install:
	@test -x $(NODEJS) || (echo "Please Install NodeJS -- (use aptitude on linux or homebrew on osx)" && exit 1 )
	@test -x $(NPM) || (echo "Please install NPM (node package manager) -- http://npmjs.org/" && exit 1 )

	cd $(TEST_AGENT_DIR) && npm install .

.PHONY: update-common
update-common: common-install
	mkdir -p common/vendor/test-agent/
	mkdir -p common/vendor/marionette-client/
	mkdir -p common/vendor/chai/
	rm -f common/vendor/test-agent/test-agent*.js
	rm -f common/vendor/marionette-client/*.js
	rm -f common/vendor/chai/*.js
	cp $(TEST_AGENT_DIR)/node_modules/test-agent/test-agent.js common/vendor/test-agent/
	cp $(TEST_AGENT_DIR)/node_modules/test-agent/test-agent.css common/vendor/test-agent/
	cp $(TEST_AGENT_DIR)/node_modules/marionette-client/marionette.js common/vendor/marionette-client/
	cp $(TEST_AGENT_DIR)/node_modules/chai/chai.js common/vendor/chai/

# Create the json config file
# for use with the test agent GUI
test-agent-config: test-agent-bootstrap-apps
	@rm -f $(TEST_AGENT_CONFIG)
	@touch $(TEST_AGENT_CONFIG)
	@rm -f /tmp/test-agent-config;
	# Build json array of all test files
	for d in ${GAIA_APP_SRCDIRS}; \
	do \
		find $$d -name '*_test.js' | sed "s:$$d/::g"  >> /tmp/test-agent-config; \
	done;
	@echo '{"tests": [' >> $(TEST_AGENT_CONFIG)
	@cat /tmp/test-agent-config |  \
		sed 's:\(.*\):"\1":' | \
		sed -e ':a' -e 'N' -e '$$!ba' -e 's/\n/,\
	/g' >> $(TEST_AGENT_CONFIG);
	@echo '  ]}' >> $(TEST_AGENT_CONFIG);
	@echo "Built test ui config file: $(TEST_AGENT_CONFIG)"
	@rm -f /tmp/test-agent-config

.PHONY: test-agent-bootstrap-apps
test-agent-bootstrap-apps:
	for d in `find ${GAIA_APP_SRCDIRS} -mindepth 1 -maxdepth 1 -type d` ;\
	do \
		  mkdir -p $$d/test/unit ; \
		  mkdir -p $$d/test/integration ; \
			cp -f ./common/test/boilerplate/_proxy.html $$d/test/unit/_proxy.html; \
			cp -f ./common/test/boilerplate/_sandbox.html $$d/test/unit/_sandbox.html; \
	done
	@echo "Done bootstrapping test proxies/sandboxes";
# Temp make file method until we can switch
# over everything in test
.PHONY: test-agent-test
test-agent-test:
	@$(TEST_AGENT_DIR)/node_modules/test-agent/bin/js-test-agent test --reporter $(REPORTER)

.PHONY: test-agent-server
test-agent-server: common-install
	$(TEST_AGENT_DIR)/node_modules/test-agent/bin/js-test-agent server -c ./$(TEST_AGENT_DIR)/test-agent-server.js --http-path . --growl

.PHONY: marionette
marionette:
#need the profile
	test -d $(GAIA)/profile || $(MAKE) profile
ifneq ($(PYTHON_MAJOR), 2)
	@echo "Python 2.7.x is needed for the marionette client. You can set the PYTHON_27 variable to your python2.7 path." && exit 1
endif
ifneq ($(PYTHON_MINOR), 7)
	@echo "Python 2.7.x is needed for the marionette client. You can set the PYTHON_27 variable to your python2.7 path." && exit 1
endif
ifeq ($(strip $(MC_DIR)),)
	@echo "Please have the MC_DIR environment variable point to the top of your mozilla-central tree." && exit 1
endif
#if B2G_BIN is defined, we will run the b2g binary, otherwise, we assume an instance is running
ifneq ($(strip $(B2G_BIN)),)
	cd $(MC_DIR)/testing/marionette/client/marionette && \
	sh venv_test.sh $(PYTHON_27) --address=$(MARIONETTE_HOST):$(MARIONETTE_PORT) --b2gbin=$(B2G_BIN) $(TEST_DIRS)
else
	cd $(MC_DIR)/testing/marionette/client/marionette && \
	sh venv_test.sh $(PYTHON_27) --address=$(MARIONETTE_HOST):$(MARIONETTE_PORT) $(TEST_DIRS)
endif

###############################################################################
# Utils                                                                       #
###############################################################################

# Lint apps
lint:
	@# ignore lint on:
	@# cubevid
	@# crystalskull
	@# towerjelly
	@gjslint --nojsdoc -r apps -e 'cubevid,crystalskull,towerjelly,email,music/js/ext,calendar/js/ext'

# Generate a text file containing the current changeset of Gaia
# XXX I wonder if this should be a replace-in-file hack. This would let us
#     let us remove the update-offline-manifests target dependancy of the
#     default target.
stamp-commit-hash:
	(if [ -d ./.git ]; then \
	  git log -1 --format="%H%n%at" HEAD > apps/settings/gaia-commit.txt; \
	else \
	  echo 'Unknown Git commit; build date shown here.' > apps/settings/gaia-commit.txt; \
	  date +%s >> apps/settings/gaia-commit.txt; \
	fi)

# Erase all the indexedDB databases on the phone, so apps have to rebuild them.
delete-databases:
	$(ADB) shell rm -r /data/local/indexedDB/*

# Take a screenshot of the device and put it in screenshot.png
screenshot:
	mkdir -p screenshotdata
	$(ADB) pull /dev/graphics/fb0 screenshotdata/fb0
	dd bs=1920 count=800 if=screenshotdata/fb0 of=screenshotdata/fb0b
	ffmpeg -vframes 1 -vcodec rawvideo -f rawvideo -pix_fmt rgb32 -s 480x800 -i screenshotdata/fb0b -f image2 -vcodec png screenshot.png
	rm -rf screenshotdata


# Forward port to use the RIL daemon from the device
forward:
	$(ADB) shell touch /data/local/rilproxyd
	$(ADB) shell killall rilproxy
	$(ADB) forward tcp:6200 localreserved:rilproxyd


# update the manifest.appcache files to match what's actually there
update-offline-manifests:
	for d in `find ${GAIA_APP_SRCDIRS} -mindepth 1 -maxdepth 1 -type d` ;\
	do \
		rm -rf $$d/manifest.appcache ;\
		if [ -f $$d/manifest.webapp ] ;\
		then \
			echo \\t$$d ;  \
			( cd $$d ; \
			echo "CACHE MANIFEST" > manifest.appcache ;\
			cat `find * -type f | sort -nfs` | $(MD5SUM) | cut -f 1 -d ' ' | sed 's/^/\#\ Version\ /' >> manifest.appcache ;\
			find * -type f | grep -v tools | sort >> manifest.appcache ;\
			$(SED_INPLACE_NO_SUFFIX) -e 's|manifest.appcache||g' manifest.appcache ;\
			echo "http://$(GAIA_DOMAIN)$(GAIA_PORT)/webapi.js" >> manifest.appcache ;\
			echo "NETWORK:" >> manifest.appcache ;\
			echo "http://*" >> manifest.appcache ;\
			echo "https://*" >> manifest.appcache ;\
			) ;\
		fi \
	done

# If your gaia/ directory is a sub-directory of the B2G directory, then
# you should use the install-gaia target of the B2G Makefile. But if you're
# working on just gaia itself, and you already have B2G firmware on your
# phone, and you have adb in your path, then you can use the install-gaia
# target to update the gaia files and reboot b2g
PROFILE_PATH = /data/local/
install-gaia: profile
	$(ADB) start-server
	$(ADB) shell rm -r /cache/*
	python build/install-gaia.py "$(ADB)"

	$(ADB) push profile/user.js ${PROFILE_PATH}/user.js

	@echo "Installed gaia into profile/."
	$(ADB) shell kill $(shell $(ADB) shell toolbox ps | grep "b2g" | awk '{ print $$2; }')
	@echo 'Rebooting b2g now'

# Copy demo media to the sdcard.
# If we've got old style directories on the phone, rename them first.
# Note that we'll soon have to rename Pictures back to DCIM.
install-media-samples:
	$(ADB) shell 'if test -d /sdcard/DCIM; then mv /sdcard/DCIM /sdcard/Pictures; fi'
	$(ADB) shell 'if test -d /sdcard/music; then mv /sdcard/music /sdcard/music.temp; mv /sdcard/music.temp /sdcard/Music; fi'
	$(ADB) shell 'if test -d /sdcard/videos; then mv /sdcard/videos /sdcard/Movies;	fi'

	$(ADB) push media-samples/Pictures /sdcard/Pictures
	$(ADB) push media-samples/Movies /sdcard/Movies
	$(ADB) push media-samples/Music /sdcard/Music


demo: install-media-samples install-gaia
