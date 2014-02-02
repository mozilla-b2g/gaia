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
# MOZPERFOUT  : File path to output mozperf data. Empty mean stdout.          #
#                                                                             #
# MARIONETTE_RUNNER_HOST : The Marionnette runner host.                       #
#                          Current values can be 'marionette-b2gdesktop-host' #
#                          and 'marionette-device-host'                       #
#                                                                             #
# COVERAGE    : Add blanket testing coverage report to use for test output.   #
#                                                                             #
# GAIA_APP_CONFIG : The app.list file representing applications to include in #
#                   Gaia                                                      #
#                                                                             #
###############################################################################
#                                                                             #
# Lint your code                                                              #
#                                                                             #
# use "make hint" and "make gjslint" to lint using respectively jshint and    #
# gjslint.                                                                    #
#                                                                             #
# Use "make lint" to lint using gjslint for blacklisted files, and jshint for #
# other files.                                                                #
#                                                                             #
# APP=<app name> will hint/lint only this app.                                #
# LINTED_FILES=<list of files> will (h/l)int only these space-separated files #
# JSHINTRC=<path> will use this config file when running jshint               #
#                                                                             #
###############################################################################
#                                                                             #
# XULrunner download and location configuration                               #
#                                                                             #
# USE_LOCAL_XULRUNNER_SDK  : if you have a local XULrunner installation and   #
#                            wants to use it                                  #
#                                                                             #
# XULRUNNER_DIRECTORY      : if you use USE_LOCAL_XULRUNNER_SDK, this is      #
#                            where your local XULrunner installation is       #
#                                                                             #
# XULRUNNER_BASE_DIRECTORY : if you don't use USE_LOCAL_XULRUNNER_SDK, this   #
#                            is where you want the automatic XULrunner        #
#                            download to uncompress.                          #
#                                                                             #
# Submakes will get XULRUNNER_DIRECTORY, XULRUNNERSDK and XPCSHELLSDK as      #
# absolute paths.                                                             #
#                                                                             #
###############################################################################

-include local.mk

# .b2g.mk recorded the make flags from Android.mk
# This ensures |./flash.sh gaia| follows |./build.sh gaia| will pick up the same
# flags.
-include .b2g.mk

# Headless bot does not need the full output of wget
# and it can cause crashes in bot.io option is here so
# -nv can be passed and turn off verbose output.
WGET_OPTS?=-c
GAIA_DOMAIN?=gaiamobile.org

DEBUG?=0
DEVICE_DEBUG?=0
NO_LOCK_SCREEN?=0
PRODUCTION?=0
DESKTOP_SHIMS?=0
GAIA_OPTIMIZE?=0
GAIA_DEV_PIXELS_PER_PX?=1
DOGFOOD?=0
ROCKETBAR?=1
TEST_AGENT_PORT?=8789
GAIA_APP_TARGET?=engineering

# Flag to ease build a simulator-compatible profile
SIMULATOR?=0
ifeq ($(SIMULATOR),1)
DESKTOP=1
NOFTU=1
DEVICE_DEBUG=1
endif

# Enable compatibility to run in Firefox Desktop
DESKTOP?=$(DEBUG)
# Disable first time experience screen
NOFTU?=0
# Automatically enable remote debugger
REMOTE_DEBUGGER?=0

ifeq ($(DEVICE_DEBUG),1)
REMOTE_DEBUGGER=1
NO_LOCK_SCREEN=1
endif

# We also disable FTU when running in Firefox or in debug mode
ifeq ($(DEBUG),1)
NOFTU=1
PROFILE_FOLDER?=profile-debug
else ifeq ($(DESKTOP),1)
NOFTU=1
PROFILE_FOLDER?=profile-debug
else ifeq ($(MAKECMDGOALS),test-integration)
PROFILE_FOLDER?=profile-test
endif

PROFILE_FOLDER?=profile

STAGE_FOLDER?=build_stage
export STAGE_FOLDER

LOCAL_DOMAINS?=1

ADB?=adb

ifeq ($(DEBUG),1)
SCHEME=http://
else
SCHEME=app://
endif

HOMESCREEN?=$(SCHEME)system.$(GAIA_DOMAIN)

BUILD_APP_NAME?=*
TEST_INTEGRATION_APP_NAME?=*
ifneq ($(APP),)
	ifeq ($(MAKECMDGOALS), test-integration)
	TEST_INTEGRATION_APP_NAME=$(APP)
	else
	BUILD_APP_NAME=$(APP)
	endif
endif

REPORTER?=spec
NPM_REGISTRY?=http://registry.npmjs.org
# Ensure that NPM only logs warnings and errors
export npm_config_loglevel=warn
MARIONETTE_RUNNER_HOST?=marionette-b2gdesktop-host
TEST_MANIFEST?=./shared/test/integration/travis-manifest.json
MOZPERFOUT?=""

GAIA_INSTALL_PARENT?=/system/b2g

ifeq ($(MAKECMDGOALS), demo)
GAIA_DOMAIN=thisdomaindoesnotexist.org
GAIA_APP_TARGET=demo
else ifeq ($(MAKECMDGOALS), dogfood)
DOGFOOD=1
else ifeq ($(MAKECMDGOALS), production)
PRODUCTION=1
endif

ifeq ($(DOGFOOD), 1)
PRODUCTION=1
endif

# PRODUCTION is also set for user and userdebug B2G builds
ifeq ($(PRODUCTION), 1)
GAIA_OPTIMIZE=1
GAIA_APP_TARGET=production
endif

ifeq ($(DOGFOOD), 1)
GAIA_APP_TARGET=dogfood
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
MSYS_FIX=
ifeq (${SYS}/${ARCH},Darwin/i386)
ARCH=x86_64
endif
SEP=/
SEP_FOR_SED=/
ifneq (,$(findstring MINGW32_,$(SYS)))
CURDIR:=$(shell pwd -W | sed -e 's|/|\\\\|g')
SEP=\\
SEP_FOR_SED=\\\\
BUILDDIR := file:///$(shell pwd -W)/build/
# Mingw mangle path and append c:\mozilla-build\msys\data in front of paths
MSYS_FIX=/
else
BUILDDIR := file://$(CURDIR)/build/
endif

ifndef GAIA_APP_CONFIG
GAIA_APP_CONFIG=build$(SEP)config$(SEP)apps-$(GAIA_APP_TARGET).list
endif

ifndef GAIA_DISTRIBUTION_DIR
  GAIA_DISTRIBUTION_DIR := $(CURDIR)$(SEP)distribution
else
	ifneq (,$(findstring MINGW32_,$(SYS)))
		GAIA_DISTRIBUTION_DIR := $(shell pushd $(GAIA_DISTRIBUTION_DIR) > /dev/null; \
			pwd -W | sed 's|/|\\\\|g'; popd > /dev/null;)
	else
		GAIA_DISTRIBUTION_DIR := $(realpath $(GAIA_DISTRIBUTION_DIR))
	endif
endif
export GAIA_DISTRIBUTION_DIR

SETTINGS_PATH := build/config/custom-settings.json
ifdef GAIA_DISTRIBUTION_DIR
	DISTRIBUTION_SETTINGS := $(GAIA_DISTRIBUTION_DIR)$(SEP)settings.json
	DISTRIBUTION_CONTACTS := $(GAIA_DISTRIBUTION_DIR)$(SEP)contacts.json
	DISTRIBUTION_APP_CONFIG := $(GAIA_DISTRIBUTION_DIR)$(SEP)apps.list
	DISTRIBUTION_VARIANT := $(GAIA_DISTRIBUTION_DIR)$(SEP)variant.json
	ifneq ($(wildcard $(DISTRIBUTION_SETTINGS)),)
		SETTINGS_PATH := $(DISTRIBUTION_SETTINGS)
	endif
	ifneq ($(wildcard $(DISTRIBUTION_CONTACTS)),)
		CONTACTS_PATH := $(DISTRIBUTION_CONTACTS)
	endif
	ifneq ($(wildcard $(DISTRIBUTION_APP_CONFIG)),)
		GAIA_APP_CONFIG := $(DISTRIBUTION_APP_CONFIG)
	endif
	ifneq ($(wildcard $(DISTRIBUTION_VARIANT)),)
		VARIANT_PATH := $(DISTRIBUTION_VARIANT)
	endif
endif

# Read the file specified in $GAIA_APP_CONFIG and turn them into $GAIA_APPDIRS,
# i.e., absolute path of each app.
# Path ending in wildcard (*) will be expanded, non-absolute path in the list will be matched against
# $GAIA_DISTRIBUTION_DIR and $GAIA_DIR.
# See MDN for more information.
#
# explain shell magic here:
# "$${LINE\#$${LINE%?}}": get last character
# sed 's/.\{2\}$$//': remove last two character

ifdef GAIA_APP_SRCDIRS
$(shell printf "`echo $(GAIA_APP_SRCDIRS) | sed 's| |/*\\\n|g'`/*\n" > /tmp/gaia-apps-temp.list)
GAIA_APP_CONFIG := /tmp/gaia-apps-temp.list
$(warning GAIA_APP_SRCDIRS is deprecated, please use GAIA_APP_CONFIG)
endif

GAIA_APPDIRS=$(shell while read LINE; do \
	if [ "$${LINE\#$${LINE%?}}" = "*" ]; then \
		srcdir="`echo "$$LINE" | sed 's/.\{2\}$$//'`"; \
		[ -d $(CURDIR)$(SEP)$$srcdir ] && find -L $(CURDIR)$(SEP)$$srcdir -mindepth 1 -maxdepth 1 -type d | sed 's@[/\\]@$(SEP_FOR_SED)@g'; \
		[ -d $(GAIA_DISTRIBUTION_DIR)$(SEP)$$srcdir ] && find -L $(GAIA_DISTRIBUTION_DIR)$(SEP)$$srcdir -mindepth 1 -maxdepth 1 -type d | sed 's@[/\\]@$(SEP_FOR_SED)@g'; \
	else \
    if [ -d "$(GAIA_DISTRIBUTION_DIR)$(SEP)$$LINE" ]; then \
      echo "$(GAIA_DISTRIBUTION_DIR)$(SEP)$$LINE" | sed 's@[/\\]@$(SEP_FOR_SED)@g'; \
    elif [ -d "$(CURDIR)$(SEP)$$LINE" ]; then \
		  echo "$(CURDIR)$(SEP)$$LINE" | sed 's@[/\\]@$(SEP_FOR_SED)@g'; \
    elif [ -d "$$LINE" ]; then \
      echo "$$LINE" | sed 's@[/\\]@$(SEP_FOR_SED)@g'; \
    fi \
	fi \
done < $(GAIA_APP_CONFIG))

ifneq ($(GAIA_OUTOFTREE_APP_SRCDIRS),)
  $(shell mkdir -p outoftree_apps \
    $(foreach dir,$(GAIA_OUTOFTREE_APP_SRCDIRS),\
      $(foreach appdir,$(wildcard $(dir)/*),\
        && ln -sf $(appdir) outoftree_apps/)))
endif

GAIA_LOCALES_PATH?=locales
LOCALES_FILE?=shared/resources/languages.json
GAIA_LOCALE_SRCDIRS=$(CURDIR)$(SEP)shared $(GAIA_APPDIRS)
GAIA_DEFAULT_LOCALE?=en-US
GAIA_INLINE_LOCALES?=1
GAIA_CONCAT_LOCALES?=1

# This variable is for customizing the keyboard layouts in a build.
GAIA_KEYBOARD_LAYOUTS?=en,pt-BR,es,de,fr,pl,zh-Hans-Pinyin

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

define BUILD_CONFIG
{ \
	"ADB" : "$(adb)", \
	"GAIA_DIR" : "$(CURDIR)", \
	"PROFILE_DIR" : "$(CURDIR)$(SEP)$(PROFILE_FOLDER)", \
	"PROFILE_FOLDER" : "$(PROFILE_FOLDER)", \
	"GAIA_SCHEME" : "$(SCHEME)", \
	"GAIA_DOMAIN" : "$(GAIA_DOMAIN)", \
	"DEBUG" : $(DEBUG), \
	"LOCAL_DOMAINS" : $(LOCAL_DOMAINS), \
	"DESKTOP" : $(DESKTOP), \
	"DEVICE_DEBUG" : $(DEVICE_DEBUG), \
	"NO_LOCK_SCREEN" : $(NO_LOCK_SCREEN), \
	"HOMESCREEN" : "$(HOMESCREEN)", \
	"GAIA_PORT" : "$(GAIA_PORT)", \
	"GAIA_LOCALES_PATH" : "$(GAIA_LOCALES_PATH)", \
	"GAIA_INSTALL_PARENT" : "$(GAIA_INSTALL_PARENT)", \
	"LOCALES_FILE" : "$(subst \,\\,$(LOCALES_FILE))", \
	"GAIA_KEYBOARD_LAYOUTS" : "$(GAIA_KEYBOARD_LAYOUTS)", \
	"LOCALE_BASEDIR" : "$(subst \,\\,$(LOCALE_BASEDIR))", \
	"BUILD_APP_NAME" : "$(BUILD_APP_NAME)", \
	"PRODUCTION" : "$(PRODUCTION)", \
	"GAIA_OPTIMIZE" : "$(GAIA_OPTIMIZE)", \
	"GAIA_DEV_PIXELS_PER_PX" : "$(GAIA_DEV_PIXELS_PER_PX)", \
	"DOGFOOD" : "$(DOGFOOD)", \
	"OFFICIAL" : "$(MOZILLA_OFFICIAL)", \
	"GAIA_DEFAULT_LOCALE" : "$(GAIA_DEFAULT_LOCALE)", \
	"GAIA_INLINE_LOCALES" : "$(GAIA_INLINE_LOCALES)", \
	"GAIA_CONCAT_LOCALES" : "$(GAIA_CONCAT_LOCALES)", \
	"GAIA_ENGINE" : "xpcshell", \
	"GAIA_DISTRIBUTION_DIR" : "$(GAIA_DISTRIBUTION_DIR)", \
	"GAIA_APPDIRS" : "$(GAIA_APPDIRS)", \
	"NOFTU" : "$(NOFTU)", \
	"REMOTE_DEBUGGER" : "$(REMOTE_DEBUGGER)", \
	"ROCKETBAR" : $(ROCKETBAR), \
	"TARGET_BUILD_VARIANT" : "$(TARGET_BUILD_VARIANT)", \
	"SETTINGS_PATH" : "$(SETTINGS_PATH)", \
	"VARIANT_PATH" : "$(VARIANT_PATH)" \
}
endef
export BUILD_CONFIG

define run-build-test
	./node_modules/.bin/mocha \
		--harmony \
		--reporter spec \
		--ui tdd \
		--timeout 0 \
		$(strip $1)
endef

# Generate profile/

$(PROFILE_FOLDER): preferences local-apps app-makefiles test-agent-config offline contacts extensions install-xulrunner-sdk .git/hooks/pre-commit $(PROFILE_FOLDER)/settings.json create-default-data $(PROFILE_FOLDER)/installed-extensions.json
ifeq ($(BUILD_APP_NAME),*)
	@echo "Profile Ready: please run [b2g|firefox] -profile $(CURDIR)$(SEP)$(PROFILE_FOLDER)"
endif


LANG=POSIX # Avoiding sort order differences between OSes

.PHONY: app-makefiles
# Applications may want to perform their own build steps.  (For example, the
# clock and e-mail apps use r.js to perform optimization steps.)  These steps
# may produce the following output consumed by other tooling:
# - build_stage/APPNAME/*: This is where the build output goes.
#   build/webapp-zip.js knows about this directory.
# - build_stage/APPNAME/gaia_shared.json: This file lists shared resource
#   dependencies that build/webapp-zip.js's detection logic might not determine
#   because of lazy loading, etc.
app-makefiles: install-xulrunner-sdk applications-data
	@for d in ${GAIA_APPDIRS}; \
	do \
		if [[ ("$$d" =~ "${BUILD_APP_NAME}") || (${BUILD_APP_NAME} == "*") ]]; then \
			for mfile in `find $$d -mindepth 1 -maxdepth 1 -name "Makefile"` ;\
			do \
				make -C `dirname $$mfile` || exit 1 ;\
			done; \
		fi; \
	done;

.PHONY: webapp-zip
# Generate $(PROFILE_FOLDER)/webapps/APP/application.zip
webapp-zip: applications-data webapp-optimize app-makefiles install-xulrunner-sdk
ifneq ($(DEBUG),1)
	@mkdir -p $(PROFILE_FOLDER)/webapps
	@$(call run-js-command, webapp-zip)
endif

.PHONY: webapp-optimize
# Web app optimization steps (like precompling l10n, concatenating js files, etc..).
# You need xulrunner (install-xulrunner-sdk) to do this, and you need the app
# to have been built (app-makefiles).
webapp-optimize: app-makefiles install-xulrunner-sdk
	@$(call run-js-command, webapp-optimize)

.PHONY: optimize-clean
# Remove temporary l10n files created by the webapp-optimize step.  Because
# webapp-zip wants these files to still be around during the zip stage, depend
# on webapp-zip so it runs to completion before we start the cleanup.
optimize-clean: webapp-zip install-xulrunner-sdk
	@$(call run-js-command, optimize-clean)

# Get additional extensions
$(PROFILE_FOLDER)/installed-extensions.json: build/config/additional-extensions.json $(wildcard .build/config/custom-extensions.json)
ifeq ($(SIMULATOR),1)
	# Prevent installing external firefox helper addon for the simulator
else ifeq ($(DESKTOP),1)
	@$(call run-js-command, additional-extensions)
endif

profile-dir:
	@test -d $(PROFILE_FOLDER) || mkdir -p $(PROFILE_FOLDER)

# Copy preload contacts to profile
contacts: profile-dir
ifeq ($(BUILD_APP_NAME),*)
ifdef CONTACTS_PATH
	@echo "Copying preload contacts to profile"
	@cp $(CONTACTS_PATH) $(PROFILE_FOLDER)
else
	@rm -f $(PROFILE_FOLDER)/contacts.json
endif
endif

local-apps: applications-data
ifdef VARIANT_PATH
	@$(call run-js-command, variant)
endif

# Create webapps
offline: applications-data optimize-clean

# Create an empty reference workload
.PHONY: reference-workload-empty
reference-workload-empty:
	test_media/reference-workload/makeReferenceWorkload.sh empty

# Create a light reference workload
.PHONY: reference-workload-light
reference-workload-light:
	test_media/reference-workload/makeReferenceWorkload.sh light

# Create a medium reference workload
.PHONY: reference-workload-medium
reference-workload-medium:
	test_media/reference-workload/makeReferenceWorkload.sh medium

# Create a heavy reference workload
.PHONY: reference-workload-heavy
reference-workload-heavy:
	test_media/reference-workload/makeReferenceWorkload.sh heavy

# Create an extra heavy reference workload
.PHONY: reference-workload-x-heavy
reference-workload-x-heavy:
	test_media/reference-workload/makeReferenceWorkload.sh x-heavy


# The install-xulrunner target arranges to get xulrunner downloaded and sets up
# some commands for invoking it. But it is platform dependent
# IMPORTANT: you should generally change the directory name when you change the
# URL unless you know what you're doing
XULRUNNER_SDK_URL=http://ftp.mozilla.org/pub/mozilla.org/xulrunner/nightly/2013/08/2013-08-07-03-02-16-mozilla-central/xulrunner-26.0a1.en-US.
XULRUNNER_BASE_DIRECTORY?=xulrunner-sdk-26
XULRUNNER_DIRECTORY?=$(XULRUNNER_BASE_DIRECTORY)/xulrunner-sdk
XULRUNNER_URL_FILE=$(XULRUNNER_BASE_DIRECTORY)/.url

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
XULRUNNERSDK=$(abspath $(XULRUNNER_DIRECTORY)/bin/XUL.framework/Versions/Current/run-mozilla.sh)
XPCSHELLSDK=$(abspath $(XULRUNNER_DIRECTORY)/bin/XUL.framework/Versions/Current/xpcshell)

else ifeq ($(findstring MINGW32,$(SYS)), MINGW32)
# For windows we only have one binary
XULRUNNER_SDK_DOWNLOAD=$(XULRUNNER_SDK_URL)win32.sdk.zip
XULRUNNERSDK=
XPCSHELLSDK=$(abspath $(XULRUNNER_DIRECTORY)/bin/xpcshell)

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
XULRUNNERSDK=$(abspath $(XULRUNNER_DIRECTORY)/bin/run-mozilla.sh)
XPCSHELLSDK=$(abspath $(XULRUNNER_DIRECTORY)/bin/xpcshell)
endif

# It's difficult to figure out XULRUNNERSDK in subprocesses; it's complex and
# some builders may want to override our find logic (ex: TBPL).
# So let's export these variables to external processes.
export XULRUNNER_DIRECTORY XULRUNNERSDK XPCSHELLSDK

.PHONY: print-xulrunner-sdk
print-xulrunner-sdk:
	@echo "$(XULRUNNER_DIRECTORY)"

.PHONY: install-xulrunner-sdk
install-xulrunner-sdk:
	@echo "XULrunner directory: $(XULRUNNER_DIRECTORY)"
ifndef USE_LOCAL_XULRUNNER_SDK
ifneq ($(XULRUNNER_SDK_DOWNLOAD),$(shell test -d $(XULRUNNER_DIRECTORY) && cat $(XULRUNNER_URL_FILE) 2> /dev/null))
# must download the xulrunner sdk
	rm -rf $(XULRUNNER_BASE_DIRECTORY)
	@echo "Downloading XULRunner..."
	$(DOWNLOAD_CMD) $(XULRUNNER_SDK_DOWNLOAD)
ifeq ($(findstring MINGW32,$(SYS)), MINGW32)
	mkdir "$(XULRUNNER_BASE_DIRECTORY)"
	@echo "Unzipping XULRunner..."
	unzip -q xulrunner*.zip -d "$(XULRUNNER_BASE_DIRECTORY)" && rm -f xulrunner*.zip
else
	mkdir $(XULRUNNER_BASE_DIRECTORY)
	tar xjf xulrunner*.tar.bz2 -C $(XULRUNNER_BASE_DIRECTORY) && rm -f xulrunner*.tar.bz2 || \
		( echo; \
		echo "We failed extracting the XULRunner SDK archive which may be corrupted."; \
		echo "You should run 'make really-clean' and try again." ; false )
endif # MINGW32
	@echo $(XULRUNNER_SDK_DOWNLOAD) > $(XULRUNNER_URL_FILE)
endif # XULRUNNER_SDK_DOWNLOAD
endif # USE_LOCAL_XULRUNNER_SDK

define run-js-command
# When an xpcshell module throws exception which is already captured by
# JavaScript module, some exceptions will make xpcshell returns error code.
# We put quit(0); to override the return code when all exceptions are handled
# in JavaScript module.
	echo "run-js-command $1";
	$(XULRUNNERSDK) $(XPCSHELLSDK) \
		-e "const GAIA_BUILD_DIR='$(BUILDDIR)'" \
		-f build/xpcshell-commonjs.js \
		-e "try { require('$(strip $1)').execute($$BUILD_CONFIG); quit(0);} \
			catch(e) { \
				dump('Exception: ' + e + '\n' + e.stack + '\n'); \
				throw(e); \
			}"
endef

define run-node-command
	echo "run-node-command $1";
	node --harmony -e \
	"require('./build/$(strip $1).js').execute($$BUILD_CONFIG)"
endef

# Optional files that may be provided to extend the set of default
# preferences installed for gaia.  If the preferences in these files
# conflict, the result is undefined.
EXTENDED_PREF_FILES = \
  custom-prefs.js \
  gps-prefs.js \
  payment-prefs.js \

ifeq ($(GAIA_APP_TARGET), engineering)
EXTENDED_PREF_FILES += payment-dev-prefs.js
endif

ifeq ($(DOGFOOD),1)
EXTENDED_PREF_FILES += dogfood-prefs.js
endif

# Optional partner provided preference files. They will be added
# after the ones on the EXTENDED_PREF_FILES and they will be read
# from the GAIA_DISTRIBUTION_DIR directory
PARTNER_PREF_FILES = \
  partner-prefs.js\

# Generate profile/prefs.js
preferences: profile-dir install-xulrunner-sdk
ifeq ($(BUILD_APP_NAME),*)
	@$(call run-js-command, preferences)
	@$(foreach prefs_file,$(addprefix build/config/,$(EXTENDED_PREF_FILES)),\
	  if [ -f $(prefs_file) ]; then \
	    cat $(prefs_file) >> $(PROFILE_FOLDER)/user.js; \
	  fi; \
	)
	@echo "" >> $(PROFILE_FOLDER)/user.js
	@$(foreach prefs_file,$(addprefix $(GAIA_DISTRIBUTION_DIR)/,$(PARTNER_PREF_FILES)),\
	  if [ -f $(prefs_file) ]; then \
	    cat $(prefs_file) >> $(PROFILE_FOLDER)/user.js; \
	  fi; \
	)
endif


# Generate $(PROFILE_FOLDER)/
applications-data: profile-dir install-xulrunner-sdk
ifeq ($(BUILD_APP_NAME),*)
	@$(call run-js-command, applications-data)
endif

# Generate $(PROFILE_FOLDER)/extensions
EXT_DIR=$(PROFILE_FOLDER)/extensions
extensions:
ifeq ($(BUILD_APP_NAME),*)
	@rm -rf $(EXT_DIR)
	@mkdir -p $(EXT_DIR)
ifeq ($(SIMULATOR),1)
	cp -r tools/extensions/{activities@gaiamobile.org,activities,alarms@gaiamobile.org,alarms,desktop-helper,desktop-helper@gaiamobile.org} $(EXT_DIR)/
else ifeq ($(DESKTOP),1)
	cp -r tools/extensions/* $(EXT_DIR)/
else ifeq ($(DEBUG),1)
	cp tools/extensions/httpd@gaiamobile.org $(EXT_DIR)/
	cp -r tools/extensions/httpd $(EXT_DIR)/
else ifeq ($(DESKTOP_SHIMS),1)
	cp -r tools/extensions/{desktop-helper,desktop-helper@gaiamobile.org} $(EXT_DIR)/
endif
	@echo "Finished: Generating extensions"
endif


# this lists the programs we need in the Makefile and that are installed by npm

NPM_INSTALLED_PROGRAMS = node_modules/.bin/mozilla-download node_modules/.bin/jshint node_modules/.bin/mocha
$(NPM_INSTALLED_PROGRAMS): package.json
	npm install --registry $(NPM_REGISTRY)
	touch $(NPM_INSTALLED_PROGRAMS)

###############################################################################
# Tests                                                                       #
###############################################################################

MOZ_TESTS = "$(MOZ_OBJDIR)/_tests/testing/mochitest"
INJECTED_GAIA = "$(MOZ_TESTS)/browser/gaia"

TEST_PATH=gaia/tests/${TEST_FILE}

ifndef APPS
	ifdef APP
		APPS=$(APP)
	else
		APPS=template $(shell find apps -type d -name 'test' | sed -e 's|^apps/||' -e 's|/test$$||' )
	endif
endif

b2g: node_modules/.bin/mozilla-download
	./node_modules/.bin/mozilla-download  \
		--verbose \
		--product b2g \
		--channel tinderbox \
		--branch mozilla-central $@

.PHONY: test-integration
# $(PROFILE_FOLDER) should be `profile-test` when we do `make test-integration`.
test-integration: b2g $(PROFILE_FOLDER)
	NPM_REGISTRY=$(NPM_REGISTRY) ./bin/gaia-marionette $(shell find . -path "*$(TEST_INTEGRATION_APP_NAME)/test/marionette/*_test.js") \
		--host $(MARIONETTE_RUNNER_HOST) \
		--manifest $(TEST_MANIFEST) \
		--reporter $(REPORTER)

.PHONY: test-perf
test-perf:
	MOZPERFOUT="$(MOZPERFOUT)" APPS="$(APPS)" MARIONETTE_RUNNER_HOST=$(MARIONETTE_RUNNER_HOST) GAIA_DIR="`pwd`" NPM_REGISTRY=$(NPM_REGISTRY) ./bin/gaia-perf-marionette

.PHONY: tests
tests: applications-data offline
	echo "Checking if the mozilla build has tests enabled..."
	test -d $(MOZ_TESTS) || (echo "Please ensure you don't have |ac_add_options --disable-tests| in your mozconfig." && exit 1)
	echo "Checking the injected Gaia..."
	test -L $(INJECTED_GAIA) || ln -s $(CURDIR) $(INJECTED_GAIA)
	TEST_PATH=$(TEST_PATH) make -C $(MOZ_OBJDIR) mochitest-browser-chrome EXTRA_TEST_ARGS="--browser-arg=\"\" --extra-profile-file=$(CURDIR)/$(PROFILE_FOLDER)/webapps --extra-profile-file=$(CURDIR)/$(PROFILE_FOLDER)/user.js"

.PHONY: common-install
common-install:
	@test -x "$(NODEJS)" || (echo "Please Install NodeJS -- (use aptitude on linux or homebrew on osx)" && exit 1 )
	@test -x "$(NPM)" || (echo "Please install NPM (node package manager) -- http://npmjs.org/" && exit 1 )

	cd $(TEST_AGENT_DIR) && npm install .

.PHONY: update-common
update-common: common-install

	# common testing tools
	mkdir -p $(TEST_COMMON)/vendor/test-agent/
	mkdir -p $(TEST_COMMON)/vendor/chai/
	rm -Rf tools/xpcwindow
	rm -f $(TEST_COMMON)/vendor/test-agent/test-agent*.js
	rm -f $(TEST_COMMON)/vendor/chai/*.js
	cp -R $(TEST_AGENT_DIR)/node_modules/xpcwindow tools/xpcwindow
	rm -R tools/xpcwindow/vendor/
	cp $(TEST_AGENT_DIR)/node_modules/test-agent/test-agent.js $(TEST_COMMON)/vendor/test-agent/
	cp $(TEST_AGENT_DIR)/node_modules/test-agent/test-agent.css $(TEST_COMMON)/vendor/test-agent/
	cp $(TEST_AGENT_DIR)/node_modules/chai/chai.js $(TEST_COMMON)/vendor/chai/

# Create the json config file
# for use with the test agent GUI
test-agent-config: test-agent-bootstrap-apps
ifeq ($(BUILD_APP_NAME),*)
	@rm -f $(TEST_AGENT_CONFIG)
	@touch $(TEST_AGENT_CONFIG)
	@rm -f /tmp/test-agent-config;
	@# Build json array of all test files
	@for d in ${GAIA_APPDIRS}; \
	do \
		parent="`dirname $$d`"; \
		pathlen=`expr $${#parent} + 2`; \
		find "$$d" -name '*_test.js' | awk '{print substr($$0,'$${pathlen}')}' >> /tmp/test-agent-config; \
	done;
	@echo '{"tests": [' >> $(TEST_AGENT_CONFIG)
	@cat /tmp/test-agent-config |  \
		sed 's:\(.*\):"\1":' | \
		sed -e ':a' -e 'N' -e '$$!ba' -e 's/\n/,\
	/g' >> $(TEST_AGENT_CONFIG);
	@echo '  ]}' >> $(TEST_AGENT_CONFIG);
	@echo "Finished: test ui config file: $(TEST_AGENT_CONFIG)"
	@rm -f /tmp/test-agent-config
endif

.PHONY: test-agent-bootstrap-apps
test-agent-bootstrap-apps:
ifeq ($(BUILD_APP_NAME),*)
	@for d in ${GAIA_APPDIRS} ;\
	do \
		if [[ "$(SYS)" != *MINGW32_* ]]; then \
			mkdir -p $$d$(SEP)test$(SEP)unit ; \
			mkdir -p $$d$(SEP)test$(SEP)integration ; \
		else \
			mkdir -p `echo "$$d" | sed 's|^\(\w\):|/\1|g' | sed 's|\\\\|/|g'`/test/unit ; \
			mkdir -p `echo "$$d" | sed 's|^\(\w\):|/\1|g' | sed 's|\\\\|/|g'`/test/integration ; \
		fi; \
		cp -f $(TEST_COMMON)$(SEP)test$(SEP)boilerplate$(SEP)_proxy.html $$d$(SEP)test$(SEP)unit$(SEP)_proxy.html; \
		cp -f $(TEST_COMMON)$(SEP)test$(SEP)boilerplate$(SEP)_sandbox.html $$d$(SEP)test$(SEP)unit$(SEP)_sandbox.html; \
	done
	@echo "Finished: bootstrapping test proxies/sandboxes";
endif

# For test coverage report
COVERAGE?=0
ifeq ($(COVERAGE), 1)
TEST_ARGS=--coverage
endif
# Temp make file method until we can switch
# over everything in test
ifneq ($(strip $(APP)),)
APP_TEST_LIST=$(shell find apps/$(APP) -name '*_test.js' | grep '/test/unit/')
endif
.PHONY: test-agent-test
test-agent-test:
ifneq ($(strip $(APP)),)
	@echo 'Running tests for $(APP)';
	@$(TEST_AGENT_DIR)/node_modules/test-agent/bin/js-test-agent test $(TEST_ARGS) --server ws://localhost:$(TEST_AGENT_PORT) --reporter $(REPORTER) $(APP_TEST_LIST)
else
	@echo 'Running all tests';
	@$(TEST_AGENT_DIR)/node_modules/test-agent/bin/js-test-agent test $(TEST_ARGS) --server ws://localhost:$(TEST_AGENT_PORT) --reporter $(REPORTER)
endif

.PHONY: test-agent-server
test-agent-server: common-install
	$(TEST_AGENT_DIR)/node_modules/test-agent/bin/js-test-agent server --port $(TEST_AGENT_PORT) -c ./$(TEST_AGENT_DIR)/test-agent-server.js --http-path . --growl

.PHONY: marionette
marionette:
#need the profile
	test -d $(GAIA)/$(PROFILE_FOLDER) || $(MAKE) $(PROFILE_FOLDER)
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

.PHONY: lint gjslint hint

# Lint apps
## only gjslint files from build/jshint-xfail.list - files not yet safe to jshint
## "ls" is used to filter the existing files only, in case the xfail.list is not maintained well enough.
ifndef LINTED_FILES
ifdef APP
  JSHINTED_PATH = apps/$(APP)
  GJSLINTED_PATH = $(shell grep "^apps/$(APP)" build/jshint/xfail.list | ( while read file ; do test -f "$$file" && echo $$file ; done ) )
else
  JSHINTED_PATH = apps shared
  GJSLINTED_PATH = $(shell ( while read file ; do test -f "$$file" && echo $$file ; done ) < build/jshint/xfail.list )
endif
endif

lint:
	NO_XFAIL=1 $(MAKE) -k gjslint hint

gjslint: GJSLINT_EXCLUDED_DIRS = $(shell grep '\/\*\*$$' .jshintignore | sed 's/\/\*\*$$//' | paste -s -d, -)
gjslint: GJSLINT_EXCLUDED_FILES = $(shell egrep -v '(\/\*\*|^\s*)$$' .jshintignore | paste -s -d, -)
gjslint:
	# gjslint --disable 210,217,220,225 replaces --nojsdoc because it's broken in closure-linter 2.3.10
	# http://code.google.com/p/closure-linter/issues/detail?id=64
	@echo Running gjslint...
	@gjslint --disable 210,217,220,225 --custom_jsdoc_tags="prop,borrows,memberof,augments,exports,global,event,example,mixes,mixin,fires,inner,todo,access,namespace,listens,module,memberOf,property" -e '$(GJSLINT_EXCLUDED_DIRS)' -x '$(GJSLINT_EXCLUDED_FILES)' $(GJSLINTED_PATH) $(LINTED_FILES)
	@echo Note: gjslint only checked the files that are xfailed for jshint.

JSHINT_ARGS := --reporter=build/jshint/xfail $(JSHINT_ARGS)

ifdef JSHINTRC
	JSHINT_ARGS := $(JSHINT_ARGS) --config $(JSHINTRC)
endif

ifdef VERBOSE
	JSHINT_ARGS := $(JSHINT_ARGS) --verbose
endif

hint: node_modules/.bin/jshint
	@echo Running jshint...
	@./node_modules/.bin/jshint $(JSHINT_ARGS) $(JSHINTED_PATH) $(LINTED_FILES) || (echo Please consult https://github.com/mozilla-b2g/gaia/tree/master/build/jshint/README.md to get some information about how to fix jshint issues. && exit 1)

# Erase all the indexedDB databases on the phone, so apps have to rebuild them.
delete-databases:
	@echo 'Stopping b2g'
	@$(ADB) shell stop b2g
	@$(ADB) shell rm -r $(MSYS_FIX)/data/local/indexedDB/*
	@echo 'Starting b2g'
	@$(ADB) shell start b2g

# Take a screenshot of the device and put it in screenshot.png
screenshot:
	mkdir -p screenshotdata
	$(ADB) pull $(MSYS_FIX)/dev/graphics/fb0 screenshotdata/fb0
	dd bs=1920 count=800 if=screenshotdata/fb0 of=screenshotdata/fb0b
	ffmpeg -vframes 1 -vcodec rawvideo -f rawvideo -pix_fmt rgb32 -s 480x800 -i screenshotdata/fb0b -f image2 -vcodec png screenshot.png
	rm -rf screenshotdata

# Forward port to use the RIL daemon from the device
forward:
	$(ADB) shell touch $(MSYS_FIX)/data/local/rilproxyd
	$(ADB) shell killall rilproxy
	$(ADB) forward tcp:6200 localreserved:rilproxyd

# If your gaia/ directory is a sub-directory of the B2G directory, then
# you should use:
#
#  BUILD_APP_NAME=app-name ./flash.sh gaia
#
# But if you're working on just gaia itself, and you already have B2G firmware
# on your phone, and you have adb in your path, then you can use the
# install-gaia target to update the gaia files and reboot b2g
install-gaia: adb-remount $(PROFILE_FOLDER)
	@$(call run-js-command, install-gaia)

# Copy demo media to the sdcard.
# If we've got old style directories on the phone, rename them first.
install-media-samples:
	$(ADB) shell 'if test -d /sdcard/Pictures; then mv /sdcard/Pictures /sdcard/DCIM; fi'
	$(ADB) shell 'if test -d /sdcard/music; then mv /sdcard/music /sdcard/music.temp; mv /sdcard/music.temp /sdcard/Music; fi'
	$(ADB) shell 'if test -d /sdcard/videos; then mv /sdcard/videos /sdcard/Movies;	fi'

	$(ADB) push media-samples/DCIM $(MSYS_FIX)/sdcard/DCIM
	$(ADB) push media-samples/Movies $(MSYS_FIX)/sdcard/Movies
	$(ADB) push media-samples/Music $(MSYS_FIX)/sdcard/Music

install-test-media:
	$(ADB) push test_media/DCIM $(MSYS_FIX)/sdcard/DCIM
	$(ADB) push test_media/Movies $(MSYS_FIX)/sdcard/Movies
	$(ADB) push test_media/Music $(MSYS_FIX)/sdcard/Music

dialer-demo:
	@cp -R apps/contacts apps/dialer
	@rm apps/dialer/contacts/manifest*
	@mv apps/dialer/contacts/index.html apps/dialer/contacts/contacts.html
	@sed -i.bak 's/manifest.appcache/..\/manifest.appcache/g' apps/dialer/contacts/contacts.html
	@find apps/dialer/ -name '*.bak' -exec rm {} \;

demo: install-media-samples install-gaia

production: reset-gaia
dogfood: reset-gaia

# Remove everything and install a clean profile
reset-gaia: purge install-gaia install-default-data

# remove the memories and apps on the phone
purge:
	$(ADB) shell stop b2g
	@(for FILE in `$(ADB) shell ls $(MSYS_FIX)/data/local | tr -d '\r'`; \
	do \
		[ $$FILE = 'tmp' ] || $(ADB) shell rm -r $(MSYS_FIX)/data/local/$$FILE; \
	done);
	$(ADB) shell rm -r $(MSYS_FIX)/cache/*
	$(ADB) shell rm -r $(MSYS_FIX)/data/b2g/*
	$(ADB) shell rm -r $(MSYS_FIX)/data/local/webapps
	$(ADB) remount
	$(ADB) shell rm -r $(MSYS_FIX)/system/b2g/webapps
	$(ADB) shell 'if test -d $(MSYS_FIX)/persist/svoperapps; then rm -r $(MSYS_FIX)/persist/svoperapps; fi'

$(PROFILE_FOLDER)/settings.json: profile-dir install-xulrunner-sdk
ifeq ($(BUILD_APP_NAME),*)
	@$(call run-js-command, settings)
endif

# push $(PROFILE_FOLDER)/settings.json and $(PROFILE_FOLDER)/contacts.json (if CONTACTS_PATH defined) to the phone
install-default-data: $(PROFILE_FOLDER)/settings.json contacts
	$(ADB) shell stop b2g
	$(ADB) remount
	$(ADB) push $(PROFILE_FOLDER)/settings.json $(MSYS_FIX)/system/b2g/defaults/settings.json
ifdef CONTACTS_PATH
	$(ADB) push $(PROFILE_FOLDER)/contacts.json $(MSYS_FIX)/system/b2g/defaults/contacts.json
else
	$(ADB) shell rm /system/b2g/defaults/contacts.json
endif
	$(ADB) shell start b2g

# create default data, gonk-misc will copy this folder during B2G build time
create-default-data: preferences $(PROFILE_FOLDER)/settings.json contacts
ifeq ($(BUILD_APP_NAME),*)
	# create a clean folder to store data for B2G, this folder will copy to b2g output folder.
	rm -rf $(PROFILE_FOLDER)/defaults
	mkdir -p $(PROFILE_FOLDER)/defaults/pref
	# rename user_pref() to pref() in user.js
	sed s/user_pref\(/pref\(/ $(PROFILE_FOLDER)/user.js > $(PROFILE_FOLDER)/defaults/pref/user.js
	cp $(PROFILE_FOLDER)/settings.json $(PROFILE_FOLDER)/defaults/settings.json
ifdef CONTACTS_PATH
	cp $(PROFILE_FOLDER)/contacts.json $(PROFILE_FOLDER)/defaults/contacts.json
endif
endif

# clean out build products
clean:
	rm -rf profile profile-debug profile-test $(PROFILE_FOLDER) $(STAGE_FOLDER) docs

# clean out build products and tools
really-clean: clean
	rm -rf xulrunner-* .xulrunner-* node_modules b2g

.git/hooks/pre-commit: tools/pre-commit
	test -d .git && cp tools/pre-commit .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit || true

.PHONY: adb-remount
adb-remount:
	$(ADB) remount

build-test-unit: $(NPM_INSTALLED_PROGRAMS)
	@$(call run-build-test, $(shell find build/test/unit/*.test.js))

build-test-integration: $(NPM_INSTALLED_PROGRAMS)
	@$(call run-build-test, $(shell find build/test/integration/*.test.js))

.PHONY: docs
docs: $(NPM_INSTALLED_PROGRAMS)
	grunt docs
