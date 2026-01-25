// voice-demo-contact.js
// Baut auf der Kontaktseite eine "Gemerkte Demos"-Box unter dem Nachrichtenfeld
// und hängt die Demos an die Nachricht / ein Hidden-Feld an, ohne andere Funktionen zu beeinflussen.

(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
        return;
    }

    document.addEventListener("DOMContentLoaded", () => {
        try {
            const storageKey = "vdemo_memos";
            let raw = null;
            try {
                raw = window.localStorage ? window.localStorage.getItem(storageKey) : null;
            } catch (error) {
                raw = null;
            }

            let memoItems = {};
            if (raw) {
                try {
                    memoItems = JSON.parse(raw) || {};
                } catch (error) {
                    memoItems = {};
                }
            }

            const ids = Object.keys(memoItems);
            if (!ids.length) {
                return;
            }

            let form = document.querySelector(
                "form.fluentform, form[id^='fluentform_'], .fluentform form, form[action*='fluent-form'], form[action*='fluentform']"
            );
            if (!form) {
                form = document.querySelector("form");
            }
            if (!form) {
                return;
            }

            let msgField = null;
            const textareas = form.querySelectorAll("textarea");
            if (!textareas.length) {
                return;
            }

            textareas.forEach((ta) => {
                if (msgField || !ta.id) {
                    return;
                }
                const label = form.querySelector(`label[for="${ta.id}"]`);
                if (label && /nachricht/i.test(label.textContent || "")) {
                    msgField = ta;
                }
            });

            if (!msgField) {
                msgField = textareas[0];
            }

            let hidden = form.querySelector('input[type="hidden"][name="gemerkte_demos"]');
            if (!hidden) {
                hidden = document.createElement("input");
                hidden.type = "hidden";
                hidden.name = "gemerkte_demos";
                form.appendChild(hidden);
            }

            const containers = form.querySelectorAll(".demo-memo-field");
            let container = containers.length ? containers[0] : null;
            if (containers.length > 1) {
                for (let index = 1; index < containers.length; index += 1) {
                    if (containers[index] && containers[index].parentNode) {
                        containers[index].parentNode.removeChild(containers[index]);
                    }
                }
            }

            if (!container) {
                container = document.createElement("div");
                container.className = "demo-memo-field";

                const group = msgField.closest(".ff-el-group");
                if (group && group.parentNode) {
                    group.parentNode.insertBefore(container, group.nextSibling);
                } else if (msgField.parentNode) {
                    msgField.parentNode.insertBefore(container, msgField.nextSibling);
                } else {
                    form.appendChild(container);
                }
            }

            const wrap = document.createElement("div");
            wrap.className = "vdemo-contact-memos-wrap";

            const titleEl = document.createElement("div");
            titleEl.className = "vdemo-contact-memos-title";
            titleEl.textContent = "Gemerkte Demos";

            const boxEl = document.createElement("div");
            boxEl.className = "vdemo-contact-memos";

            const hintEl = document.createElement("div");
            hintEl.className = "vdemo-contact-memos-hint";
            hintEl.textContent = "Deine gemerkten Demos werden mir als Textform bei der Anfrage übermittelt. So habe ich direkt ein Gefühl für den Stil Deiner gewünschten Sprachaufnahmen.";

            let activeIds = ids.slice();

            const buildChips = () => {
                while (boxEl.firstChild) {
                    boxEl.removeChild(boxEl.firstChild);
                }

                if (!activeIds.length) {
                    container.style.display = "none";
                    hidden.value = "";
                    return;
                }

                container.style.display = "";

                const lines = [];

                activeIds.forEach((id) => {
                    const item = memoItems[id] || {};
                    const badge = (item.badge && String(item.badge).trim()) || id;
                    const titleText = item.title || "";
                    const label = `ID ${badge} – ${titleText}`;

                    const chip = document.createElement("span");
                    chip.className = "vdemo-contact-chip";
                    chip.setAttribute("data-memo-id", id);

                    const labelSpan = document.createElement("span");
                    labelSpan.textContent = label;

                    const btn = document.createElement("button");
                    btn.type = "button";
                    btn.className = "vdemo-contact-chip-remove";
                    btn.setAttribute("aria-label", "Aus Liste entfernen");
                    btn.textContent = "×";

                    btn.addEventListener("click", (event) => {
                        event.preventDefault();
                        activeIds = activeIds.filter((value) => value !== id);
                        buildChips();

                        try {
                            delete memoItems[id];
                            if (window.localStorage) {
                                window.localStorage.setItem(storageKey, JSON.stringify(memoItems));
                            }
                        } catch (error) {
                            // Ignorieren.
                        }
                    });

                    chip.appendChild(labelSpan);
                    chip.appendChild(btn);
                    boxEl.appendChild(chip);

                    lines.push(label);
                });

                boxEl.appendChild(hintEl);

                hidden.value = lines.length ? `Gemerkte Demos:\n${lines.join("\n")}` : "";
            };

            buildChips();

            while (container.firstChild) {
                container.removeChild(container.firstChild);
            }
            container.appendChild(wrap);
            wrap.appendChild(titleEl);
            wrap.appendChild(boxEl);

            form.addEventListener("submit", () => {
                try {
                    const lines = hidden.value ? hidden.value.split("\\n") : [];
                    if (!lines.length) {
                        return;
                    }
                    const usable = [];
                    let started = false;
                    lines.forEach((line) => {
                        if (!started) {
                            if (/Gemerkte Demos/i.test(line)) {
                                started = true;
                            }
                            return;
                        }
                        if (line.trim()) {
                            usable.push(`• ${line.trim()}`);
                        }
                    });
                    if (usable.length) {
                        const block = `\\n\\n--- Gemerkte Demos ---\\n${usable.join("\\n")}\\n`;
                        msgField.value = `${msgField.value || ""}${block}`;
                    }
                } catch (error) {
                    // Ignorieren.
                }
            });
        } catch (error) {
            // Fehler im Kontaktscript dürfen niemals das restliche Frontend blockieren.
        }
    });
})();
