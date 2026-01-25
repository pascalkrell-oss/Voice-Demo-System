// voice-demo-contact.js
// Baut auf der Kontaktseite eine "Gemerkte Demos"-Box unter dem Nachrichtenfeld
// und hängt die Demos an die Nachricht / ein Hidden-Feld an, ohne andere Funktionen zu beeinflussen.

(function () {
    if (typeof window === "undefined" || typeof document === "undefined") {
        return;
    }

    document.addEventListener("DOMContentLoaded", function () {
        try {
            var storageKey = "vdemo_memos";
            var raw = null;
            try {
                raw = window.localStorage ? window.localStorage.getItem(storageKey) : null;
            } catch (e) {
                raw = null;
            }

            var memoItems = {};
            if (raw) {
                try {
                    memoItems = JSON.parse(raw) || {};
                } catch (e) {
                    memoItems = {};
                }
            }

            var ids = Object.keys(memoItems);
            if (!ids.length) {
                // Nichts gemerkt -> auf Kontaktseite nichts anzeigen
                return;
            }

            // Formular finden – wir nehmen das erste "echte" Formular auf der Seite
            var form = document.querySelector("form.fluentform, form[id^='fluentform_'], .fluentform form, form[action*='fluent-form'], form[action*='fluentform']");
            if (!form) {
                form = document.querySelector("form");
            }
            if (!form) {
                return;
            }

            // Nachrichtenfeld finden (Textarea mit Label "Nachricht" bevorzugt)
            var msgField = null;
            var textareas = form.querySelectorAll("textarea");
            if (!textareas.length) {
                return;
            }

            textareas.forEach(function (ta) {
                if (msgField) {
                    return;
                }
                if (!ta.id) {
                    return;
                }
                var label = form.querySelector('label[for="' + ta.id + '"]');
                if (label && /nachricht/i.test(label.textContent || "")) {
                    msgField = ta;
                }
            });

            if (!msgField) {
                msgField = textareas[0];
            }

            // Hidden-Feld "gemerkte_demos" suchen/erzeugen
            var hidden = form.querySelector('input[type="hidden"][name="gemerkte_demos"]');
            if (!hidden) {
                hidden = document.createElement("input");
                hidden.type = "hidden";
                hidden.name = "gemerkte_demos";
                form.appendChild(hidden);
            }

            // Container für die Box: vorhandenes .demo-memo-field nutzen oder neu erzeugen
            var containers = form.querySelectorAll(".demo-memo-field");
            var container = containers.length ? containers[0] : null;
            if (containers.length > 1) {
                for (var ci = 1; ci < containers.length; ci++) {
                    if (containers[ci] && containers[ci].parentNode) {
                        containers[ci].parentNode.removeChild(containers[ci]);
                    }
                }
            }

            if (!container) {
                container = document.createElement("div");
                container.className = "demo-memo-field";

                var group = msgField.closest(".ff-el-group");
                if (group && group.parentNode) {
                    group.parentNode.insertBefore(container, group.nextSibling);
                } else if (msgField.parentNode) {
                    msgField.parentNode.insertBefore(container, msgField.nextSibling);
                } else {
                    form.appendChild(container);
                }
            }

            // Inneres Wrapper-Element für Styling
            var wrap = document.createElement("div");
            wrap.className = "vdemo-contact-memos-wrap";

            // Titel
            var titleEl = document.createElement("div");
            titleEl.className = "vdemo-contact-memos-title";
            titleEl.textContent = "Gemerkte Demos";

            // Box für Chips
            var boxEl = document.createElement("div");
            boxEl.className = "vdemo-contact-memos";

            // Hinweis
            var hintEl = document.createElement("div");
            hintEl.className = "vdemo-contact-memos-hint";
            hintEl.textContent = "Deine gemerkten Demos werden mir als Textform bei der Anfrage übermittelt. So habe ich direkt ein Gefühl für den Stil Deiner gewünschten Sprachaufnahmen.";

            // Interner Zustand: aktive IDs im Formular
            var activeIds = ids.slice();

            function buildChips() {
                // Box leeren
                while (boxEl.firstChild) {
                    boxEl.removeChild(boxEl.firstChild);
                }

                if (!activeIds.length) {
                    // Wenn nichts mehr aktiv ist -> Container ausblenden
                    container.style.display = "none";
                    hidden.value = "";
                    return;
                } else {
                    container.style.display = "";
                }

                var lines = [];

                activeIds.forEach(function (id) {
                    var item = memoItems[id] || {};
                    var badge = (item.badge && String(item.badge).trim()) || id;
                    var titleText = item.title || "";
                    var label = "ID " + badge + " – " + titleText;

                    var chip = document.createElement("span");
                    chip.className = "vdemo-contact-chip";
                    chip.setAttribute("data-memo-id", id);

                    var labelSpan = document.createElement("span");
                    labelSpan.textContent = label;

                    var btn = document.createElement("button");
                    btn.type = "button";
                    btn.className = "vdemo-contact-chip-remove";
                    btn.setAttribute("aria-label", "Aus Liste entfernen");
                    btn.textContent = "×";

                    btn.addEventListener("click", function (ev) {
                        ev.preventDefault();
                        // Im Formular-Zustand entfernen
                        activeIds = activeIds.filter(function (x) {
                            return x !== id;
                        });
                        buildChips();

                        // Optional: auch localStorage aktualisieren,
                        // damit die Merkliste beim nächsten Besuch synchron ist
                        try {
                            delete memoItems[id];
                            if (window.localStorage) {
                                window.localStorage.setItem(storageKey, JSON.stringify(memoItems));
                            }
                        } catch (e) {}
                    });

                    chip.appendChild(labelSpan);
                    chip.appendChild(btn);
                    boxEl.appendChild(chip);

                    var line = label;
                    lines.push(line);
                });

                // Hinweistext unter den Chips anzeigen
                boxEl.appendChild(hintEl);

                // Hidden-Feld aktualisieren
                if (lines.length) {
                    hidden.value = "Gemerkte Demos:\n" + lines.join("\n");
                } else {
                    hidden.value = "";
                }
            }

            buildChips();

            // Struktur in den Container einfügen
            while (container.firstChild) {
                container.removeChild(container.firstChild);
            }
            container.appendChild(wrap);
            wrap.appendChild(titleEl);
            wrap.appendChild(boxEl);

            // Beim Absenden die Demos zusätzlich an das Nachrichtenfeld anhängen
            form.addEventListener("submit", function () {
                try {
                    var lines = hidden.value ? hidden.value.split("\\n") : [];
                    if (!lines.length) {
                        return;
                    }
                    // Nur die Zeilen nach der Kopfzeile "Gemerkte Demos:" anhängen
                    var usable = [];
                    var started = false;
                    lines.forEach(function (l) {
                        if (!started) {
                            if (/Gemerkte Demos/i.test(l)) {
                                started = true;
                            }
                            return;
                        }
                        if (l.trim()) {
                            usable.push("• " + l.trim());
                        }
                    });
                    if (usable.length) {
                        var block = "\\n\\n--- Gemerkte Demos ---\\n" + usable.join("\\n") + "\\n";
                        msgField.value = (msgField.value || "") + block;
                    }
                } catch (e) {}
            });
        } catch (e) {
            // Fehler im Kontaktscript dürfen niemals das restliche Frontend blockieren
        }
    });
})();