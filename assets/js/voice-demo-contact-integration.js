(function () {
    var STORAGE_KEY = "vdemo_memos";

    function readMemosFromStorage() {
        try {
            var raw = window.localStorage.getItem(STORAGE_KEY);
            if (!raw) return {};
            var data = JSON.parse(raw);
            if (data && typeof data === "object") {
                return data;
            }
        } catch (e) {
            console.error("Voice Demo System – Fehler beim Lesen von localStorage:", e);
        }
        return {};
    }

    function findMessageField(form) {
        var msgField = null;
        var textareas = form.querySelectorAll("textarea");

        // 1) Versuche, anhand des Labels „Nachricht“ zu finden
        textareas.forEach(function (ta) {
            if (msgField) return;
            var label = ta.id ? form.querySelector('label[for="' + ta.id + '"]') : null;
            var labelText = label && label.textContent ? label.textContent : "";
            if (/nachricht/i.test(labelText)) {
                msgField = ta;
            }
        });

        // 2) Fallback: erstes Textarea im Formular
        if (!msgField && textareas.length) {
            msgField = textareas[0];
        }

        return msgField || null;
    }

    function buildContactBox(form, msgField, memos) {
        // bereits vorhanden?
        var wrap = form.querySelector(".vdemo-contact-memos-wrap");
        if (!wrap) {
            wrap = document.createElement("div");
            wrap.className = "vdemo-contact-memos-wrap";

            var title = document.createElement("div");
            title.className = "vdemo-contact-memos-title";
            title.textContent = "Gemerkte Demos";

            var box = document.createElement("div");
            box.className = "vdemo-contact-memos";

            var hint = document.createElement("div");
            hint.className = "vdemo-contact-memos-hint";
            hint.textContent =
                "Die von Dir ausgewählten Demos werden mitgeschickt, damit ich Deinen Klangwunsch besser verstehe.";

            var hidden = document.createElement("input");
            hidden.type = "hidden";
            hidden.name = "gemerkte_demos";
            hidden.className = "demo-memo-field";

            wrap.appendChild(title);
            wrap.appendChild(box);
            wrap.appendChild(hint);
            wrap.appendChild(hidden);

            // Nach dem Nachrichtenfeld einsetzen – zuerst Fluent-Forms-Umgebung versuchen
            var group = msgField.closest(".ff-el-group");
            if (group && group.parentNode) {
                group.parentNode.insertBefore(wrap, group.nextSibling);
            } else if (msgField.parentNode) {
                msgField.parentNode.insertBefore(wrap, msgField.nextSibling);
            } else {
                form.appendChild(wrap);
            }
        }

        // Chips rendern
        var boxEl = wrap.querySelector(".vdemo-contact-memos");
        if (!boxEl) return;

        boxEl.innerHTML = "";

        var ids = Object.keys(memos || {});
        if (!ids.length) {
            wrap.style.display = "none";
        } else {
            wrap.style.display = "";
        }

        ids.forEach(function (id) {
            var item = memos[id] || {};
            var badge = (item.badge && String(item.badge).trim()) || id;
            var title = item.title || "";
            var label = "ID " + badge + " – " + title;

            var chip = document.createElement("span");
            chip.className = "vdemo-contact-chip";
            chip.setAttribute("data-memo-id", id);
            chip.textContent = label;

            boxEl.appendChild(chip);
        });

        // Submit-Hook: Demos in Nachricht + Hidden-Feld schreiben
        if (!form.__vdemoMemoSubmitBound) {
            form.__vdemoMemoSubmitBound = true;
            form.addEventListener("submit", function () {
                try {
                    var currentMemos = readMemosFromStorage();
                    var lines = [];

                    Object.keys(currentMemos || {}).forEach(function (id) {
                        var item = currentMemos[id] || {};
                        var badge = (item.badge && String(item.badge).trim()) || id;
                        var title = item.title || "";
                        var line = "ID " + badge + " – " + title;
                        if (item.info) {
                            line += " | " + item.info;
                        }
                        if (item.genre) {
                            line += " | Genre: " + item.genre;
                        }
                        lines.push(line);
                    });

                    if (lines.length && msgField && msgField.tagName && msgField.tagName.toLowerCase() === "textarea") {
                        var block =
                            "\n\n--- Gemerkte Demos ---\n" +
                            lines.map(function (l) { return "• " + l; }).join("\n") +
                            "\n";
                        msgField.value = (msgField.value || "") + block;
                    }

                    var hidden = wrap.querySelector(".demo-memo-field");
                    if (hidden) {
                        hidden.value = lines.join("\n");
                    }
                } catch (e) {
                    console.error("Voice Demo System – Fehler beim Anhängen der gemerkten Demos an die Nachricht:", e);
                }
            });
        }
    }

    function initContactIntegration() {
        try {
            // Nur aktiv werden, wenn die Kontaktintegration für diese Seite explizit aktiviert ist
            if (
                !window.VoiceDemoContactConfig ||
                !window.VoiceDemoContactConfig.enabled
            ) {
                return;
            }

            var form = null;

            // 1) Formular-Selektor aus den Einstellungen (Pflicht für die Kontaktintegration)
            if (window.VoiceDemoContactConfig.formSelector) {
                try {
                    form = document.querySelector(window.VoiceDemoContactConfig.formSelector);
                } catch (e) {
                    console.error(
                        "Voice Demo System – ungültiger Formular-Selektor in den Einstellungen:",
                        window.VoiceDemoContactConfig.formSelector,
                        e
                    );
                }
            }

            // Keine Fallbacks mehr: wenn kein Formular gefunden wird, hier hart abbrechen
            if (!form) {
                return;
            }

            var msgField = findMessageField(form);
            if (!msgField) return;

            var memos = readMemosFromStorage();
            buildContactBox(form, msgField, memos);
        } catch (e) {
            console.error("Voice Demo System – Kontaktintegration Fehler:", e);
        }
    }

    document.addEventListener("DOMContentLoaded", function () {
        initContactIntegration();
    });
})();
