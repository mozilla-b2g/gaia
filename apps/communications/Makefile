-include $(PWD)/build/common.mk

BUILD_DIR=$(PWD)/build_stage/communications

.PHONY: all clean
all: clean
	@echo Building communications app to build_stage...
	@mkdir -p $(BUILD_DIR)
	@cp -r * $(BUILD_DIR)
	@rm -rf $(BUILD_DIR)/Makefile $(BUILD_DIR)/build $(BUILD_DIR)/test
	@$(call run-app-js-command, build)
clean:
	@rm -rf $(BUILD_DIR)
