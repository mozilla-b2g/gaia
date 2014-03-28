-include $(PWD)/build/common.mk

BUILD_DIR=$(PWD)/build_stage/system

.PHONY: all clean
all: clean
	@echo Building system app to build_stage...
	@mkdir -p $(BUILD_DIR)
	@cp -r * $(BUILD_DIR)
	@$(call run-app-js-command, build)
clean:
	@rm -rf ./camera
	@rm -rf $(BUILD_DIR)
