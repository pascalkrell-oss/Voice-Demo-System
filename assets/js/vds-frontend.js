class VoiceDemoSystem {
  constructor() {
    this.storageKey = 'vds_favorites';
    this.favorites = new Set();
    this.players = new Map();
    this.activeAudio = null;
    this.activeButton = null;
    this.grid = document.querySelector('[data-vds-grid]');
    if (!this.grid) {
      return;
    }

    this.drawer = document.querySelector('[data-vds-drawer]');
    this.drawerList = document.querySelector('[data-vds-fav-list]');
    this.drawerEmpty = document.querySelector('[data-vds-fav-empty]');
    this.favCount = document.querySelector('[data-vds-fav-count]');

    this.initFavorites();
    this.initFilters();
    this.initPlayers();
    this.initDrawer();
    this.initFormIntegration();
  }

  initFavorites() {
    const stored = window.localStorage.getItem(this.storageKey);
    if (stored) {
      try {
        this.favorites = new Set(JSON.parse(stored));
      } catch (error) {
        this.favorites = new Set();
      }
    }

    const param = window.VDS_DATA?.favoritesParam || '';
    if (param) {
      const ids = param.split(',').map((id) => id.trim()).filter(Boolean);
      this.favorites = new Set(ids);
      this.persistFavorites();
    }

    document.querySelectorAll('[data-vds-fav-toggle]').forEach((button) => {
      const id = button.dataset.id;
      if (this.favorites.has(id)) {
        button.classList.add('is-active');
      }
      button.addEventListener('click', () => this.toggleFavorite(id, button));
    });

    this.renderFavorites();
  }

  persistFavorites() {
    window.localStorage.setItem(this.storageKey, JSON.stringify([...this.favorites]));
  }

  toggleFavorite(id, button) {
    if (this.favorites.has(id)) {
      this.favorites.delete(id);
      button.classList.remove('is-active');
    } else {
      this.favorites.add(id);
      button.classList.add('is-active');
    }
    this.persistFavorites();
    this.renderFavorites();
    this.updateFormIntegration();
  }

  renderFavorites() {
    if (!this.drawerList) {
      return;
    }
    this.drawerList.innerHTML = '';

    if (this.favorites.size === 0) {
      this.drawerEmpty.style.display = 'block';
    } else {
      this.drawerEmpty.style.display = 'none';
    }

    const cards = [...document.querySelectorAll('[data-vds-player]')];
    this.favorites.forEach((id) => {
      const card = cards.find((item) => item.dataset.id === id);
      if (!card) {
        return;
      }
      const title = card.dataset.title || 'Voice Demo';
      const badge = card.dataset.badge ? `#${card.dataset.badge}` : '';
      const item = document.createElement('div');
      item.className = 'vds-drawer-item';
      item.innerHTML = `
        <div>
          <span>${title}</span>
          <div class="vds-card-meta">${badge}</div>
        </div>
        <button class="vds-drawer-remove" type="button" data-id="${id}">✕</button>
      `;
      item.querySelector('button').addEventListener('click', () => {
        const toggleButton = document.querySelector(`[data-vds-fav-toggle][data-id="${id}"]`);
        if (toggleButton) {
          this.toggleFavorite(id, toggleButton);
        }
      });
      this.drawerList.appendChild(item);
    });

    if (this.favCount) {
      this.favCount.textContent = this.favorites.size;
    }
  }

  initFilters() {
    const buttons = document.querySelectorAll('[data-vds-filter]');
    const cards = document.querySelectorAll('[data-vds-card]');

    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        const filter = button.dataset.vdsFilter;
        buttons.forEach((btn) => btn.classList.remove('is-active'));
        button.classList.add('is-active');

        cards.forEach((card) => {
          if (filter === 'all') {
            card.style.display = '';
            return;
          }
          const categories = card.dataset.category || '';
          card.style.display = categories.includes(filter) ? '' : 'none';
        });
      });
    });
  }

  initPlayers() {
    document.querySelectorAll('[data-vds-player]').forEach((player) => {
      const audio = player.querySelector('audio');
      const playButton = player.querySelector('[data-vds-play]');
      const progressFill = player.querySelector('[data-vds-progress-fill]');
      const progress = player.querySelector('[data-vds-progress]');
      const currentTime = player.querySelector('[data-vds-current]');
      const duration = player.querySelector('[data-vds-duration]');

      const updateTime = () => {
        const progressValue = audio.duration ? audio.currentTime / audio.duration : 0;
        progressFill.style.width = `${progressValue * 100}%`;
        currentTime.textContent = this.formatTime(audio.currentTime);
      };

      audio.addEventListener('loadedmetadata', () => {
        duration.textContent = this.formatTime(audio.duration);
      });

      audio.addEventListener('ended', () => {
        playButton.classList.remove('is-playing');
        this.activeAudio = null;
        this.activeButton = null;
        progressFill.style.width = '0%';
        currentTime.textContent = '0:00';
      });

      playButton.addEventListener('click', () => {
        if (!audio.src) {
          return;
        }

        if (this.activeAudio && this.activeAudio !== audio) {
          this.activeAudio.pause();
          this.activeAudio.currentTime = 0;
          if (this.activeButton) {
            this.activeButton.classList.remove('is-playing');
          }
        }

        if (audio.paused) {
          audio.play();
          playButton.classList.add('is-playing');
          this.activeAudio = audio;
          this.activeButton = playButton;
          const tick = () => {
            if (!audio.paused) {
              updateTime();
              requestAnimationFrame(tick);
            }
          };
          requestAnimationFrame(tick);
        } else {
          audio.pause();
          playButton.classList.remove('is-playing');
        }
      });

      progress.addEventListener('click', (event) => {
        const rect = progress.getBoundingClientRect();
        const ratio = (event.clientX - rect.left) / rect.width;
        audio.currentTime = ratio * audio.duration;
        updateTime();
      });
    });
  }

  initDrawer() {
    const openButton = document.querySelector('[data-vds-drawer-open]');
    const closeButtons = document.querySelectorAll('[data-vds-drawer-close]');
    const shareButton = document.querySelector('[data-vds-share]');

    openButton?.addEventListener('click', () => {
      this.drawer?.classList.add('is-open');
    });

    closeButtons.forEach((button) => {
      button.addEventListener('click', () => {
        this.drawer?.classList.remove('is-open');
      });
    });

    shareButton?.addEventListener('click', () => {
      const ids = [...this.favorites].join(',');
      if (!ids) {
        return;
      }
      const url = new URL(window.location.href);
      url.searchParams.set('vdemo_favs', ids);
      window.navigator.clipboard?.writeText(url.toString());
      shareButton.textContent = 'Copied';
      setTimeout(() => {
        shareButton.textContent = window.VDS_DATA?.strings?.favoritesShare || 'Share';
      }, 1500);
    });
  }

  initFormIntegration() {
    this.messageField = this.findMessageField();
    if (!this.messageField) {
      return;
    }

    this.chipContainer = document.createElement('div');
    this.chipContainer.className = 'vds-form-chips';
    this.messageField.parentNode.insertBefore(this.chipContainer, this.messageField);

    this.updateFormIntegration();
  }

  updateFormIntegration() {
    if (!this.messageField || !this.chipContainer) {
      return;
    }

    this.chipContainer.innerHTML = '';
    const cards = [...document.querySelectorAll('[data-vds-player]')];
    const items = [];

    this.favorites.forEach((id) => {
      const card = cards.find((item) => item.dataset.id === id);
      if (!card) {
        return;
      }
      const title = card.dataset.title || 'Voice Demo';
      const badge = card.dataset.badge ? `#${card.dataset.badge}` : '';
      const label = `${title} ${badge}`.trim();
      items.push(label);
      const chip = document.createElement('span');
      chip.textContent = label;
      this.chipContainer.appendChild(chip);
    });

    const marker = '\n\n--- Voice Demos ---\n';
    const baseValue = this.messageField.value.split(marker)[0];

    if (items.length) {
      this.messageField.value = `${baseValue}${marker}${items.join('\n')}`;
    } else {
      this.messageField.value = baseValue.trim();
    }
  }

  findMessageField() {
    const textareas = document.querySelectorAll('textarea');
    for (const textarea of textareas) {
      const label = this.findLabelFor(textarea);
      if (!label) {
        continue;
      }
      const text = label.textContent.toLowerCase();
      if (text.includes('nachricht') || text.includes('message')) {
        return textarea;
      }
    }
    return null;
  }

  findLabelFor(field) {
    if (field.id) {
      const label = document.querySelector(`label[for="${field.id}"]`);
      if (label) {
        return label;
      }
    }
    return field.closest('label');
  }

  formatTime(time) {
    if (!Number.isFinite(time)) {
      return '0:00';
    }
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new VoiceDemoSystem();
});
