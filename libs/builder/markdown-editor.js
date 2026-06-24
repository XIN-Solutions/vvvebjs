(function() {

    const MODAL_ID = "SectionConfigModal";
    const INIT_ATTR = "data-markdown-editor-initialized";

    const instances = new WeakMap();

    function getModalBody() {
        return document.querySelector(`#${MODAL_ID} .section-config-modal-body`);
    }

    function setModelValue(scope, path, value) {
        const parts = path.split(".");
        let obj = scope;
        for (let i = 0; i < parts.length - 1; i++) {
            obj = obj[parts[i]];
            if (obj == null) {
                return;
            }
        }
        obj[parts[parts.length - 1]] = value;
    }

    function syncMarkdownEditorValues(root) {
        if (!root) {
            return;
        }

        for (const textarea of root.querySelectorAll("textarea[data-markdown-editor][" + INIT_ATTR + "]")) {
            const editor = instances.get(textarea);
            if (!editor) {
                continue;
            }

            const value = editor.value();
            textarea.value = value;

            const modelPath = textarea.getAttribute("x-model");
            const form = textarea.closest("form");
            if (modelPath && form && typeof Alpine !== "undefined" && Alpine.$data) {
                setModelValue(Alpine.$data(form), modelPath, value);
            }

            textarea.dispatchEvent(new Event("input", { bubbles: true }));
        }
    }

    function bindFormGetSync(form) {
        if (!form || form.hasAttribute("data-markdown-editor-get-bound")) {
            return;
        }
        form.setAttribute("data-markdown-editor-get-bound", "true");
        form.addEventListener("get", () => {
            syncMarkdownEditorValues(form);
        }, true);
    }

    function ensureAlpineOnForms(root) {
        if (typeof Alpine === "undefined" || !Alpine.initTree) {
            return;
        }

        for (const form of root.querySelectorAll("form[x-data]")) {
            if (!form._x_dataStack) {
                Alpine.initTree(form);
            }
            bindFormGetSync(form);
        }
    }

    function getEditorMaxHeight(bodyEl) {
        return "300px";
    }

    function applyEditorMaxHeight(editor, bodyEl) {
        if (!bodyEl) {
            return;
        }
        const maxHeight = getEditorMaxHeight(bodyEl);
        editor.options.maxHeight = maxHeight;
        editor.options.minHeight = maxHeight;
        editor.codemirror.getScrollerElement().style.height = maxHeight;
        if (typeof editor.setPreviewMaxHeight === "function") {
            editor.setPreviewMaxHeight();
        }
        editor.codemirror.refresh();
    }

    function refreshAllEditorMaxHeights(bodyEl) {
        if (!bodyEl) {
            return;
        }
        for (const textarea of bodyEl.querySelectorAll("textarea[" + INIT_ATTR + "]")) {
            const editor = instances.get(textarea);
            if (editor) {
                applyEditorMaxHeight(editor, bodyEl);
            }
        }
    }

    function initMarkdownEditor(textarea) {
        if (textarea.hasAttribute(INIT_ATTR) || typeof EasyMDE === "undefined") {
            return;
        }

        const editor = new EasyMDE({
            element: textarea,
            autoDownloadFontAwesome: false,
            forceSync: true,
            autoRefresh: { delay: 300 },
            minHeight: "300px",
            maxHeight: "300px",
            spellChecker: false,
            initialValue: textarea.value,
        });

        editor.codemirror.on("change", () => {
            textarea.dispatchEvent(new Event("input", { bubbles: true }));
        });

        textarea.setAttribute(INIT_ATTR, "true");
        instances.set(textarea, editor);
    }

    function scan(root) {
        if (!root) {
            return;
        }

        ensureAlpineOnForms(root);

        for (const textarea of root.querySelectorAll("textarea[data-markdown-editor]:not([" + INIT_ATTR + "])")) {
            initMarkdownEditor(textarea);
        }
    }

    function destroyAll(root) {
        const scope = root || getModalBody() || document;
        for (const textarea of scope.querySelectorAll("textarea[" + INIT_ATTR + "]")) {
            const editor = instances.get(textarea);
            if (editor) {
                editor.toTextArea();
                instances.delete(textarea);
            }
            textarea.removeAttribute(INIT_ATTR);
        }
    }

    function refreshEditorsInTab(tabPane) {
        if (!tabPane) {
            return;
        }
        for (const textarea of tabPane.querySelectorAll("textarea[" + INIT_ATTR + "]")) {
            const editor = instances.get(textarea);
            if (editor?.codemirror) {
                editor.codemirror.refresh();
            }
        }
    }

    function setupModalObserver() {
        const modalEl = document.getElementById(MODAL_ID);
        if (!modalEl || modalEl.hasAttribute("data-markdown-editor-bound")) {
            return;
        }

        modalEl.setAttribute("data-markdown-editor-bound", "true");

        const bodyEl = modalEl.querySelector(".section-config-modal-body");
        if (!bodyEl) {
            return;
        }

        const bodyObserver = new MutationObserver(() => {
            ensureAlpineOnForms(bodyEl);
        });
        bodyObserver.observe(bodyEl, { childList: true, subtree: true });

        modalEl.addEventListener("click", (event) => {
            if (!event.target.closest("[data-section-config-update]")) {
                return;
            }
            const form = bodyEl.querySelector("form");
            if (form) {
                syncMarkdownEditorValues(form);
            }
        }, true);

        modalEl.addEventListener("shown.bs.modal", () => {
            scan(bodyEl);
            refreshAllEditorMaxHeights(bodyEl);
        });

        modalEl.addEventListener("hidden.bs.modal", () => {
            destroyAll(bodyEl);
        });

        window.addEventListener("resize", () => {
            if (!modalEl.classList.contains("show")) {
                return;
            }
            refreshAllEditorMaxHeights(bodyEl);
        });

        modalEl.addEventListener("shown.bs.tab", (event) => {
            refreshAllEditorMaxHeights(bodyEl);
            const href = event.target?.getAttribute?.("href");
            const tabPane = href ? modalEl.querySelector(href) : null;
            refreshEditorsInTab(tabPane);
        });
    }

    function watchForModal() {
        setupModalObserver();
        if (!document.getElementById(MODAL_ID)) {
            const bodyObserver = new MutationObserver(() => {
                setupModalObserver();
            });
            bodyObserver.observe(document.body, { childList: true, subtree: true });
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", watchForModal);
    }
    else {
        watchForModal();
    }

    window.VvvebMarkdownEditor = {
        scan,
        destroyAll,
        syncMarkdownEditorValues,
    };

})();
