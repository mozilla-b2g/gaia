###############################################################################
# Global configurations                                                       #
#                                                                             #
# GAIA_DOMAIN : change that if you plan to use a different domain to update   #
#               your applications or want to use a local domain               #
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
###############################################################################
GAIA_DOMAIN?=gaiamobile.org

ADB?=adb

DEBUG?=0

REPORTER=Spec


###############################################################################
# The above rules generate the profile/ folder and all its content.           #
# The profile folder content depends on different rules:                      #
#  1. manifests                                                               #
#     A directory structure representing the applications installed using the #
#     Apps API. In Gaia all applications use this method.                     #
#     See https://developer.mozilla.org/en/Apps/Apps_JavaScript_API           #
#                                                                             #
#   2. offline                                                                #
#     An Application Cache database containing Gaia apps, so the phone can be #
###############################################################################
GAIA_DOMAIN?=gaiamobile.org

ADB?=adb

DEBUG?=0

REPORTER=Spec


###############################################################################
# The above rules generate the profile/ folder and all its content.           #
# The profile folder content depends on different rules:                      #
#  1. manifests                                                               #
#     A directory structure representing the applications installed using the #
#     Apps API. In Gaia all applications use this method.                     #
#     See https://developer.mozilla.org/en/Apps/Apps_JavaScript_API           #
#                                                                             #
#   2. offline                                                                #
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
profile: stamp-commit-hash update-offline-manifests preferences manifests offline extensions
	@echo "\nProfile Ready: please run [b2g|firefox] -profile $(CURDIR)/profile"

LANG=POSIX # Avoiding sort order differences between OSes

# Generate profile/webapps/
manifests:
	@echo "Generated webapps"
	@mkdir -p profile/webapps
	@echo { > profile/webapps/webapps.json
	@cd apps; \
	for d in `find * -maxdepth 0 -type d` ;\
	do \
	  if [ -f $$d/manifest.json ]; \
		then \
		  mkdir -p ../profile/webapps/$$d; \
		  cp $$d/manifest.json ../profile/webapps/$$d  ;\
                  (\
			echo \"$$d\": { ;\
			echo \"origin\": \"http://$$d.$(GAIA_DOMAIN)$(GAIA_PORT)\", ;\
			echo \"installOrigin\": \"http://$$d.$(GAIA_DOMAIN)$(GAIA_PORT)\", ;\
			echo \"receipt\": null, ;\
			echo \"installTime\": 132333986000 ;\
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
	$(XULRUNNER) $(XPCSHELL) -e 'const GAIA_DIR = "$(CURDIR)"; const PROFILE_DIR = "$(CURDIR)/profile"; const GAIA_DOMAIN = "$(GAIA_DOMAIN)$(GAIA_PORT)"' build/offline-cache.js
	@echo "Done"
endif


# The install-xulrunner target arranges to get xulrunner downloaded and sets up
# some commands for invoking it. But it is platform dependent
ifeq ($(SYS),Darwin)
# We're on a mac
XULRUNNER_DOWNLOAD=http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/11.0/sdk/xulrunner-11.0.en-US.mac-x86_64.sdk.tar.bz2
XULRUNNER=./xulrunner-sdk/bin/run-mozilla.sh
XPCSHELL=./xulrunner-sdk/bin/xpcshell

install-xulrunner:
	test -d xulrunner-sdk || ($(DOWNLOAD_CMD) $(XULRUNNER_DOWNLOAD) && tar xjf xulrunner*.tar.bz2 && rm xulrunner*.tar.bz2)

else
# Not a mac: assume linux
# Linux only!
# downloads and installs locally xulrunner to run the xpchsell
# script that creates the offline cache
XULRUNNER_DOWNLOAD=http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/11.0/runtimes/xulrunner-11.0.en-US.linux-i686.tar.bz2
XULRUNNER=./xulrunner/run-mozilla.sh
XPCSHELL=./xulrunner/xpcshell

install-xulrunner :
	test -d xulrunner || ($(DOWNLOAD_CMD) $(XULRUNNER_DOWNLOAD) && tar xjf xulrunner*.tar.bz2 && rm xulrunner*.tar.bz2)
endif

# Generate profile/prefs.js
preferences: install-xulrunner
	@echo "Generating prefs.js..."
	@mkdir -p profile
	$(XULRUNNER) $(XPCSHELL) -e 'const GAIA_DIR = "$(CURDIR)"; const PROFILE_DIR = "$(CURDIR)/profile"; const GAIA_DOMAIN = "$(GAIA_DOMAIN)$(GAIA_PORT)"; const DEBUG = $(DEBUG)' build/preferences.js
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
tests: manifests offline
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


# Generate a text file containing the current changeset of Gaia
# XXX I wonder if this should be a replace-in-file hack. This would let us
#     let us remove the update-offline-manifests target dependancy of the
#     default target.
stamp-commit-hash:
	git log -1 --format="%H%n%at" HEAD > apps/settings/gaia-commit.txt


# Erase all the indexedDB databases on the phone, so apps have to rebuild them.
delete-databases:
	$(ADB) shell rm -r /data/b2g/mozilla/*.default/indexedDB/*


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
	@cd apps; \
	for d in `find * -maxdepth 0 -type d` ;\
	do \
		if [ -f $$d/manifest.json ] ;\
		then \
			echo \\t$$d ;\
			cd $$d ;\
			echo "CACHE MANIFEST" > manifest.appcache ;\
			cat `find * -type f | sort -nfs` | $(MD5SUM) | cut -f 1 -d ' ' | sed 's/^/\#\ Version\ /' >> manifest.appcache ;\
			find * -type f | grep -v tools | sort >> manifest.appcache ;\
			$(SED_INPLACE_NO_SUFFIX) -e 's|manifest.appcache||g' manifest.appcache ;\
			echo "http://$(GAIA_DOMAIN)$(GAIA_PORT)/webapi.js" >> manifest.appcache ;\
			echo "NETWORK:" >> manifest.appcache ;\
			echo "http://*" >> manifest.appcache ;\
			echo "https://*" >> manifest.appcache ;\
			cd .. ;\
		fi \
	done

# If your gaia/ directory is a sub-directory of the B2G directory, then
# you should use the install-gaia target of the B2G Makefile. But if you're
# working on just gaia itself, and you already have B2G firmware on your
# phone, and you have adb in your path, then you can use the install-gaia
# target to update the gaia files and reboot b2g
PROFILE_PATH = /data/b2g/mozilla/`$(ADB) shell ls -1 /data/b2g/mozilla/ | grep default | tr -d [:cntrl:]`
install-gaia: profile
	$(ADB) start-server
	$(ADB) shell rm -r /cache/*
	python build/install-gaia.py "$(ADB)"

	# Until bug 746121 lands, push user.js in the profile
	$(ADB) push profile/user.js ${PROFILE_PATH}/user.js

	@echo "Installed gaia into profile/."
	$(ADB) shell kill $(shell $(ADB) shell toolbox ps | grep "b2g" | awk '{ print $$2; }')
	@echo 'Rebooting b2g now'

