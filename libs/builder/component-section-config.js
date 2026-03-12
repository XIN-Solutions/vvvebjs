(function() {

    /**
     * Create a dialog button
     * @param buttonKey the name of the component
     * @returns {HTMLButtonElement}
     */
    function createDialogButton(buttonKey) {
        const btn = document.createElement("button");
        btn.className = "btn btn-sm btn-primary";
        btn.disabled = true;
        btn.innerHTML = '<i class="la la-cog la-lg"></i> Component Configuration';
        btn.setAttribute("data-key", buttonKey || "section-config");
        return btn;
    }

    /**
     * Create dialog details url.
     * @param themeId {string} the theme identifier
     * @param group {string} name of the group for this component
     * @param component {string} component identifier.
     * @returns {string} the URL to fetch from.
     */
    function createDialogDetailsUrl(themeId, group, component) {
        return (
            "/sections/" + encodeURIComponent(themeId) +
            "/" + encodeURIComponent(group) +
            "/" + encodeURIComponent(component) +
            "/dialog"
        );
    }

    /**
     * Assign the event handler
     * @param btn
     * @param data
     */
    function assignEventHandlerToButton(btn, data) {
        btn.disabled = false;
        btn.addEventListener("click", () => {
            console.log(data.html);
        });
    }

    /**
     * Fetch the dialog content.
     *
     * @param dialogUrl {string} where to fetch the details from
     * @param btn {Element} where to attach the resulting information to.
     */
    function fetchDialogContent(dialogUrl, btn) {
        fetch(dialogUrl)
            .then((r) => r.json())
            .then((data) => {
                if (data.success && data.html) {
                    console.log("[SectionConfigButtonInput] Successfully retrieved dialog content");
                    assignEventHandlerToButton(btn, data);
                }
                else {
                    console.log("[SectionConfigButtonInput] Couldn't retrieve dialog content:", data);
                }
            })
            .catch((err) => {
                console.error("[SectionConfigButtonInput] Couldn't retrieve the dialog content.");
            });
    }

    let SectionConfigButtonInput = {

        /**
         * Initialise section button input
         *
         * @param data
         * @param element
         * @returns {HTMLDivElement}
         */
        init: function(data, element) {
            console.log("[SectionConfigButtonInput] Initialising section button: ", data, 'el', element);

            const container = document.createElement("div");
            const btn = createDialogButton(data.key);
            container.appendChild(btn);

            // extract relevant information from context.
            const themeId = typeof meta !== "undefined" && meta?.theme?.id ? meta.theme.id : null;
            const componentAttr = element?.getAttribute?.("data-section-component");
            const isBodyChild = element?.parentElement === element?.ownerDocument?.body;

            if (!themeId || !componentAttr || !isBodyChild) {
                console.log("[SectionConfigButtonInput] Early return - validation failed:", {
                    themeId: themeId,
                    componentAttr: componentAttr,
                    isBodyChild: isBodyChild
                });

                return container;
            }

            // extract component name information from component attribute.
            const parts = componentAttr.split("/");
            const group = parts[0];
            const component = parts[1];

            // validate they are correct.
            if (!group || !component) {
                console.log("[SectionConfigButtonInput] Invalid component format - missing group or component:", {
                    componentAttr: componentAttr,
                    group: group,
                    component: component
                });

                return container;
            }

            const dialogUrl = createDialogDetailsUrl(themeId, group, component);

            console.log("[SectionConfigButtonInput] Requesting dialog:", dialogUrl);

            // asynchronous but unawaited.
            fetchDialogContent(dialogUrl, btn);

            console.log("Returning: ", container);
            return container;
        },

        setValue: function(value) {
            console.log("[SectionConfigButtonInput] Set value: ", value);
        },
    };

    const SectionConfigComponent = {
        name: "Section Config",
        attributes: ["data-section-component"],
        image: "icons/icon.svg",

        properties: [
            {
                name: "",
                key: "section-config",
                sort: 0,
                inputtype: SectionConfigButtonInput,
                data: {
                    text: "Component Configuration"
                }
            }
        ]
    };

    Vvveb.Components.add("elements/section-config", SectionConfigComponent);
    // Vvveb.Components.extend("_base", "_base", SectionConfigComponent);

})();
