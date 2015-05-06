APP_DIR := $(CURDIR)

ifneq (,$(findstring MINGW32_,$(SYS)))
  APP_DIR:=$(shell pwd -W | sed -e 's|/|\\\\|g')
endif

export APP_DIR

define run-build-coverage
  TEST_FILES_DIR=$1 node --harmony node_modules$(SEP)istanbul$(SEP)lib$(SEP)cli.js \
  cover build$(SEP)test$(SEP)coverage-checker.js
endef

# rwildcard is used to recursive wildcard, it will travel all files in
# directory by argument 1 and filter by argument 2
#
# Usage: $(rwildcard, DIR, FILTER)
rwildcard=$(wildcard $1$2) $(foreach d,$(wildcard $1*),$(call rwildcard,$d/,$2))

define run-js-command
  $(2) $(XULRUNNERSDK) $(XPCSHELLSDK) \
    -f "$(GAIA_DIR)$(SEP)build$(SEP)xpcshell-commonjs.js" \
    -e "run('$(strip $1)');"
endef

define run-node-command
  node --harmony -e "require('./build/$(strip $1).js').execute($(BUILD_CONFIG))"
endef
