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
  @$(2) NODE_PATH=build$(SEP)test$(SEP)integration:$(APP_DIR)$(SEP)build node --harmony -e 'require("./build/$(strip $1).js").execute($(BUILD_CONFIG))'
endef

# XXX: Using run-node-command would cause a circular reference error, but
# attempts to move the scan-appdir action to js (app.js) caused a strange issue
# with spawnProcess for xpcshell (unable to pass GAIA_APPDIRS in the options).
# Also need to make sure it runs xpcshell if RUN_ON_NODE is not turned on
# because b2g-inbound still runs node 0.10 rather than 4.x, and will break
# when parsing arrow function.
define run-node-command-without-config
  $(2) NODE_PATH=build$(SEP)test$(SEP)integration:$(APP_DIR)$(SEP)build node --harmony -e 'require("./build/$(strip $1).js").execute()'
endef
