/* Voice Demo System – Filter, Player, Merkliste, Drawer, aktive Filter + Custom-Dropdowns + Standalone */
document.addEventListener("DOMContentLoaded", function () {
    var wrapper = document.getElementById("vdemo-wrapper");
    var hasStandalone = document.querySelector(".vdemo-standalone-player");
    var hasDrawerOnly = document.getElementById("vdemo-drawer");

    if (!wrapper && !hasStandalone && !hasDrawerOnly) {
        return;
    }

    var grid = document.getElementById("vdemo-grid");
    var cards = grid ? Array.prototype.slice.call(grid.querySelectorAll(".vdemo-card")) : [];
    var pageSize = 9;
    var currentPage = 1;
    var currentPageCards = cards.slice();
    var paginationNav = null;

    
    
    function changePageWithFade(targetPage, totalPages) {
        if (!grid) return;
        if (typeof targetPage !== "number" || isNaN(targetPage)) {
            return;
        }
        if (targetPage < 1 || targetPage > totalPages) {
            return;
        }
        if (currentPage === targetPage) {
            return;
        }

        grid.classList.remove("vdemo-grid-fade-in");
        grid.classList.add("vdemo-grid-fade-out");

        window.setTimeout(function () {
            currentPage = targetPage;
            applyPagination();
            grid.classList.remove("vdemo-grid-fade-out");
            grid.classList.add("vdemo-grid-fade-in");

            var anchor = document.getElementById("Demo-Grid-start") || grid || document.getElementById("vdemo-grid");
            if (anchor && typeof anchor.scrollIntoView === "function") {
                anchor.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
        }, 160);
    }

    function renderPagination() {
        if (!grid) return;

        var allVisible = currentPageCards && currentPageCards.length ? currentPageCards : cards.slice();
        var total = allVisible.length;
        var totalPages = Math.max(1, Math.ceil(total / pageSize));

        // Existierende Navigation entfernen
        if (paginationNav && paginationNav.parentNode) {
            paginationNav.parentNode.removeChild(paginationNav);
        }

        if (totalPages <= 1) {
            paginationNav = null;
            cards.forEach(function (card) {
                card.classList.remove("vdemo-card-page-hidden");
            });
            return;
        }

        paginationNav = document.createElement("nav");
        paginationNav.className = "vdemo-pagination";
        paginationNav.setAttribute("aria-label", "Demos");

        var pagesWrap = document.createElement("div");
        pagesWrap.className = "vdemo-pagination-pages";

        for (var i = 1; i <= totalPages; i++) {
            (function (pageNum) {
                var link = document.createElement("button");
                link.type = "button";
                link.className = "vdemo-page-link";
                if (pageNum === currentPage) {
                    link.classList.add("vdemo-page-link-active");
                }
                link.textContent = String(pageNum);
                link.addEventListener("click", function () {
                    changePageWithFade(pageNum, totalPages);
                });
                pagesWrap.appendChild(link);
            })(i);
        }

        paginationNav.appendChild(pagesWrap);

        var nextButton = document.createElement("button");
        nextButton.type = "button";
        nextButton.className = "vdemo-page-next";
        nextButton.setAttribute("aria-label", "Nächste Seite");
        nextButton.disabled = currentPage >= totalPages;

        var nextText = document.createElement("span");
        nextText.textContent = "NÄCHSTE";
        nextButton.appendChild(nextText);

        var nextIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        nextIcon.setAttribute("viewBox", "0 0 24 24");
        nextIcon.setAttribute("aria-hidden", "true");
        var nextPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        nextPath.setAttribute("d", "M8.293 5.293a1 1 0 0 1 1.414 0l6 6a1 1 0 0 1 0 1.414l-6 6a1 1 0 1 1-1.414-1.414L13.586 12 8.293 6.707a1 1 0 0 1 0-1.414z");
        nextIcon.appendChild(nextPath);
        nextButton.appendChild(nextIcon);

        nextButton.addEventListener("click", function () {
            if (currentPage < totalPages) {
                changePageWithFade(currentPage + 1, totalPages);
            }
        });

        paginationNav.appendChild(nextButton);

        var afterNode = grid;
        if (afterNode && afterNode.parentNode) {
            afterNode.parentNode.insertBefore(paginationNav, afterNode.nextSibling);
        }
    }

    function applyPagination() {
        if (!grid) return;

        var allVisible = currentPageCards && currentPageCards.length ? currentPageCards : cards.filter(function (c) {
            return !c.classList.contains("vdemo-card-filter-hidden");
        });

        var total = allVisible.length;
        var totalPages = Math.max(1, Math.ceil(total / pageSize));
        if (currentPage > totalPages) {
            currentPage = totalPages;
        }
        var start = (currentPage - 1) * pageSize;
        var end = start + pageSize;

        cards.forEach(function (card) {
            card.classList.add("vdemo-card-page-hidden");
        });

        allVisible.slice(start, end).forEach(function (card) {
            card.classList.remove("vdemo-card-page-hidden");
        });

        renderPagination();
        bindMemoButtonsClicks();
        if (typeof syncMemoButtons === "function") {
            syncMemoButtons();
        }
    }
var filterSelects = document.querySelectorAll(".vdemo-select");
    var resetButton = document.getElementById("vdemo-reset-button");
    var resultCount = document.getElementById("vdemo-result-count");

    var activeFilterBar = document.getElementById("vdemo-active-filters");
    var activeFilterChips = document.getElementById("vdemo-active-filters-chips");

    var drawer = document.getElementById("vdemo-drawer");
    var drawerToggle = document.getElementById("vdemo-drawer-toggle");
    var drawerClose = document.getElementById("vdemo-drawer-close");
    var drawerClear = document.getElementById("vdemo-drawer-clear");
    var drawerList = document.getElementById("vdemo-drawer-list");
    var drawerCount = document.getElementById("vdemo-drawer-count");
    var drawerAdd = document.getElementById("vdemo-drawer-add");
    var drawerShare = document.getElementById("vdemo-drawer-share");

    var memoButtons = document.querySelectorAll(".vdemo-memo-button");
    var memoItems = {};
    var storageKey = "vdemo_memos";

    var currentAudio = null;
    var currentAudioBlock = null;

    var dropdownConfigs = [];
    var prevMemoCount = 0;

    var filterLabelMap = {
        genre: "Genre",
        style: "Stil",
        mood: "Stimmung",
        speed: "Tempo",
        pitch: "Tonhöhe",
        industry: "Branche"
    };

    function loadMemosFromStorage() {
        try {
            var raw = window.localStorage.getItem(storageKey);
            if (!raw) {
                return;
            }
            var data = JSON.parse(raw);
            if (data && typeof data === "object") {
                memoItems = data;
            }
        } catch (_e) {
            memoItems = {};
        }
    }

    function saveMemosToStorage() {
        try {
            window.localStorage.setItem(storageKey, JSON.stringify(memoItems));
        } catch (_e) {}
    }

    function formatTime(seconds) {
        var s = Number(seconds);
        if (!isFinite(s) || s < 0) {
            s = 0;
        }
        var m = Math.floor(s / 60);
        var n = Math.floor(s % 60);
        var nn = n < 10 ? "0" + n : String(n);
        return m + ":" + nn;
    }

    function resetAudioUI(block) {
        if (!block) return;
        var audio = block.querySelector(".vdemo-audio");
        var playBtn = block.querySelector(".vdemo-play-button");
        var fill = block.querySelector(".vdemo-progress-fill");
        var timeLabel = block.querySelector(".vdemo-time-label");

        if (audio) {
            audio.currentTime = 0;
            audio.pause();
        }
        if (playBtn) {
            playBtn.classList.remove("vdemo-play-button-active");
        }
        if (fill) {
            fill.style.width = "0%";
        }
        if (timeLabel) {
            timeLabel.textContent = "0:00";
        }
    }

    function wireAudioContainers(root) {
        if (!root) return;

        var blocks = root.querySelectorAll(".vdemo-card-audio, .vdemo-drawer-audio");
        blocks.forEach(function (block) {
            if (block.getAttribute("data-vdemo-bound") === "1") {
                return;
            }
            var audio = block.querySelector(".vdemo-audio");
            var playBtn = block.querySelector(".vdemo-play-button");
            var progressTrack = block.querySelector(".vdemo-progress-track");
            var progressFill = block.querySelector(".vdemo-progress-fill");
            var timeLabel = block.querySelector(".vdemo-time-label");

            if (!audio || !playBtn || !timeLabel) {
                return;
            }

            block.setAttribute("data-vdemo-bound", "1");

            playBtn.addEventListener("click", function () {
                if (!audio.src) return;

                if (currentAudio && currentAudio !== audio) {
                    resetAudioUI(currentAudioBlock);
                }

                if (audio.paused) {
                    audio.play();
                    currentAudio = audio;
                    currentAudioBlock = block;
                    playBtn.classList.add("vdemo-play-button-active");
                } else {
                    audio.pause();
                    playBtn.classList.remove("vdemo-play-button-active");
                }
            });

            audio.addEventListener("timeupdate", function () {
                if (isFinite(audio.duration) && audio.duration > 0 && progressFill && progressTrack) {
                    var ratio = audio.currentTime / audio.duration;
                    ratio = Math.max(0, Math.min(1, ratio));
                    progressFill.style.width = String(ratio * 100) + "%";
                }
                timeLabel.textContent = formatTime(audio.currentTime);
            });

            audio.addEventListener("ended", function () {
                resetAudioUI(block);
                if (currentAudio === audio) {
                    currentAudio = null;
                    currentAudioBlock = null;
                }
            });

            if (progressTrack && progressFill) {
                progressTrack.addEventListener("click", function (event) {
                    var rect = progressTrack.getBoundingClientRect();
                    var x = event.clientX - rect.left;
                    var ratio = x / rect.width;
                    ratio = Math.max(0, Math.min(1, ratio));
                    if (isFinite(audio.duration) && audio.duration > 0) {
                        audio.currentTime = audio.duration * ratio;
                    }
                });
            }
        });
    }

    function updateMultiToggleLabel(select, toggle) {
        var labels = [];
        Array.prototype.forEach.call(select.options, function (opt) {
            if (!opt.selected || !opt.value || opt.value === "all") return;
            labels.push(opt.textContent);
        });

        if (labels.length === 0) {
            toggle.textContent = "Alle";
        } else if (labels.length === 1) {
            toggle.textContent = labels[0];
        } else {
            toggle.textContent = labels[0] + " +" + (labels.length - 1);
        }
    }

    function updateSingleToggleLabel(select, toggle) {
        var opt = select.options[select.selectedIndex];
        if (!opt || !opt.value || opt.value === "all") {
            toggle.textContent = "Alle";
        } else {
            toggle.textContent = opt.textContent;
        }
    }

    function closeAllDropdownMenus() {
        dropdownConfigs.forEach(function (cfg) {
            cfg.wrapper.classList.remove("vdemo-multi-open");
        });
    }

    function initDropdownUI() {
        dropdownConfigs = [];

        filterSelects.forEach(function (sel) {
            var parent = sel.parentNode;
            if (!parent || !parent.classList.contains("vdemo-select-wrapper")) return;

            var isMulti = !!sel.multiple;
            parent.classList.add("vdemo-select-wrapper-advanced");

            var wrapper = document.createElement("div");
            wrapper.className = "vdemo-multi";

            var toggle = document.createElement("button");
            toggle.type = "button";
            toggle.className = "vdemo-multi-toggle";
            toggle.textContent = "Alle";

            var menu = document.createElement("div");
            menu.className = "vdemo-multi-menu";

            Array.prototype.forEach.call(sel.options, function (opt) {
                var value = opt.value;
                var text = opt.textContent;

                if (isMulti) {
                    if (!value || value === "all") return;

                    var row = document.createElement("label");
                    row.className = "vdemo-multi-option";
                    row.setAttribute("data-value", value);

                    var cb = document.createElement("input");
                    cb.type = "checkbox";
                    cb.className = "vdemo-multi-checkbox";
                    cb.value = value;

                    var span = document.createElement("span");
                    span.textContent = text;

                    row.appendChild(cb);
                    row.appendChild(span);
                    menu.appendChild(row);

                    cb.addEventListener("change", function () {
                        var val = cb.value;
                        Array.prototype.forEach.call(sel.options, function (o) {
                            if (o.value === val) {
                                o.selected = cb.checked;
                            }
                        });

                        var anySelected = Array.prototype.some.call(sel.options, function (o) {
                            return o.value !== "all" && o.selected;
                        });
                        var allOpt = sel.querySelector('option[value="all"]');
                        if (allOpt) {
                            if (!anySelected) {
                                Array.prototype.forEach.call(sel.options, function (o) {
                                    o.selected = false;
                                });
                                allOpt.selected = true;
                            } else {
                                allOpt.selected = false;
                            }
                        }

                        updateMultiToggleLabel(sel, toggle);
                        applyFilters();
                    });
                } else {
                    var btn = document.createElement("button");
                    btn.type = "button";
                    btn.className = "vdemo-single-option";
                    btn.textContent = text;
                    btn.setAttribute("data-value", value);

                    btn.addEventListener("click", function (e) {
                        e.stopPropagation();
                        sel.value = value;
                        closeAllDropdownMenus();
                        updateSingleToggleLabel(sel, toggle);
                        applyFilters();
                    });

                    menu.appendChild(btn);
                }
            });

            sel.classList.add("vdemo-select-hidden");

            parent.insertBefore(wrapper, sel);
            wrapper.appendChild(toggle);
            wrapper.appendChild(menu);
            wrapper.appendChild(sel);

            toggle.addEventListener("click", function (e) {
                e.stopPropagation();
                var isOpen = wrapper.classList.contains("vdemo-multi-open");
                closeAllDropdownMenus();
                if (!isOpen) {
                    wrapper.classList.add("vdemo-multi-open");
                }
            });

            menu.addEventListener("click", function (e) {
                e.stopPropagation();
            });

            dropdownConfigs.push({
                select: sel,
                wrapper: wrapper,
                toggle: toggle,
                menu: menu,
                isMulti: isMulti
            });
        });

        document.addEventListener("click", function () {
            closeAllDropdownMenus();
        });
    }

    function syncDropdownUIFromSelects() {
        dropdownConfigs.forEach(function (cfg) {
            var sel = cfg.select;
            var toggle = cfg.toggle;
            var menu = cfg.menu;

            if (cfg.isMulti) {
                updateMultiToggleLabel(sel, toggle);
                var checkboxes = menu.querySelectorAll(".vdemo-multi-checkbox");
                checkboxes.forEach(function (cb) {
                    var val = cb.value;
                    var found = null;
                    Array.prototype.forEach.call(sel.options, function (o) {
                        if (o.value === val) {
                            found = o;
                        }
                    });
                    cb.checked = !!(found && found.selected);
                });
            } else {
                updateSingleToggleLabel(sel, toggle);
            }
        });
    }

    function buildActiveFilters() {
        if (!activeFilterChips || !activeFilterBar) return;

        activeFilterChips.innerHTML = "";
        var totalChips = 0;

        filterSelects.forEach(function (select) {
            var key = select.getAttribute("data-filter-key");
            if (!key) return;
            var label = filterLabelMap[key] || key;

            if (select.multiple) {
                var values = [];
                var labels = [];
                Array.prototype.forEach.call(select.options, function (opt) {
                    if (!opt.selected || !opt.value || opt.value === "all") return;
                    values.push(opt.value);
                    labels.push(opt.textContent);
                });
                if (values.length > 0) {
                    createFilterChip(select, key, label, values, labels, true);
                    totalChips += 1;
                }
            } else {
                var value = select.value;
                if (!value || value === "all") return;
                var opt = select.options[select.selectedIndex];
                var labelText = opt ? opt.textContent : value;
                createFilterChip(select, key, label, [value], [labelText], false);
                totalChips += 1;
            }
        });

        if (totalChips === 0) {
            activeFilterBar.classList.add("vdemo-active-filters-empty");
        } else {
            activeFilterBar.classList.remove("vdemo-active-filters-empty");
        }
    }

    function createFilterChip(select, key, label, values, labels, isMulti) {
        var chip = document.createElement("button");
        chip.type = "button";
        chip.className = "vdemo-filter-chip";

        var spanLabel = document.createElement("span");
        spanLabel.className = "vdemo-filter-chip-label";
        spanLabel.textContent = label + ": " + labels.join(", ");

        var spanClose = document.createElement("span");
        spanClose.className = "vdemo-filter-chip-close";
        spanClose.setAttribute("aria-hidden", "true");
        spanClose.textContent = "×";

        chip.appendChild(spanLabel);
        chip.appendChild(spanClose);

        chip.addEventListener("click", function () {
            if (isMulti) {
                Array.prototype.forEach.call(select.options, function (opt) {
                    if (values.indexOf(opt.value) !== -1) {
                        opt.selected = false;
                    }
                });
                var anySelected = Array.prototype.some.call(select.options, function (opt) {
                    return opt.selected && opt.value !== "all";
                });
                var allOpt = select.querySelector('option[value="all"]');
                if (allOpt && !anySelected) {
                    Array.prototype.forEach.call(select.options, function (opt) {
                        opt.selected = false;
                    });
                    allOpt.selected = true;
                }
            } else {
                select.value = "all";
            }
            applyFilters();
        });

        activeFilterChips.appendChild(chip);
    }

    function computeActiveFilters() {
        var activeFilters = {};

        filterSelects.forEach(function (select) {
            var key = select.getAttribute("data-filter-key");
            if (!key) return;

            if (select.multiple) {
                var values = [];
                Array.prototype.forEach.call(select.options, function (opt) {
                    if (opt.selected && opt.value && opt.value !== "all") {
                        values.push(opt.value.toLowerCase());
                    }
                });
                if (values.length > 0) {
                    activeFilters[key] = values;
                }
            } else {
                var value = select.value;
                if (value && value !== "all") {
                    activeFilters[key] = [value.toLowerCase()];
                }
            }
        });

        return activeFilters;
    }

    function updateFilterOptionAvailability(allowedByKey) {
        filterSelects.forEach(function (select) {
            var key = select.getAttribute("data-filter-key");
            if (!key) return;

            if (key === "genre") {
                return;
            }

            var allowed = allowedByKey[key];
            if (!allowed) return;

            if (select.multiple) {
                Array.prototype.forEach.call(select.options, function (opt) {
                    if (!opt.value || opt.value === "all") return;
                    var val = opt.value.toLowerCase();
                    var isAllowed = allowed.has(val);
                    opt.disabled = !isAllowed;
                    if (!isAllowed && opt.selected) {
                        opt.selected = false;
                    }
                });

                var anySelected = Array.prototype.some.call(select.options, function (opt) {
                    return opt.selected && opt.value !== "all";
                });
                var allOpt = select.querySelector('option[value="all"]');
                if (allOpt && !anySelected) {
                    Array.prototype.forEach.call(select.options, function (opt) {
                        opt.selected = false;
                    });
                    allOpt.selected = true;
                }
            } else {
                var selected = select.options[select.selectedIndex];
                if (selected && selected.value && selected.value !== "all") {
                    var sval = selected.value.toLowerCase();
                    if (!allowed.has(sval)) {
                        select.value = "all";
                    }
                }
            }

            var cfg = dropdownConfigs.find(function (c) { return c.select === select; });
            if (cfg && cfg.menu) {
                var rows = cfg.menu.querySelectorAll("[data-value]");
                rows.forEach(function (row) {
                    var val = row.getAttribute("data-value");
                    if (!val || val === "all") {
                        row.style.display = "";
                        return;
                    }
                    var isAllowed = allowed.has(val.toLowerCase());
                    row.style.display = isAllowed ? "" : "none";
                });
            }
        });

        syncDropdownUIFromSelects();
    }

    function applyFilters() {
        if (!grid) {
            return;
        }

        var activeFilters = computeActiveFilters();

        grid.classList.remove("vdemo-grid-fade-in");
        grid.classList.add("vdemo-grid-fade-out");

        window.setTimeout(function () {
            var matches = 0;
            var visibleCards = [];

            cards.forEach(function (card) {
                var visible = true;

                Object.keys(activeFilters).forEach(function (key) {
                    if (!visible) return;
                    var attr = card.getAttribute("data-" + key) || "";
                    var tokens = attr.toLowerCase().split(/\s+/).filter(function (t) { return t.length > 0; });
                    if (tokens.length === 0) {
                        visible = false;
                        return;
                    }
                    var values = activeFilters[key];
                    var hasAny = values.some(function (v) {
                        return tokens.indexOf(v) !== -1;
                    });
                    if (!hasAny) {
                        visible = false;
                    }
                });

                if (visible) {
                    card.classList.remove("vdemo-card-filter-hidden");
                    matches += 1;
                    visibleCards.push(card);
                } else {
                    card.classList.add("vdemo-card-filter-hidden");
                }
            });

            if (resultCount) {
                resultCount.textContent = String(matches);
            }

            var allowedByKey = {
                genre: new Set(),
                style: new Set(),
                mood: new Set(),
                speed: new Set(),
                pitch: new Set(),
                industry: new Set()
            };

            visibleCards.forEach(function (card) {
                ["style", "mood", "speed", "pitch", "industry", "genre"].forEach(function (key) {
                    var attr = card.getAttribute("data-" + key) || "";
                    var tokens = attr.toLowerCase().split(/\s+/).filter(function (t) { return t.length > 0; });
                    tokens.forEach(function (t) {
                        allowedByKey[key].add(t);
                    });
                });
            });

            updateFilterOptionAvailability(allowedByKey);
            buildActiveFilters();

            // Pagination anwenden
            currentPageCards = visibleCards.slice();
            currentPage = 1;
            applyPagination();

            grid.classList.remove("vdemo-grid-fade-out");
            grid.classList.add("vdemo-grid-fade-in");
        }, 160);
    }

    
filterSelects.forEach(function (select) {
        select.addEventListener("change", applyFilters);
    });

    if (resetButton) {
        resetButton.addEventListener("click", function () {
            filterSelects.forEach(function (select) {
                if (select.multiple) {
                    Array.prototype.forEach.call(select.options, function (opt) {
                        opt.selected = (opt.value === "all");
                    });
                } else {
                    select.value = "all";
                }
            });
            applyFilters();
        });
    }

    function updateDrawerCount() {
        var count = Object.keys(memoItems).length;
        if (drawerCount) {
            drawerCount.textContent = String(count);
        }

        if (drawerToggle) {
            if (count > 0) {
                drawerToggle.classList.add("vdemo-has-items");
                drawerToggle.classList.remove("vdemo-is-hidden");
                drawerToggle.style.pointerEvents = "";
                drawerToggle.style.display = "inline-flex";
                if (prevMemoCount === 0) {
                    drawerToggle.classList.add("vdemo-drawer-toggle-pop");
                    setTimeout(function () {
                        drawerToggle.classList.remove("vdemo-drawer-toggle-pop");
                    }, 600);
                }
            } else {
                drawerToggle.classList.remove("vdemo-has-items");
                drawerToggle.classList.remove("vdemo-drawer-toggle-active");
                drawerToggle.classList.add("vdemo-is-hidden");
                drawerToggle.style.pointerEvents = "none";
                drawerToggle.style.display = "none";
            }
        }

        if (count === 0 && drawer) {
            drawer.classList.remove("vdemo-drawer-open");
            drawer.setAttribute("aria-hidden", "true");
        }

        prevMemoCount = count;
        updateFluentFormsField();
        buildContactMemoBox();
    }

    function renderDrawerList(newId) {
        if (!drawerList) return;
        drawerList.innerHTML = "";

        var ids = Object.keys(memoItems);
        if (ids.length === 0) {
            if (drawer) {
                drawer.classList.remove("vdemo-drawer-open");
                drawer.setAttribute("aria-hidden", "true");
            }
            return;
        }

        var grouped = {};

        ids.forEach(function (id) {
            var item = memoItems[id];
            var slug = (item && item.genreSlug) ? item.genreSlug : "ohne-genre";
            var label = (item && item.genre) ? item.genre : "Weitere Demos";
            if (!grouped[slug]) {
                grouped[slug] = { label: label, entries: [] };
            }
            grouped[slug].entries.push({ id: id, item: item });
        });

        Object.keys(grouped).forEach(function (slug) {
            var group = grouped[slug];

            var groupLi = document.createElement("li");
            groupLi.className = "vdemo-drawer-group";

            var header = document.createElement("div");
            header.className = "vdemo-drawer-group-header-strip";
            header.textContent = group.label || "Weitere Demos";

            var itemsWrap = document.createElement("div");
            itemsWrap.className = "vdemo-drawer-group-items";

            group.entries.forEach(function (entry) {
                var id = entry.id;
                var item = entry.item || {};
                var title = item.title || "";
                var info = item.info || "";
                var audioUrl = item.audio || "";
                var badge = item.badge || "";

                var card = document.createElement("div");
                card.className = "vdemo-drawer-item";
                card.setAttribute("data-memo-id", id);
                if (newId && String(id) === String(newId)) {
                    card.className += " vdemo-drawer-item--new";
                    card.className += " vdemo-drawer-item--enter";
                }

                var titleRow = document.createElement("div");
                titleRow.className = "vdemo-drawer-item-title-row";

                // ID-Badge wie im Demo-Grid (links vor dem Titel)
                var idBadge = null;
                if (item && item.badge) {
                    idBadge = document.createElement("span");
                    idBadge.className = "vdemo-badge vdemo-badge-inline";
                    idBadge.textContent = item.badge;
                }

                var titleSpan = document.createElement("span");
                titleSpan.className = "vdemo-drawer-item-title";
                titleSpan.textContent = title;

                var actionsWrap = document.createElement("div");
                actionsWrap.className = "vdemo-drawer-item-actions";

                var infoBadge = null;
                if (info) {
                    infoBadge = document.createElement("span");
                    infoBadge.className = "vdemo-drawer-info-badge";

                    var infoInner = document.createElement("div");
                    infoInner.className = "vdemo-drawer-info-tooltip";

                    var parts = info.split("•").map(function (s) {
                        return s.trim();
                    }).filter(function (s) {
                        return s.length > 0;
                    });

                    if (!parts.length) {
                        parts = [info];
                    }

                    parts.forEach(function (part) {
                        var chip = document.createElement("span");
                        chip.className = "vdemo-drawer-info-chip";
                        chip.textContent = part;
                        infoInner.appendChild(chip);
                    });

                    infoBadge.appendChild(infoInner);
                }

                var removeBtn = document.createElement("button");
                removeBtn.type = "button";
                removeBtn.className = "vdemo-drawer-item-remove";
                removeBtn.textContent = "Entfernen";
                removeBtn.addEventListener("click", function () {
                    toggleMemo(id, item);
                });

                if (infoBadge) {
                    actionsWrap.appendChild(infoBadge);
                }
                actionsWrap.appendChild(removeBtn);

                if (idBadge) {
                    titleRow.appendChild(idBadge);
                }
                titleRow.appendChild(titleSpan);
                titleRow.appendChild(actionsWrap);

                card.appendChild(titleRow);

                if (audioUrl) {
                    var audioRow = document.createElement("div");
                    audioRow.className = "vdemo-drawer-audio";

                    var playBtn = document.createElement("button");
                    playBtn.type = "button";
                    playBtn.className = "vdemo-play-button";

                    var iconPlay = document.createElement("span");
                    iconPlay.className = "vdemo-play-icon-play";

                    var iconPause = document.createElement("span");
                    iconPause.className = "vdemo-play-icon-pause";

                    playBtn.appendChild(iconPlay);
                    playBtn.appendChild(iconPause);

                    var time = document.createElement("span");
                    time.className = "vdemo-time-label";
                    time.textContent = "0:00";

                    var progWrap = document.createElement("div");
                    progWrap.className = "vdemo-progress-wrapper";

                    var progTrack = document.createElement("div");
                    progTrack.className = "vdemo-progress-track";

                    var progFill = document.createElement("div");
                    progFill.className = "vdemo-progress-fill";

                    progTrack.appendChild(progFill);
                    progWrap.appendChild(progTrack);

                    var audioEl = document.createElement("audio");
                    audioEl.className = "vdemo-audio";
                    audioEl.setAttribute("src", audioUrl);
                    audioEl.setAttribute("preload", "none");

                    audioRow.appendChild(playBtn);
                    audioRow.appendChild(time);
                    audioRow.appendChild(progWrap);
                    audioRow.appendChild(audioEl);

                    card.appendChild(audioRow);
                }

                itemsWrap.appendChild(card);
            });

            groupLi.appendChild(header);
            groupLi.appendChild(itemsWrap);
            drawerList.appendChild(groupLi);
        });

        wireAudioContainers(drawerList);

        var enteringItems = drawerList.querySelectorAll(".vdemo-drawer-item--enter");
        if (enteringItems.length) {
            window.setTimeout(function () {
                enteringItems.forEach(function (itemEl) {
                    itemEl.classList.remove("vdemo-drawer-item--enter");
                });
            }, 30);
        }
    }

    function openDrawer() {
        if (!drawer || !drawerToggle) return;
        drawer.classList.add("vdemo-drawer-open");
        drawerToggle.classList.add("vdemo-drawer-toggle-active");
        drawerToggle.classList.add("vdemo-is-hidden");
        drawerToggle.style.pointerEvents = "none";
        drawerToggle.style.display = "none";
        drawer.setAttribute("aria-hidden", "false");
    }

    function closeDrawer() {
        if (!drawer || !drawerToggle) return;
        drawer.classList.remove("vdemo-drawer-open");
        drawerToggle.classList.remove("vdemo-drawer-toggle-active");
        if (Object.keys(memoItems).length > 0) {
            drawerToggle.classList.remove("vdemo-is-hidden");
            drawerToggle.style.pointerEvents = "";
            drawerToggle.style.display = "inline-flex";
        } else {
            drawerToggle.classList.add("vdemo-is-hidden");
            drawerToggle.style.pointerEvents = "none";
            drawerToggle.style.display = "none";
        }
        drawer.setAttribute("aria-hidden", "true");
    }

    if (drawerToggle) {
        drawerToggle.addEventListener("click", function () {
            if (drawer.classList.contains("vdemo-drawer-open")) {
                closeDrawer();
            } else {
                openDrawer();
            }
        });
    }

    if (drawerClose) {
        drawerClose.addEventListener("click", function () {
            closeDrawer();
        });
    }

    if (drawerAdd) {
        drawerAdd.addEventListener("click", function () {
            // Weiterleitung zur Kontaktseite mit passendem Anchor (Desktop vs. Mobil)
            var basePath = "/kontakt/";
            var isMobile = false;
            try {
                if (window.matchMedia) {
                    isMobile = window.matchMedia("(max-width: 768px)").matches;
                } else if (typeof window.innerWidth === "number") {
                    isMobile = window.innerWidth <= 768;
                }
            } catch (e) {}

            var anchor = isMobile ? "#kontaktformular_direkt-mobil" : "#kontaktformular_direkt";
            window.location.href = basePath + anchor;
        });
    }

    if (drawerClear) {
        drawerClear.addEventListener("click", function () {
            memoItems = {};
            saveMemosToStorage();
            syncMemoButtons();
            renderDrawerList();
            updateDrawerCount();
        });
    }

    if (drawerShare) {
        drawerShare.addEventListener("click", function () {
            var ids = Object.keys(memoItems);
            if (!ids.length) return;

            var url = new URL(window.location.href.split("#")[0]);
            url.searchParams.set("vdemo_favs", ids.join(","));
            var shareUrl = url.toString();

            if (navigator.share) {
                navigator.share({
                    title: "Sprecher Pascal Krell - Demos - Merkliste",
                    text: "Hier ist unsere Auswahl an gemerkten Sprecher-Demos.",
                    url: shareUrl
                }).catch(function () {});
            } else if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(shareUrl).then(function () {
                    alert("Der Link zu Deiner Merkliste wurde in die Zwischenablage kopiert.");
                }).catch(function () {
                    alert("Hier ist Dein Link zur Merkliste:\n" + shareUrl);
                });
            } else {
                alert("Hier ist Dein Link zur Merkliste:\n" + shareUrl);
            }
        });
    }

    function toggleMemo(id, data) {
        var key = String(id);
        var hadMemos = Object.keys(memoItems).length > 0;
        var isRemoving = !!memoItems[key];
        var drawerItem = null;

        if (isRemoving && drawerList) {
            drawerItem = drawerList.querySelector('.vdemo-drawer-item[data-memo-id="' + key + '"]');
        }

        if (isRemoving && drawerItem) {
            drawerItem.classList.add("vdemo-drawer-item--exit");
            window.setTimeout(function () {
                delete memoItems[key];
                saveMemosToStorage();
                syncMemoButtons();
                renderDrawerList();
                updateDrawerCount();
            }, 220);
        } else {
            if (memoItems[key]) {
                delete memoItems[key];
            } else {
                memoItems[key] = data;
            }
            saveMemosToStorage();
            syncMemoButtons();
            renderDrawerList(memoItems[key] ? id : null);
            updateDrawerCount();

            var hasMemosNow = Object.keys(memoItems).length > 0;

            // Auf der Demo-Seite: beim ersten Eintrag Merkliste automatisch öffnen
            if (!hadMemos && hasMemosNow && grid) {
                openDrawer();
            }
        }
    }

    function syncMemoButtons() {
        memoButtons = document.querySelectorAll(".vdemo-memo-button");
        memoButtons.forEach(function (btn) {
            var id = btn.getAttribute("data-demo-id");
            var label = btn.querySelector(".vdemo-memo-label");
            var miniTooltip = btn.querySelector(".vdemo-memo-mini-tooltip");

            if (memoItems[id]) {
                btn.classList.add("vdemo-memo-button-active");
                if (label) {
                    label.textContent = "Gemerkt";
                }
                if (miniTooltip) {
                    miniTooltip.textContent = "Nicht mehr merken";
                }
            } else {
                btn.classList.remove("vdemo-memo-button-active");
                if (label) {
                    label.textContent = "Auf die Merkliste";
                }
                if (miniTooltip) {
                    miniTooltip.textContent = "Auf die Merkliste setzen";
                }
            }
        });
    }


    
    function updateFluentFormsField() {
        var lines = [];
        Object.keys(memoItems).forEach(function (id) {
            var item = memoItems[id];
            var lineId = (item.badge && item.badge.trim()) ? item.badge.trim() : id;
            var line = lineId + " " + (item.title || "");
            if (item.info) {
                line += " | " + item.info;
            }
            if (item.genre) {
                line += " | Genre: " + item.genre;
            }
            lines.push(line);
        });

        var text = "";
        if (lines.length > 0) {
            text = "Gemerkte Demos:\n" + lines.join("\n");
        }

        var fields = document.querySelectorAll(".demo-memo-field");
        if (fields && fields.length > 0) {
            fields.forEach(function (field) {
                field.value = text;
            });
        }
    }

    function buildContactMemoBox() {
        try {
            // Formular anhand manueller Anker-Position finden
            var anchor = document.querySelector(".vdemo-contact-memos-anchor");
            if (!anchor) return;

            var form = anchor.closest("form");
            if (!form) return;

            // Nachrichtenfeld finden (Label mit "Nachricht" bevorzugt)
            var msgField = null;
            var textareas = form.querySelectorAll("textarea");
            textareas.forEach(function (ta) {
                if (msgField) return;
                var label = ta.id ? form.querySelector('label[for="' + ta.id + '"]') : null;
                if (label && /nachricht/i.test(label.textContent || "")) {
                    msgField = ta;
                }
            });
            if (!msgField && textareas.length) {
                msgField = textareas[0];
            }
            if (!msgField) return;

            // Wrapper nur einmal anlegen
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
                hint.textContent = "Die von Dir ausgewählten Demos werden beim Absenden Deiner Nachricht automatisch mitgeschickt, um Deine Wünsche für die Sprachaufnahmen besser zu verstehen.";

                var hidden = document.createElement("input");
                hidden.type = "hidden";
                hidden.name = "gemerkte_demos";
                hidden.className = "demo-memo-field";

                wrap.appendChild(title);
                wrap.appendChild(box);
                wrap.appendChild(hint);
                wrap.appendChild(hidden);

                // Beim Absenden die gemerkten Demos zusätzlich an das Nachrichtenfeld anhängen,
                // damit sie sicher in E-Mail und Backend erscheinen.
                if (!form.__vdemoMemoSubmitBound) {
                    form.__vdemoMemoSubmitBound = true;
                    form.addEventListener("submit", function () {
                        try {
                            var listLines = [];
                            Object.keys(memoItems || {}).forEach(function (id) {
                                var item = memoItems[id] || {};
                                var badge = (item.badge && String(item.badge).trim()) || id;
                                var title = item.title || "";
                                var line = "ID " + badge + " – " + title;
                                if (item.info) {
                                    line += " | " + item.info;
                                }
                                if (item.genre) {
                                    line += " | Genre: " + item.genre;
                                }
                                listLines.push(line);
                            });

                            var hf = wrap.querySelector(".demo-memo-field");
                            if (hf) {
                                hf.value = listLines.join("\n");
                            }
                        } catch (e) {}
                    });
                }

                var group = msgField.closest(".ff-el-group");
                if (anchor && anchor.parentNode) {
                    anchor.parentNode.insertBefore(wrap, anchor.nextSibling);
                } else if (group && group.parentNode) {
                    group.parentNode.insertBefore(wrap, group.nextSibling);
                } else if (msgField && msgField.parentNode) {
                    msgField.parentNode.insertBefore(wrap, msgField.nextSibling);
                } else {
                    form.appendChild(wrap);
                }
            }

            var boxEl = wrap.querySelector(".vdemo-contact-memos");
            if (!boxEl) return;
            boxEl.innerHTML = "";

            var ids = Object.keys(memoItems || {});
            if (!ids.length) {
                wrap.style.display = "none";
            } else {
                wrap.style.display = "";
            }

            ids.forEach(function (id) {
                var item = memoItems[id] || {};
                var badge = (item.badge && String(item.badge).trim()) || id;
                var title = item.title || "";
                var label = "ID " + badge + " – " + title;

                var chip = document.createElement("span");
                chip.className = "vdemo-contact-chip";
                chip.setAttribute("data-memo-id", id);
                chip.textContent = label;

                var btn = document.createElement("button");
                btn.type = "button";
                btn.className = "vdemo-contact-chip-remove";
                btn.setAttribute("aria-label", "Aus Merkliste entfernen");
                btn.textContent = "×";
                btn.addEventListener("click", function (ev) {
                    ev.preventDefault();
                    // vorhandene Toggle-Logik nutzen, um Merkliste & Drawer zu aktualisieren
                    if (typeof toggleMemo === "function") {
                        toggleMemo(id, item);
                    } else {
                        // Fallback: direkt im Storage entfernen
                        delete memoItems[id];
                        saveMemosToStorage();
                        renderDrawerList();
                        updateDrawerCount();
                        syncMemoButtons();
                    }
                });

                chip.appendChild(btn);
                boxEl.appendChild(chip);
            });

            // Hidden-Feld mit Text füllen (parallel zu updateFluentFormsField)
            var hiddenField = wrap.querySelector(".demo-memo-field");
            if (hiddenField) {
                var lines = [];
                Object.keys(memoItems || {}).forEach(function (id) {
                    var item = memoItems[id] || {};
                    var lineId = (item.badge && item.badge.trim()) ? item.badge.trim() : id;
                    var line = lineId + " " + (item.title || "");
                    if (item.info) {
                        line += " | " + item.info;
                    }
                    if (item.genre) {
                        line += " | Genre: " + item.genre;
                    }
                    lines.push(line);
                });
                hiddenField.value = lines.join("\n");
            }
        } catch (_e) {}
    }

function styleSelects(nodeList) {
        nodeList.forEach(function (sel) {
            sel.addEventListener("mouseenter", function () {
                sel.classList.add("vdemo-select-hover");
            });
            sel.addEventListener("mouseleave", function () {
                sel.classList.remove("vdemo-select-hover");
            });
            sel.addEventListener("focus", function () {
                sel.classList.add("vdemo-select-focus");
            });
            sel.addEventListener("blur", function () {
                sel.classList.remove("vdemo-select-focus");
            });
        });
    }

    function hydrateMemosFromUrl() {
        try {
            var params = new URLSearchParams(window.location.search);
            var favParam = params.get("vdemo_favs");
            if (!favParam) return;

            var ids = favParam.split(",").map(function (s) {
                return s.trim();
            }).filter(function (s) {
                return s !== "";
            });

            ids.forEach(function (id) {
                var btn = document.querySelector('.vdemo-memo-button[data-demo-id="' + id + '"]');
                var title = "";
                var info = "";
                var genre = "";
                var genreSlug = "";
                var audio = "";
                var badge = "";

                if (btn) {
                    title = btn.getAttribute("data-demo-title") || "";
                    info = btn.getAttribute("data-demo-info") || "";
                    genre = btn.getAttribute("data-demo-genre") || "";
                    genreSlug = btn.getAttribute("data-demo-genre-slug") || "";
                    audio = btn.getAttribute("data-demo-audio") || "";
                    badge = btn.getAttribute("data-demo-badge") || "";
                }

                memoItems[id] = {
                    title: title,
                    info: info,
                    genre: genre,
                    genreSlug: genreSlug,
                    audio: audio,
                    badge: badge
                };
            });

            saveMemosToStorage();
            syncMemoButtons();
            renderDrawerList();
            updateDrawerCount();
            if (drawer) {
                openDrawer();
            }
        } catch (_e) {}
    }

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            closeDrawer();
        }
    });

    function bindMemoButtonsClicks() {
        memoButtons = document.querySelectorAll(".vdemo-memo-button");
        memoButtons.forEach(function (btn) {
            if (btn.getAttribute("data-vdemo-memo-bound") === "1") {
                return;
            }
            btn.setAttribute("data-vdemo-memo-bound", "1");

            btn.addEventListener("click", function () {
                var id = btn.getAttribute("data-demo-id");
                var title = btn.getAttribute("data-demo-title") || "";
                var info = btn.getAttribute("data-demo-info") || "";
                var genre = btn.getAttribute("data-demo-genre") || "";
                var genreSlug = btn.getAttribute("data-demo-genre-slug") || "";
                var audio = btn.getAttribute("data-demo-audio") || "";
                var badge = btn.getAttribute("data-demo-badge") || "";

                if (!id) return;

                var data = {
                    title: title,
                    info: info,
                    genre: genre,
                    genreSlug: genreSlug,
                    audio: audio,
                    badge: badge
                };

                toggleMemo(id, data);
            });
        });
    }

    loadMemosFromStorage();
    styleSelects(filterSelects);
    if (filterSelects.length) {
        initDropdownUI();
        applyFilters();
    }

    wireAudioContainers(document);

    renderDrawerList();
    updateDrawerCount();
    bindMemoButtonsClicks();
    syncMemoButtons();
    hydrateMemosFromUrl();
    buildContactMemoBox();

    // === VDS 2.9.42: Sync Merkliste -> Fluent Forms (Hidden-Feld + HTML-Box) ===

});
