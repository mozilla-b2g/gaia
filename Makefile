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

# Headless bot does not need the full output of wget
# and it can cause crashes in bot.io option is here so
# -nv can be passed and turn off verbose output.
WGET_OPTS?=
GAIA_DOMAIN?=gaiamobile.org

DEBUG?=0
PRODUCTION?=0

LOCAL_DOMAINS?=1

ADB?=adb

ifeq ($(DEBUG),1)
SCHEME=http://
else
SCHEME=app://
endif

HOMESCREEN?=$(SCHEME)system.$(GAIA_DOMAIN)

BUILD_APP_NAME?=*

REPORTER?=Spec

GAIA_APP_SRCDIRS?=apps test_apps showcase_apps
GAIA_INSTALL_PARENT?=/data/local
ADB_REMOUNT?=0

GAIA_ALL_APP_SRCDIRS=$(GAIA_APP_SRCDIRS)

GAIA_LOCALES_PATH?=locales

ifeq ($(MAKECMDGOALS), demo)
GAIA_DOMAIN=thisdomaindoesnotexist.org
GAIA_APP_SRCDIRS=apps showcase_apps
else ifeq ($(MAKECMDGOALS), production)
PRODUCTION=1
endif

# PRODUCTION is also set for user and userdebug B2G builds
ifeq ($(PRODUCTION), 1)
GAIA_APP_SRCDIRS=apps
GAIA_INSTALL_PARENT=/system/b2g
ADB_REMOUNT=1
endif

ifneq ($(GAIA_OUTOFTREE_APP_SRCDIRS),)
  $(shell mkdir -p outoftree_apps \
    $(foreach dir,$(GAIA_OUTOFTREE_APP_SRCDIRS),\
      $(foreach appdir,$(wildcard $(dir)/*),\
        && ln -sf $(appdir) outoftree_apps/)))
  GAIA_APP_SRCDIRS += outoftree_apps
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

# Force bash for all shell commands since we depend on bash-specific syntax
SHELL := /bin/bash

# what OS are we on?
SYS=$(shell uname -s)
ARCH?=$(shell uname -m)
ifeq (${SYS}/${ARCH},Darwin/i386)
ARCH=x86_64
endif
SEP=/
ifneq (,$(findstring MINGW32_,$(SYS)))
CURDIR:=$(shell pwd -W | sed -e 's|/|\\\\|g')
SEP=\\
endif

ifeq ($(SYS),Darwin)
MD5SUM = md5 -r
SED_INPLACE_NO_SUFFIX = /usr/bin/sed -i ''
DOWNLOAD_CMD = /usr/bin/curl -O
else
MD5SUM = md5sum -b
SED_INPLACE_NO_SUFFIX = sed -i
DOWNLOAD_CMD = wget $(WGET_OPTS)
endif

# Test agent setup
TEST_COMMON=test_apps/test-agent/common
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

# Settings database setup
DB_TARGET_PATH = /data/local/indexedDB
DB_SOURCE_PATH = profile/indexedDB/chrome

# Generate profile/
profile: applications-data preferences permissions app-makefiles test-agent-config offline extensions install-xulrunner-sdk
	@if [ ! -f $(DB_SOURCE_PATH)/2588645841ssegtnti.sqlite ]; \
	then \
	  echo "Settings DB does not exists, creating an initial one:"; \
	  $(call run-js-command, settings); \
	fi ;

	@echo "Profile Ready: please run [b2g|firefox] -profile $(CURDIR)$(SEP)profile"

LANG=POSIX # Avoiding sort order differences between OSes

app-makefiles:
	for d in ${GAIA_APP_SRCDIRS}; \
	do \
		for mfile in `find $$d -mindepth 2 -maxdepth 2 -name "Makefile"` ;\
		do \
			make -C `dirname $$mfile`; \
		done; \
	done;

# Generate profile/webapps/
# We duplicate manifest.webapp to manifest.webapp and manifest.json
# to accommodate Gecko builds without bug 757613. Should be removed someday.
webapp-manifests: install-xulrunner-sdk
	@echo "Generated webapps"
	@mkdir -p profile/webapps
	@$(call run-js-command, webapp-manifests)
	@cat profile/webapps/webapps.json
	@echo "Done"

# Generate profile/webapps/APP/application.zip
webapp-zip: stamp-commit-hash install-xulrunner-sdk
ifneq ($(DEBUG),1)
	@echo "Packaged webapps"
	@rm -rf apps/system/camera
	@cp -r apps/camera apps/system/camera
	@rm apps/system/camera/manifest.webapp
	@mkdir -p profile/webapps
	@$(call run-js-command, webapp-zip)
	@echo "Done"
endif

# Create webapps
offline: webapp-manifests webapp-zip


# The install-xulrunner target arranges to get xulrunner downloaded and sets up
# some commands for invoking it. But it is platform dependent
XULRUNNER_SDK_URL=http://ftp.mozilla.org/pub/mozilla.org/xulrunner/nightly/2012/08/2012-08-07-03-05-18-mozilla-central/xulrunner-17.0a1.en-US.

ifeq ($(SYS),Darwin)
# For mac we have the xulrunner-sdk so check for this directory
# We're on a mac
XULRUNNER_MAC_SDK_URL=$(XULRUNNER_SDK_URL)mac-
ifeq ($(ARCH),i386)
# 32-bit
XULRUNNER_SDK_DOWNLOAD=$(XULRUNNER_MAC_SDK_URL)i386.sdk.tar.bz2
else
# 64-bit
XULRUNNER_SDK_DOWNLOAD=$(XULRUNNER_MAC_SDK_URL)x86_64.sdk.tar.bz2
endif
XULRUNNERSDK=./xulrunner-sdk/bin/run-mozilla.sh
XPCSHELLSDK=./xulrunner-sdk/bin/xpcshell

else ifeq ($(findstring MINGW32,$(SYS)), MINGW32)
# For windows we only have one binary
XULRUNNER_SDK_DOWNLOAD=$(XULRUNNER_SDK_URL)win32.sdk.zip
XULRUNNERSDK=
XPCSHELLSDK=./xulrunner-sdk/bin/xpcshell

else
# Otherwise, assume linux
# downloads and installs locally xulrunner to run the xpchsell
# script that creates the offline cache
XULRUNNER_LINUX_SDK_URL=$(XULRUNNER_SDK_URL)linux-
ifeq ($(ARCH),x86_64)
XULRUNNER_SDK_DOWNLOAD=$(XULRUNNER_LINUX_SDK_URL)x86_64.sdk.tar.bz2
else
XULRUNNER_SDK_DOWNLOAD=$(XULRUNNER_LINUX_SDK_URL)i686.sdk.tar.bz2
endif
XULRUNNERSDK=./xulrunner-sdk/bin/run-mozilla.sh
XPCSHELLSDK=./xulrunner-sdk/bin/xpcshell
endif

.PHONY: install-xulrunner-sdk
install-xulrunner-sdk:
ifndef USE_LOCAL_XULRUNNER_SDK
ifneq ($(XULRUNNER_SDK_DOWNLOAD),$(shell cat .xulrunner-url 2> /dev/null))
	rm -rf xulrunner-sdk
	$(DOWNLOAD_CMD) $(XULRUNNER_SDK_DOWNLOAD)
ifeq ($(findstring MINGW32,$(SYS)), MINGW32)
	unzip xulrunner*.zip && rm xulrunner*.zip
else
	tar xjf xulrunner*.tar.bz2 && rm xulrunner*.tar.bz2
endif
	@echo $(XULRUNNER_SDK_DOWNLOAD) > .xulrunner-url
endif
endif # USE_LOCAL_XULRUNNER_SDK

define run-js-command
	echo "run-js-command $1";                                                   \
	JS_CONSTS='                                                                 \
	const GAIA_DIR = "$(CURDIR)"; const PROFILE_DIR = "$(CURDIR)$(SEP)profile"; \
	const GAIA_SCHEME = "$(SCHEME)"; const GAIA_DOMAIN = "$(GAIA_DOMAIN)";      \
	const DEBUG = $(DEBUG); const LOCAL_DOMAINS = $(LOCAL_DOMAINS);             \
	const HOMESCREEN = "$(HOMESCREEN)"; const GAIA_PORT = "$(GAIA_PORT)";       \
	const GAIA_APP_SRCDIRS = "$(GAIA_APP_SRCDIRS)";                             \
	const GAIA_LOCALES_PATH = "$(GAIA_LOCALES_PATH)";                           \
	const BUILD_APP_NAME = "$(BUILD_APP_NAME)";                                 \
	const GAIA_ENGINE = "xpcshell";                                             \
	';                                                                          \
	$(XULRUNNERSDK) $(XPCSHELLSDK) -e "$$JS_CONSTS" -f build/utils.js "build/$(strip $1).js"
endef

settingsdb: install-xulrunner-sdk
	@echo "B2G pre-populate settings DB."
	@$(call run-js-command, settings)

.PHONY: install-settingsdb
install-settingsdb: settingsdb install-xulrunner-sdk
	$(ADB) start-server
	@echo 'Stoping b2g'
	$(ADB) shell stop b2g
	$(ADB) push $(DB_SOURCE_PATH)/2588645841ssegtnti ${DB_TARGET_PATH}/chrome/2588645841ssegtnti
	$(ADB) push $(DB_SOURCE_PATH)/2588645841ssegtnti.sqlite ${DB_TARGET_PATH}/chrome/2588645841ssegtnti.sqlite
	@echo 'Starting b2g'
	$(ADB) shell start b2g
	@echo 'Rebooting b2g now. '

# Generate profile/prefs.js
preferences: install-xulrunner-sdk
	@echo "Generating prefs.js..."
	test -d profile || mkdir -p profile
	@$(call run-js-command, preferences)
	if [ -f custom-prefs.js ]; \
	  then \
	    cat custom-prefs.js >> profile/user.js; \
	  fi
	@echo "Done"


# Generate profile/permissions.sqlite
permissions: webapp-manifests install-xulrunner-sdk
	@echo "Generating permissions.sqlite..."
	test -d profile || mkdir -p profile
	@$(call run-js-command, permissions)
	@echo "Done. If this results in an error remove the xulrunner/xulrunner-sdk folder in your gaia folder."

# Generate profile/
applications-data: install-xulrunner-sdk
	@echo "Generating application data..."
	test -d profile || mkdir -p profile
	@$(call run-js-command, applications-data)
	@echo "Done. If this results in an error remove the xulrunner/xulrunner-sdk folder in your gaia folder."

# Generate profile/extensions
EXT_DIR=profile/extensions
extensions:
	@echo "Generating extensions..."
	@mkdir -p profile
	@rm -rf $(EXT_DIR)
ifeq ($(DEBUG),1)
	cp -r tools/extensions $(EXT_DIR)
endif
	@echo "Done"



###############################################################################
# Tests                                                                       #
###############################################################################

MOZ_TESTS = "$(MOZ_OBJDIR)/_tests/testing/mochitest"
INJECTED_GAIA = "$(MOZ_TESTS)/browser/gaia"

TEST_PATH=gaia/tests/${TEST_FILE}

TESTS := $(shell find apps -name "*_test.js" -type f | grep integration)
.PHONY: test-integration
test-integration:
	@test_apps/test-agent/common/test/bin/test $(TESTS)

.PHONY: tests
tests: webapp-manifests offline
	echo "Checking if the mozilla build has tests enabled..."
	test -d $(MOZ_TESTS) || (echo "Please ensure you don't have |ac_add_options --disable-tests| in your mozconfig." && exit 1)
	echo "Checking the injected Gaia..."
	test -L $(INJECTED_GAIA) || ln -s $(CURDIR) $(INJECTED_GAIA)
	TEST_PATH=$(TEST_PATH) make -C $(MOZ_OBJDIR) mochitest-browser-chrome EXTRA_TEST_ARGS="--browser-arg=\"\" --extra-profile-file=$(CURDIR)/profile/webapps --extra-profile-file=$(CURDIR)/profile/user.js"

.PHONY: common-install
common-install:
	@test -x $(NODEJS) || (echo "Please Install NodeJS -- (use aptitude on linux or homebrew on osx)" && exit 1 )
	@test -x $(NPM) || (echo "Please install NPM (node package manager) -- http://npmjs.org/" && exit 1 )

	cd $(TEST_AGENT_DIR) && npm install .

.PHONY: update-common
update-common: common-install
	mkdir -p $(TEST_COMMON)/vendor/test-agent/
	mkdir -p $(TEST_COMMON)/vendor/marionette-client/
	mkdir -p $(TEST_COMMON)/vendor/chai/
	rm -Rf tools/xpcwindow
	rm -f $(TEST_COMMON)/vendor/test-agent/test-agent*.js
	rm -f $(TEST_COMMON)/vendor/marionette-client/*.js
	rm -f $(TEST_COMMON)/vendor/chai/*.js
	cp -R $(TEST_AGENT_DIR)/node_modules/xpcwindow tools/xpcwindow
	rm -R tools/xpcwindow/vendor/

	cp $(TEST_AGENT_DIR)/node_modules/test-agent/test-agent.js $(TEST_COMMON)/vendor/test-agent/
	cp $(TEST_AGENT_DIR)/node_modules/test-agent/test-agent.css $(TEST_COMMON)/vendor/test-agent/
	cp $(TEST_AGENT_DIR)/node_modules/marionette-client/marionette.js $(TEST_COMMON)/vendor/marionette-client/
	cp $(TEST_AGENT_DIR)/node_modules/chai/chai.js $(TEST_COMMON)/vendor/chai/

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
	for d in `find -L ${GAIA_APP_SRCDIRS} -mindepth 1 -maxdepth 1 -type d` ;\
	do \
		  mkdir -p $$d/test/unit ; \
		  mkdir -p $$d/test/integration ; \
			cp -f $(TEST_COMMON)/test/boilerplate/_proxy.html $$d/test/unit/_proxy.html; \
			cp -f $(TEST_COMMON)/test/boilerplate/_sandbox.html $$d/test/unit/_sandbox.html; \
	done
	@echo "Done bootstrapping test proxies/sandboxes";

# Temp make file method until we can switch
# over everything in test
ifneq ($(strip $(APP)),)
APP_TEST_LIST=$(shell find apps/$(APP)/test/unit -name '*_test.js')
endif
.PHONY: test-agent-test
test-agent-test:
ifneq ($(strip $(APP)),)
	@echo 'Running tests for $(APP)';
	@$(TEST_AGENT_DIR)/node_modules/test-agent/bin/js-test-agent test --reporter $(REPORTER) $(APP_TEST_LIST)
else
	@echo 'Running all tests';
	@$(TEST_AGENT_DIR)/node_modules/test-agent/bin/js-test-agent test --reporter $(REPORTER)
endif

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
	@gjslint --nojsdoc -r apps -e 'sms/js/ext,pdfjs/content,pdfjs/test,email/js/ext,music/js/ext,calendar/js/ext'
	@gjslint --nojsdoc -r shared/js

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
	@echo 'Stoping b2g'
	$(ADB) shell stop b2g
	$(ADB) shell rm -r /data/local/indexedDB/*
	@echo 'Starting b2g'
	$(ADB) shell start b2g

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
	for d in `find -L ${GAIA_APP_SRCDIRS} -mindepth 1 -maxdepth 1 -type d` ;\
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
TARGET_FOLDER = webapps/$(BUILD_APP_NAME).$(GAIA_DOMAIN)
install-gaia: profile
	$(ADB) start-server
	@echo 'Stoping b2g'
	$(ADB) shell stop b2g
	$(ADB) shell rm -r /cache/*

ifeq ($(ADB_REMOUNT),1)
	$(ADB) remount
endif

ifeq ($(BUILD_APP_NAME),*)
	python build/install-gaia.py "$(ADB)" "$(GAIA_INSTALL_PARENT)"
else
	$(ADB) push profile/$(TARGET_FOLDER)/manifest.webapp $(GAIA_INSTALL_PARENT)/$(TARGET_FOLDER)/manifest.webapp
	$(ADB) push profile/$(TARGET_FOLDER)/application.zip $(GAIA_INSTALL_PARENT)/$(TARGET_FOLDER)/application.zip
endif
	@echo "Installed gaia into profile/."
	@echo 'Starting b2g'
	$(ADB) shell start b2g

# Copy demo media to the sdcard.
# If we've got old style directories on the phone, rename them first.
install-media-samples:
	$(ADB) shell 'if test -d /sdcard/Pictures; then mv /sdcard/Pictures /sdcard/DCIM; fi'
	$(ADB) shell 'if test -d /sdcard/music; then mv /sdcard/music /sdcard/music.temp; mv /sdcard/music.temp /sdcard/Music; fi'
	$(ADB) shell 'if test -d /sdcard/videos; then mv /sdcard/videos /sdcard/Movies;	fi'

	$(ADB) push media-samples/DCIM /sdcard/DCIM
	$(ADB) push media-samples/Movies /sdcard/Movies
	$(ADB) push media-samples/Music /sdcard/Music

install-test-media:
	$(ADB) push test_media/DCIM /sdcard/DCIM
	$(ADB) push test_media/Movies /sdcard/Movies
	$(ADB) push test_media/Music /sdcard/Music

dialer-demo:
	@cp -R apps/contacts apps/dialer
	@rm apps/dialer/contacts/manifest*
	@mv apps/dialer/contacts/index.html apps/dialer/contacts/contacts.html
	@sed -i.bak 's/manifest.appcache/..\/manifest.appcache/g' apps/dialer/contacts/contacts.html
	@find apps/dialer/ -name '*.bak' -exec rm {} \;

demo: install-media-samples install-gaia

production: install-gaia

# Remove everything and install a clean profile
reset-gaia: purge install-settingsdb install-gaia

# remove the memories and apps on the phone
purge:
	$(ADB) shell stop b2g
	$(ADB) shell rm -r /data/local/*
	$(ADB) shell mkdir -p /data/local/tmp
	$(ADB) shell rm -r /cache/*
	$(ADB) shell rm -r /data/b2g/*
	$(ADB) shell rm -r $(GAIA_INSTALL_PARENT)/webapps

# clean out build products
clean:
	rm -rf profile xulrunner-sdk .xulrunner-url
