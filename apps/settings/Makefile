-include $(PWD)/build/common.mk


ifdef XPCSHELLSDK
	JS_RUN_ENVIRONMENT := $(XULRUNNERSDK) $(XPCSHELLSDK)
else ifndef JS_RUN_ENVIRONMENT
    NODEJS := $(shell which node)
    JS_RUN_ENVIRONMENT := $(NODEJS)
endif

rwildcard=$(wildcard $1$2) $(foreach d,$(wildcard $1*),$(call rwildcard,$d/,$2))

SHARED_SOURCES := $(call rwildcard,../../shared/,*)
JS_SOURCES := $(call rwildcard,js/,*)
LOCALES_SOURCES := $(call rwildcard,locales/,*)
RESOURCES_SOURCES := $(call rwildcard,resources/,*)
STYLE_SOURCES := $(call rwildcard,style/,*)
BUILD_SOURCES := $(call rwildcard,build/,*)

BUILD_DIR=../../build_stage/settings

.PHONY: all clean

all: js_environment_available build stamp-commit-hash settings_configuration $(BUILD_DIR)/js/main.js

build:
	@echo 'Building settings app...'
	@$(call run-app-js-command, build)

clean:
	rm -rf $(BUILD_DIR)

js_environment_available:
ifndef JS_RUN_ENVIRONMENT
  $(error Environment to run r.js is not available. Please Install NodeJS -- (use aptitude on linux or homebrew on osx))
endif

GAIA_ROOT_PATH?=../..

# Generate a text file containing the current changeset of Gaia
stamp-commit-hash:
	@(if [ -e ${GAIA_ROOT_PATH}/gaia_commit_override.txt ]; then \
		cp ${GAIA_ROOT_PATH}/gaia_commit_override.txt ./resources/gaia_commit.txt; \
	elif [ -d ${GAIA_ROOT_PATH}/.git ]; then \
		git --git-dir=${GAIA_ROOT_PATH}/.git log -1 --format="%H%n%ct" HEAD > ./resources/gaia_commit.txt; \
	else \
		echo 'Unknown Git commit; build date shown here.' > ./resources/gaia_commit.txt; \
		date +%s >> ./resources/gaia_commit.txt; \
	fi)

$(BUILD_DIR)/js/main.js: manifest.webapp index.html $(SHARED_SOURCES) $(JS_SOURCES) $(LOCALES_SOURCES) $(RESOURCES_SOURCES) $(STYLE_SOURCES) $(BUILD_SOURCES)
	@rm -rf $(BUILD_DIR)
	@mkdir -p $(BUILD_DIR)
	cp -rp ../../shared $(BUILD_DIR)/shared
	$(JS_RUN_ENVIRONMENT) ../../build/r.js -o build/require_config.jslike

settings_configuration:
ifdef XPCSHELLSDK
	@$(call run-app-js-command, build)
else ifndef JS_RUN_ENVIRONMENT
	@$(NODEJS) build/configure.js
endif
