(function() {

    document.addEventListener("alpine:init", () => {

        /**
         * Initialise data-members
         *
         * @param defaultConfig {object} the default configuration to assign when it's a new component
         * @param beforeSetConfig {function(x)} a mapping function that is called before setting config
         * @param beforeGetConfig {function(x)} a mapping function that is called before returning
         */
        Alpine.data('componentDialog', ({defaultConfig, beforeSetConfig, beforeGetConfig} = {}) => ({

            /**
             * the model for the component.
             */
            config: {},

            /**
             * holds promise's resolver method for promise that waits for component to submit
             */
            configResolver: null,

            beforeSetConfig: (x) => x,

            /**
             * default identity function for transforming configuration
             */
            beforeGetConfig: (x) => x,

            init() {
                console.log("[component-dialog] initialising the component dialog");
                this.config = {...this.config, ...(defaultConfig ?? {})};

                if (beforeGetConfig) {
                    this.beforeGetConfig = beforeGetConfig;
                }
                if (beforeSetConfig) {
                    this.beforeSetConfig = beforeSetConfig;
                }
            },

            /**
             * Update the model for this component dialog
             * @param configEvent {object} the new configuration values
             */
            setConfig(configEvent) {
                const detail = configEvent.detail;
                const mergedConfig = {...this.config, ...detail.config};
                this.config = this.beforeSetConfig(mergedConfig);
                this.configResolver = detail.configResolver;
            },

            /**
             * @returns {any} the configuration
             */
            getConfig() {
                const parsedConfig = JSON.parse(JSON.stringify(this.config));
                const txConfig = this.beforeGetConfig(parsedConfig);
                if (this.configResolver) {
                    this.configResolver(txConfig);
                }
            }

        }));
    });

})();