/* Voice Demo System – Filter, Player, Merkliste, Drawer, aktive Filter + Custom-Dropdowns + Standalone */
document.addEventListener("DOMContentLoaded", () => {
    const wrapper = document.getElementById("vdemo-wrapper");
    const hasStandalone = document.querySelector(".vdemo-standalone-player");
    const hasDrawerOnly = document.getElementById("vdemo-drawer");

    if (!wrapper && !hasStandalone && !hasDrawerOnly) {
        return;
    }

    const grid = document.getElementById("vdemo-grid");
    const cards = grid ? Array.from(grid.querySelectorAll(".vdemo-card")) : [];
    const pageSize = 9;
    let currentPage = 1;
    let currentPageCards = cards.slice();
    let paginationNav = null;

    const filterSelects = document.querySelectorAll(".vdemo-select");
    const resetButton = document.getElementById("vdemo-reset-button");
    const resultCount = document.getElementById("vdemo-result-count");

    const activeFilterBar = document.getElementById("vdemo-active-filters");
    const activeFilterChips = document.getElementById("vdemo-active-filters-chips");

    const drawer = document.getElementById("vdemo-drawer");
    const drawerToggle = document.getElementById("vdemo-drawer-toggle");
    const drawerClose = document.getElementById("vdemo-drawer-close");
    const drawerClear = document.getElementById("vdemo-drawer-clear");
    const drawerList = document.getElementById("vdemo-drawer-list");
    const drawerCount = document.getElementById("vdemo-drawer-count");
    const drawerAdd = document.getElementById("vdemo-drawer-add");
    const drawerShare = document.getElementById("vdemo-drawer-share");

    let memoButtons = document.querySelectorAll(".vdemo-memo-button");
    let memoItems = {};
    const storageKey = "vdemo_memos";

    let currentAudio = null;
    let currentAudioBlock = null;

    let dropdownConfigs = [];
    let prevMemoCount = 0;

    const filterLabelMap = {
        genre: "Genre",
        style: "Stil",
        mood: "Stimmung",
        speed: "Tempo",
        pitch: "Tonhöhe",
        industry: "Branche",
    };

    const loadMemosFromStorage = () => {
        try {
            const raw = window.localStorage.getItem(storageKey);
            if (!raw) {
                return;
            }
            const data = JSON.parse(raw);
            if (data && typeof data === "object") {
                memoItems = data;
            }
        } catch (error) {
            memoItems = {};
        }
    };

    const saveMemosToStorage = () => {
        try {
            window.localStorage.setItem(storageKey, JSON.stringify(memoItems));
        } catch (error) {
            // Ignorieren.
        }
    };

    const formatTime = (seconds) => {
        let value = Number(seconds);
        if (!Number.isFinite(value) || value < 0) {
            value = 0;
        }
        const minutes = Math.floor(value / 60);
        const rest = Math.floor(value % 60);
        const padded = rest < 10 ? `0${rest}` : String(rest);
        return `${minutes}:${padded}`;
    };

    const resetAudioUI = (block) => {
        if (!block) {
            return;
        }
        const audio = block.querySelector(".vdemo-audio");
        const playBtn = block.querySelector(".vdemo-play-button");
        const fill = block.querySelector(".vdemo-progress-fill");
        const timeLabel = block.querySelector(".vdemo-time-label");

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
    };

    const wireAudioContainers = (root) => {
        if (!root) {
            return;
        }

        const blocks = root.querySelectorAll(".vdemo-card-audio, .vdemo-drawer-audio");
        blocks.forEach((block) => {
            if (block.getAttribute("data-vdemo-bound") === "1") {
                return;
            }
            const audio = block.querySelector(".vdemo-audio");
            const playBtn = block.querySelector(".vdemo-play-button");
            const progressTrack = block.querySelector(".vdemo-progress-track");
            const progressFill = block.querySelector(".vdemo-progress-fill");
            const timeLabel = block.querySelector(".vdemo-time-label");

            if (!audio || !playBtn || !timeLabel) {
                return;
            }

            block.setAttribute("data-vdemo-bound", "1");

            playBtn.addEventListener("click", () => {
                if (!audio.src) {
                    return;
                }

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

            audio.addEventListener("timeupdate", () => {
                if (Number.isFinite(audio.duration) && audio.duration > 0 && progressFill && progressTrack) {
                    let ratio = audio.currentTime / audio.duration;
                    ratio = Math.max(0, Math.min(1, ratio));
                    progressFill.style.width = `${ratio * 100}%`;
                }
                timeLabel.textContent = formatTime(audio.currentTime);
            });

            audio.addEventListener("ended", () => {
                resetAudioUI(block);
                if (currentAudio === audio) {
                    currentAudio = null;
                    currentAudioBlock = null;
                }
            });

            if (progressTrack && progressFill) {
                progressTrack.addEventListener("click", (event) => {
                    const rect = progressTrack.getBoundingClientRect();
                    const x = event.clientX - rect.left;
                    let ratio = x / rect.width;
                    ratio = Math.max(0, Math.min(1, ratio));
                    if (Number.isFinite(audio.duration) && audio.duration > 0) {
                        audio.currentTime = audio.duration * ratio;
                    }
                });
            }
        });
    };

    const updateMultiToggleLabel = (select, toggle) => {
        const labels = [];
        Array.from(select.options).forEach((opt) => {
            if (!opt.selected || !opt.value || opt.value === "all") {
                return;
            }
            labels.push(opt.textContent);
        });

        if (labels.length === 0) {
            toggle.textContent = "Alle";
        } else if (labels.length === 1) {
            toggle.textContent = labels[0];
        } else {
            toggle.textContent = `${labels[0]} +${labels.length - 1}`;
        }
    };

    const updateSingleToggleLabel = (select, toggle) => {
        const opt = select.options[select.selectedIndex];
        if (!opt || !opt.value || opt.value === "all") {
            toggle.textContent = "Alle";
        } else {
            toggle.textContent = opt.textContent;
        }
    };

    const closeAllDropdownMenus = () => {
        dropdownConfigs.forEach((cfg) => {
            cfg.wrapper.classList.remove("vdemo-multi-open");
        });
    };

    const initDropdownUI = () => {
        dropdownConfigs = [];

        filterSelects.forEach((sel) => {
            const parent = sel.parentNode;
            if (!parent || !parent.classList.contains("vdemo-select-wrapper")) {
                return;
            }

            const isMulti = !!sel.multiple;
            parent.classList.add("vdemo-select-wrapper-advanced");

            const wrapper = document.createElement("div");
            wrapper.className = "vdemo-multi";

            const toggle = document.createElement("button");
            toggle.type = "button";
            toggle.className = "vdemo-multi-toggle";
            toggle.textContent = "Alle";

            const menu = document.createElement("div");
            menu.className = "vdemo-multi-menu";

            Array.from(sel.options).forEach((opt) => {
                const { value } = opt;
                const text = opt.textContent;

                if (isMulti) {
                    if (!value || value === "all") {
                        return;
                    }

                    const row = document.createElement("label");
                    row.className = "vdemo-multi-option";
                    row.setAttribute("data-value", value);

                    const checkbox = document.createElement("input");
                    checkbox.type = "checkbox";
                    checkbox.className = "vdemo-multi-checkbox";
                    checkbox.value = value;

                    const span = document.createElement("span");
                    span.textContent = text;

                    row.appendChild(checkbox);
                    row.appendChild(span);
                    menu.appendChild(row);

                    checkbox.addEventListener("change", () => {
                        const val = checkbox.value;
                        Array.from(sel.options).forEach((option) => {
                            if (option.value === val) {
                                option.selected = checkbox.checked;
                            }
                        });

                        const anySelected = Array.from(sel.options).some((option) => option.value !== "all" && option.selected);
                        const allOpt = sel.querySelector('option[value="all"]');
                        if (allOpt) {
                            if (!anySelected) {
                                Array.from(sel.options).forEach((option) => {
                                    option.selected = false;
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
                    const btn = document.createElement("button");
                    btn.type = "button";
                    btn.className = "vdemo-single-option";
                    btn.textContent = text;
                    btn.setAttribute("data-value", value);

                    btn.addEventListener("click", (event) => {
                        event.stopPropagation();
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

            toggle.addEventListener("click", (event) => {
                event.stopPropagation();
                const isOpen = wrapper.classList.contains("vdemo-multi-open");
                closeAllDropdownMenus();
                if (!isOpen) {
                    wrapper.classList.add("vdemo-multi-open");
                }
            });

            menu.addEventListener("click", (event) => {
                event.stopPropagation();
            });

            dropdownConfigs.push({
                select: sel,
                wrapper,
                toggle,
                menu,
                isMulti,
            });
        });

        document.addEventListener("click", () => {
            closeAllDropdownMenus();
        });
    };

    const syncDropdownUIFromSelects = () => {
        dropdownConfigs.forEach((cfg) => {
            const { select, toggle, menu, isMulti } = cfg;
            if (isMulti) {
                updateMultiToggleLabel(select, toggle);
                const checkboxes = menu.querySelectorAll(".vdemo-multi-checkbox");
                checkboxes.forEach((checkbox) => {
                    const val = checkbox.value;
                    const option = Array.from(select.options).find((opt) => opt.value === val);
                    checkbox.checked = !!(option && option.selected);
                });
            } else {
                updateSingleToggleLabel(select, toggle);
            }
        });
    };

    const buildActiveFilters = () => {
        if (!activeFilterChips || !activeFilterBar) {
            return;
        }

        activeFilterChips.innerHTML = "";
        let totalChips = 0;

        filterSelects.forEach((select) => {
            const key = select.getAttribute("data-filter-key");
            if (!key) {
                return;
            }
            const label = filterLabelMap[key] || key;

            if (select.multiple) {
                const values = [];
                const labels = [];
                Array.from(select.options).forEach((opt) => {
                    if (!opt.selected || !opt.value || opt.value === "all") {
                        return;
                    }
                    values.push(opt.value);
                    labels.push(opt.textContent);
                });
                if (values.length > 0) {
                    createFilterChip(select, key, label, values, labels, true);
                    totalChips += 1;
                }
            } else {
                const value = select.value;
                if (!value || value === "all") {
                    return;
                }
                const opt = select.options[select.selectedIndex];
                const labelText = opt ? opt.textContent : value;
                createFilterChip(select, key, label, [value], [labelText], false);
                totalChips += 1;
            }
        });

        if (totalChips === 0) {
            activeFilterBar.classList.add("vdemo-active-filters-empty");
        } else {
            activeFilterBar.classList.remove("vdemo-active-filters-empty");
        }
    };

    const createFilterChip = (select, key, label, values, labels, isMulti) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "vdemo-filter-chip";

        const spanLabel = document.createElement("span");
        spanLabel.className = "vdemo-filter-chip-label";
        spanLabel.textContent = `${label}: ${labels.join(", ")}`;

        const spanClose = document.createElement("span");
        spanClose.className = "vdemo-filter-chip-close";
        spanClose.setAttribute("aria-hidden", "true");
        spanClose.textContent = "×";

        chip.appendChild(spanLabel);
        chip.appendChild(spanClose);

        chip.addEventListener("click", () => {
            if (isMulti) {
                Array.from(select.options).forEach((opt) => {
                    if (values.includes(opt.value)) {
                        opt.selected = false;
                    }
                });
                const anySelected = Array.from(select.options).some((opt) => opt.selected && opt.value !== "all");
                const allOpt = select.querySelector('option[value="all"]');
                if (allOpt && !anySelected) {
                    Array.from(select.options).forEach((opt) => {
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
    };

    const computeActiveFilters = () => {
        const activeFilters = {};

        filterSelects.forEach((select) => {
            const key = select.getAttribute("data-filter-key");
            if (!key) {
                return;
            }

            if (select.multiple) {
                const values = [];
                Array.from(select.options).forEach((opt) => {
                    if (opt.selected && opt.value && opt.value !== "all") {
                        values.push(opt.value.toLowerCase());
                    }
                });
                if (values.length > 0) {
                    activeFilters[key] = values;
                }
            } else {
                const value = select.value;
                if (value && value !== "all") {
                    activeFilters[key] = [value.toLowerCase()];
                }
            }
        });

        return activeFilters;
    };

    const updateFilterOptionAvailability = (allowedByKey) => {
        filterSelects.forEach((select) => {
            const key = select.getAttribute("data-filter-key");
            if (!key || key === "genre") {
                return;
            }

            const allowed = allowedByKey[key];
            if (!allowed) {
                return;
            }

            if (select.multiple) {
                Array.from(select.options).forEach((opt) => {
                    if (!opt.value || opt.value === "all") {
                        return;
                    }
                    const val = opt.value.toLowerCase();
                    const isAllowed = allowed.has(val);
                    opt.disabled = !isAllowed;
                    if (!isAllowed && opt.selected) {
                        opt.selected = false;
                    }
                });

                const anySelected = Array.from(select.options).some((opt) => opt.selected && opt.value !== "all");
                const allOpt = select.querySelector('option[value="all"]');
                if (allOpt && !anySelected) {
                    Array.from(select.options).forEach((opt) => {
                        opt.selected = false;
                    });
                    allOpt.selected = true;
                }
            } else {
                const selected = select.options[select.selectedIndex];
                if (selected && selected.value && selected.value !== "all") {
                    const sval = selected.value.toLowerCase();
                    if (!allowed.has(sval)) {
                        select.value = "all";
                    }
                }
            }

            const cfg = dropdownConfigs.find((config) => config.select === select);
            if (cfg && cfg.menu) {
                const rows = cfg.menu.querySelectorAll("[data-value]");
                rows.forEach((row) => {
                    const val = row.getAttribute("data-value");
                    if (!val || val === "all") {
                        row.style.display = "";
                        return;
                    }
                    const isAllowed = allowed.has(val.toLowerCase());
                    row.style.display = isAllowed ? "" : "none";
                });
            }
        });

        syncDropdownUIFromSelects();
    };

    const applyFilters = () => {
        if (!grid) {
            return;
        }

        const activeFilters = computeActiveFilters();

        grid.classList.remove("vdemo-grid-fade-in");
        grid.classList.add("vdemo-grid-fade-out");

        window.setTimeout(() => {
            let matches = 0;
            const visibleCards = [];

            cards.forEach((card) => {
                let visible = true;

                Object.keys(activeFilters).forEach((key) => {
                    if (!visible) {
                        return;
                    }
                    const attr = card.getAttribute(`data-${key}`) || "";
                    const tokens = attr.toLowerCase().split(/\s+/).filter((token) => token.length > 0);
                    if (tokens.length === 0) {
                        visible = false;
                        return;
                    }
                    const values = activeFilters[key];
                    const hasAny = values.some((value) => tokens.includes(value));
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

            const allowedByKey = {
                genre: new Set(),
                style: new Set(),
                mood: new Set(),
                speed: new Set(),
                pitch: new Set(),
                industry: new Set(),
            };

            visibleCards.forEach((card) => {
                ["style", "mood", "speed", "pitch", "industry", "genre"].forEach((key) => {
                    const attr = card.getAttribute(`data-${key}`) || "";
                    const tokens = attr.toLowerCase().split(/\s+/).filter((token) => token.length > 0);
                    tokens.forEach((token) => {
                        allowedByKey[key].add(token);
                    });
                });
            });

            updateFilterOptionAvailability(allowedByKey);
            buildActiveFilters();

            currentPageCards = visibleCards.slice();
            currentPage = 1;
            applyPagination();

            grid.classList.remove("vdemo-grid-fade-out");
            grid.classList.add("vdemo-grid-fade-in");
        }, 160);
    };

    const changePageWithFade = (targetPage, totalPages) => {
        if (!grid) {
            return;
        }
        if (typeof targetPage !== "number" || Number.isNaN(targetPage)) {
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

        window.setTimeout(() => {
            currentPage = targetPage;
            applyPagination();
            grid.classList.remove("vdemo-grid-fade-out");
            grid.classList.add("vdemo-grid-fade-in");

            const anchor = document.getElementById("Demo-Grid-start") || grid || document.getElementById("vdemo-grid");
            if (anchor && typeof anchor.scrollIntoView === "function") {
                anchor.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                });
            }
        }, 160);
    };

    const renderPagination = () => {
        if (!grid) {
            return;
        }

        const allVisible = currentPageCards && currentPageCards.length ? currentPageCards : cards.slice();
        const total = allVisible.length;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));

        if (paginationNav && paginationNav.parentNode) {
            paginationNav.parentNode.removeChild(paginationNav);
        }

        if (totalPages <= 1) {
            paginationNav = null;
            cards.forEach((card) => {
                card.classList.remove("vdemo-card-page-hidden");
            });
            return;
        }

        paginationNav = document.createElement("nav");
        paginationNav.className = "vdemo-pagination";
        paginationNav.setAttribute("aria-label", "Demos");

        for (let i = 1; i <= totalPages; i += 1) {
            const pageNum = i;
            const link = document.createElement("button");
            link.type = "button";
            link.className = "vdemo-page-link";
            link.textContent = String(pageNum);
            if (pageNum === currentPage) {
                link.classList.add("vdemo-page-link-active");
            }
            link.addEventListener("click", () => {
                changePageWithFade(pageNum, totalPages);
            });
            paginationNav.appendChild(link);
        }

        const afterNode = grid;
        if (afterNode && afterNode.parentNode) {
            afterNode.parentNode.insertBefore(paginationNav, afterNode.nextSibling);
        }
    };

    const applyPagination = () => {
        if (!grid) {
            return;
        }

        const allVisible = currentPageCards && currentPageCards.length
            ? currentPageCards
            : cards.filter((card) => !card.classList.contains("vdemo-card-filter-hidden"));

        const total = allVisible.length;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        if (currentPage > totalPages) {
            currentPage = totalPages;
        }
        const start = (currentPage - 1) * pageSize;
        const end = start + pageSize;

        cards.forEach((card) => {
            card.classList.add("vdemo-card-page-hidden");
        });

        allVisible.slice(start, end).forEach((card) => {
            card.classList.remove("vdemo-card-page-hidden");
        });

        renderPagination();
        bindMemoButtonsClicks();
        if (typeof syncMemoButtons === "function") {
            syncMemoButtons();
        }
    };

    const updateDrawerCount = () => {
        const count = Object.keys(memoItems).length;
        if (drawerCount) {
            drawerCount.textContent = String(count);
        }

        if (drawerToggle) {
            if (count > 0) {
                drawerToggle.classList.add("vdemo-has-items");
                drawerToggle.style.pointerEvents = "";
                drawerToggle.style.display = "";
                if (prevMemoCount === 0) {
                    drawerToggle.classList.add("vdemo-drawer-toggle-pop");
                    setTimeout(() => {
                        drawerToggle.classList.remove("vdemo-drawer-toggle-pop");
                    }, 600);
                }
            } else {
                drawerToggle.classList.remove("vdemo-has-items");
                drawerToggle.classList.remove("vdemo-drawer-toggle-active");
                drawerToggle.classList.remove("vdemo-drawer-toggle-hidden");
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
    };

    const renderDrawerList = (newId) => {
        if (!drawerList) {
            return;
        }
        drawerList.innerHTML = "";

        const ids = Object.keys(memoItems);
        if (ids.length === 0) {
            if (drawer) {
                drawer.classList.remove("vdemo-drawer-open");
                drawer.setAttribute("aria-hidden", "true");
            }
            return;
        }

        const grouped = {};

        ids.forEach((id) => {
            const item = memoItems[id];
            const slug = item && item.genreSlug ? item.genreSlug : "ohne-genre";
            const label = item && item.genre ? item.genre : "Weitere Demos";
            if (!grouped[slug]) {
                grouped[slug] = { label, entries: [] };
            }
            grouped[slug].entries.push({ id, item });
        });

        Object.keys(grouped).forEach((slug) => {
            const group = grouped[slug];

            const groupLi = document.createElement("li");
            groupLi.className = "vdemo-drawer-group";

            const header = document.createElement("div");
            header.className = "vdemo-drawer-group-header-strip";
            header.textContent = group.label || "Weitere Demos";

            const itemsWrap = document.createElement("div");
            itemsWrap.className = "vdemo-drawer-group-items";

            group.entries.forEach((entry) => {
                const { id } = entry;
                const item = entry.item || {};
                const title = item.title || "";
                const info = item.info || "";
                const audioUrl = item.audio || "";

                const card = document.createElement("div");
                card.className = "vdemo-drawer-item";
                if (newId && String(id) === String(newId)) {
                    card.classList.add("vdemo-drawer-item--new");
                }

                const titleRow = document.createElement("div");
                titleRow.className = "vdemo-drawer-item-title-row";

                let idBadge = null;
                if (item && item.badge) {
                    idBadge = document.createElement("span");
                    idBadge.className = "vdemo-badge vdemo-badge-inline";
                    idBadge.textContent = item.badge;
                }

                const titleSpan = document.createElement("span");
                titleSpan.className = "vdemo-drawer-item-title";
                titleSpan.textContent = title;

                const actionsWrap = document.createElement("div");
                actionsWrap.className = "vdemo-drawer-item-actions";

                const removeBtn = document.createElement("button");
                removeBtn.type = "button";
                removeBtn.className = "vdemo-drawer-item-remove";
                removeBtn.textContent = "Entfernen";
                removeBtn.addEventListener("click", () => {
                    toggleMemo(id, item);
                });

                actionsWrap.appendChild(removeBtn);

                if (idBadge) {
                    titleRow.appendChild(idBadge);
                }
                titleRow.appendChild(titleSpan);
                titleRow.appendChild(actionsWrap);

                card.appendChild(titleRow);

                if (audioUrl) {
                    const audioRow = document.createElement("div");
                    audioRow.className = "vdemo-drawer-audio";

                    const playBtn = document.createElement("button");
                    playBtn.type = "button";
                    playBtn.className = "vdemo-play-button";

                    const iconPlay = document.createElement("span");
                    iconPlay.className = "vdemo-play-icon-play";

                    const iconPause = document.createElement("span");
                    iconPause.className = "vdemo-play-icon-pause";

                    playBtn.appendChild(iconPlay);
                    playBtn.appendChild(iconPause);

                    audioRow.appendChild(playBtn);

                    const progWrap = document.createElement("div");
                    progWrap.className = "vdemo-progress-wrapper";

                    const progTrack = document.createElement("div");
                    progTrack.className = "vdemo-progress-track";

                    const progFill = document.createElement("div");
                    progFill.className = "vdemo-progress-fill";

                    progTrack.appendChild(progFill);
                    progWrap.appendChild(progTrack);

                    const time = document.createElement("span");
                    time.className = "vdemo-time-label";
                    time.textContent = "0:00";

                    const audioEl = document.createElement("audio");
                    audioEl.className = "vdemo-audio";
                    audioEl.setAttribute("src", audioUrl);
                    audioEl.setAttribute("preload", "none");

                    audioRow.appendChild(progWrap);
                    audioRow.appendChild(time);
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
    };

    const openDrawer = () => {
        if (!drawer || !drawerToggle) {
            return;
        }
        drawer.classList.add("vdemo-drawer-open");
        drawerToggle.classList.add("vdemo-drawer-toggle-active");
        drawerToggle.classList.add("vdemo-drawer-toggle-hidden");
        drawerToggle.style.pointerEvents = "none";
        drawerToggle.style.display = "none";
        drawer.setAttribute("aria-hidden", "false");
    };

    const closeDrawer = () => {
        if (!drawer || !drawerToggle) {
            return;
        }
        drawer.classList.remove("vdemo-drawer-open");
        drawerToggle.classList.remove("vdemo-drawer-toggle-active");
        drawerToggle.classList.remove("vdemo-drawer-toggle-hidden");
        if (Object.keys(memoItems).length > 0) {
            drawerToggle.style.pointerEvents = "";
            drawerToggle.style.display = "";
        }
        drawer.setAttribute("aria-hidden", "true");
    };

    if (drawerToggle) {
        drawerToggle.addEventListener("click", () => {
            if (drawer.classList.contains("vdemo-drawer-open")) {
                closeDrawer();
            } else {
                openDrawer();
            }
        });
    }

    if (drawerClose) {
        drawerClose.addEventListener("click", () => {
            closeDrawer();
        });
    }

    if (drawerAdd) {
        drawerAdd.addEventListener("click", () => {
            const basePath = "/kontakt/";
            let isMobile = false;
            try {
                if (window.matchMedia) {
                    isMobile = window.matchMedia("(max-width: 768px)").matches;
                } else if (typeof window.innerWidth === "number") {
                    isMobile = window.innerWidth <= 768;
                }
            } catch (error) {
                // Ignorieren.
            }

            const anchor = isMobile ? "#kontaktformular_direkt-mobil" : "#kontaktformular_direkt";
            window.location.href = `${basePath}${anchor}`;
        });
    }

    if (drawerClear) {
        drawerClear.addEventListener("click", () => {
            memoItems = {};
            saveMemosToStorage();
            syncMemoButtons();
            renderDrawerList();
            updateDrawerCount();
        });
    }

    if (drawerShare) {
        drawerShare.addEventListener("click", () => {
            const ids = Object.keys(memoItems);
            if (!ids.length) {
                return;
            }

            const url = new URL(window.location.href.split("#")[0]);
            url.searchParams.set("vdemo_favs", ids.join(","));
            const shareUrl = url.toString();

            if (navigator.share) {
                navigator.share({
                    title: "Sprecher Pascal Krell - Demos - Merkliste",
                    text: "Hier ist unsere Auswahl an gemerkten Sprecher-Demos.",
                    url: shareUrl,
                }).catch(() => {
                    // Ignorieren.
                });
            } else if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(shareUrl).then(() => {
                    alert("Der Link zu Deiner Merkliste wurde in die Zwischenablage kopiert.");
                }).catch(() => {
                    alert(`Hier ist Dein Link zur Merkliste:\n${shareUrl}`);
                });
            } else {
                alert(`Hier ist Dein Link zur Merkliste:\n${shareUrl}`);
            }
        });
    }

    const toggleMemo = (id, data) => {
        const key = String(id);
        const hadMemos = Object.keys(memoItems).length > 0;

        if (memoItems[key]) {
            delete memoItems[key];
        } else {
            memoItems[key] = data;
        }
        saveMemosToStorage();
        syncMemoButtons();
        renderDrawerList(memoItems[key] ? id : null);
        updateDrawerCount();

        const hasMemosNow = Object.keys(memoItems).length > 0;

        if (!hadMemos && hasMemosNow && grid) {
            openDrawer();
        }
    };

    const syncMemoButtons = () => {
        memoButtons = document.querySelectorAll(".vdemo-memo-button");
        memoButtons.forEach((btn) => {
            const id = btn.getAttribute("data-demo-id");
            const label = btn.querySelector(".vdemo-memo-label");
            const miniTooltip = btn.querySelector(".vdemo-memo-mini-tooltip");

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
    };

    const updateFluentFormsField = () => {
        const lines = [];
        Object.keys(memoItems).forEach((id) => {
            const item = memoItems[id];
            const lineId = item.badge && item.badge.trim() ? item.badge.trim() : id;
            let line = `${lineId} ${item.title || ""}`;
            if (item.info) {
                line += ` | ${item.info}`;
            }
            if (item.genre) {
                line += ` | Genre: ${item.genre}`;
            }
            lines.push(line);
        });

        const text = lines.length > 0 ? `Gemerkte Demos:\n${lines.join("\n")}` : "";
        const fields = document.querySelectorAll(".demo-memo-field");
        if (fields && fields.length > 0) {
            fields.forEach((field) => {
                field.value = text;
            });
        }
    };

    const buildContactMemoBox = () => {
        try {
            const anchor = document.querySelector(".vdemo-contact-memos-anchor");
            if (!anchor) {
                return;
            }

            const form = anchor.closest("form");
            if (!form) {
                return;
            }

            let msgField = null;
            const textareas = form.querySelectorAll("textarea");
            textareas.forEach((ta) => {
                if (msgField) {
                    return;
                }
                const label = ta.id ? form.querySelector(`label[for="${ta.id}"]`) : null;
                if (label && /nachricht/i.test(label.textContent || "")) {
                    msgField = ta;
                }
            });
            if (!msgField && textareas.length) {
                msgField = textareas[0];
            }
            if (!msgField) {
                return;
            }

            let wrap = form.querySelector(".vdemo-contact-memos-wrap");
            if (!wrap) {
                wrap = document.createElement("div");
                wrap.className = "vdemo-contact-memos-wrap";

                const title = document.createElement("div");
                title.className = "vdemo-contact-memos-title";
                title.textContent = "Gemerkte Demos";

                const box = document.createElement("div");
                box.className = "vdemo-contact-memos";

                const hint = document.createElement("div");
                hint.className = "vdemo-contact-memos-hint";
                hint.textContent = "Die von Dir ausgewählten Demos werden beim Absenden Deiner Nachricht automatisch mitgeschickt, um Deine Wünsche für die Sprachaufnahmen besser zu verstehen.";

                const hidden = document.createElement("input");
                hidden.type = "hidden";
                hidden.name = "gemerkte_demos";
                hidden.className = "demo-memo-field";

                wrap.appendChild(title);
                wrap.appendChild(box);
                wrap.appendChild(hint);
                wrap.appendChild(hidden);

                if (!form.__vdemoMemoSubmitBound) {
                    form.__vdemoMemoSubmitBound = true;
                    form.addEventListener("submit", () => {
                        try {
                            const listLines = [];
                            Object.keys(memoItems || {}).forEach((id) => {
                                const item = memoItems[id] || {};
                                const badge = (item.badge && String(item.badge).trim()) || id;
                                const titleText = item.title || "";
                                let line = `ID ${badge} – ${titleText}`;
                                if (item.info) {
                                    line += ` | ${item.info}`;
                                }
                                if (item.genre) {
                                    line += ` | Genre: ${item.genre}`;
                                }
                                listLines.push(line);
                            });

                            const hiddenField = wrap.querySelector(".demo-memo-field");
                            if (hiddenField) {
                                hiddenField.value = listLines.join("\n");
                            }
                        } catch (error) {
                            // Ignorieren.
                        }
                    });
                }

                const group = msgField.closest(".ff-el-group");
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

            const boxEl = wrap.querySelector(".vdemo-contact-memos");
            if (!boxEl) {
                return;
            }
            boxEl.innerHTML = "";

            const ids = Object.keys(memoItems || {});
            if (!ids.length) {
                wrap.style.display = "none";
            } else {
                wrap.style.display = "";
            }

            ids.forEach((id) => {
                const item = memoItems[id] || {};
                const badge = (item.badge && String(item.badge).trim()) || id;
                const title = item.title || "";
                const label = `ID ${badge} – ${title}`;

                const chip = document.createElement("span");
                chip.className = "vdemo-contact-chip";
                chip.setAttribute("data-memo-id", id);
                chip.textContent = label;

                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "vdemo-contact-chip-remove";
                btn.setAttribute("aria-label", "Aus Merkliste entfernen");
                btn.textContent = "×";
                btn.addEventListener("click", (event) => {
                    event.preventDefault();
                    if (typeof toggleMemo === "function") {
                        toggleMemo(id, item);
                    } else {
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

            const hiddenField = wrap.querySelector(".demo-memo-field");
            if (hiddenField) {
                const lines = [];
                Object.keys(memoItems || {}).forEach((id) => {
                    const item = memoItems[id] || {};
                    const lineId = item.badge && item.badge.trim() ? item.badge.trim() : id;
                    let line = `${lineId} ${item.title || ""}`;
                    if (item.info) {
                        line += ` | ${item.info}`;
                    }
                    if (item.genre) {
                        line += ` | Genre: ${item.genre}`;
                    }
                    lines.push(line);
                });
                hiddenField.value = lines.join("\n");
            }
        } catch (error) {
            // Ignorieren.
        }
    };

    const styleSelects = (nodeList) => {
        nodeList.forEach((select) => {
            select.addEventListener("mouseenter", () => {
                select.classList.add("vdemo-select-hover");
            });
            select.addEventListener("mouseleave", () => {
                select.classList.remove("vdemo-select-hover");
            });
            select.addEventListener("focus", () => {
                select.classList.add("vdemo-select-focus");
            });
            select.addEventListener("blur", () => {
                select.classList.remove("vdemo-select-focus");
            });
        });
    };

    const hydrateMemosFromUrl = () => {
        try {
            const params = new URLSearchParams(window.location.search);
            const favParam = params.get("vdemo_favs");
            if (!favParam) {
                return;
            }

            const ids = favParam.split(",").map((value) => value.trim()).filter(Boolean);

            ids.forEach((id) => {
                const btn = document.querySelector(`.vdemo-memo-button[data-demo-id="${id}"]`);
                const title = btn ? btn.getAttribute("data-demo-title") || "" : "";
                const info = btn ? btn.getAttribute("data-demo-info") || "" : "";
                const genre = btn ? btn.getAttribute("data-demo-genre") || "" : "";
                const genreSlug = btn ? btn.getAttribute("data-demo-genre-slug") || "" : "";
                const audio = btn ? btn.getAttribute("data-demo-audio") || "" : "";
                const badge = btn ? btn.getAttribute("data-demo-badge") || "" : "";

                memoItems[id] = {
                    title,
                    info,
                    genre,
                    genreSlug,
                    audio,
                    badge,
                };
            });

            saveMemosToStorage();
            syncMemoButtons();
            renderDrawerList();
            updateDrawerCount();
            if (drawer) {
                openDrawer();
            }
        } catch (error) {
            // Ignorieren.
        }
    };

    const bindMemoButtonsClicks = () => {
        memoButtons = document.querySelectorAll(".vdemo-memo-button");
        memoButtons.forEach((btn) => {
            if (btn.getAttribute("data-vdemo-memo-bound") === "1") {
                return;
            }
            btn.setAttribute("data-vdemo-memo-bound", "1");

            btn.addEventListener("click", () => {
                const id = btn.getAttribute("data-demo-id");
                const title = btn.getAttribute("data-demo-title") || "";
                const info = btn.getAttribute("data-demo-info") || "";
                const genre = btn.getAttribute("data-demo-genre") || "";
                const genreSlug = btn.getAttribute("data-demo-genre-slug") || "";
                const audio = btn.getAttribute("data-demo-audio") || "";
                const badge = btn.getAttribute("data-demo-badge") || "";

                if (!id) {
                    return;
                }

                const data = {
                    title,
                    info,
                    genre,
                    genreSlug,
                    audio,
                    badge,
                };

                toggleMemo(id, data);
            });
        });
    };

    filterSelects.forEach((select) => {
        select.addEventListener("change", applyFilters);
    });

    if (resetButton) {
        resetButton.addEventListener("click", () => {
            filterSelects.forEach((select) => {
                if (select.multiple) {
                    Array.from(select.options).forEach((opt) => {
                        opt.selected = opt.value === "all";
                    });
                } else {
                    select.value = "all";
                }
            });
            applyFilters();
        });
    }

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeDrawer();
        }
    });

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
});
