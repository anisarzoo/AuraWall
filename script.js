class AuraWall {
    constructor() {
        this.canvas = document.getElementById('wallpaper-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resolutionInfo = document.getElementById('resolution-info');
        this.dateDisplay = document.getElementById('current-date');
        this.downloadBtn = document.getElementById('download-btn');
        this.shareBtn = document.getElementById('share-btn');
        
        // Custom Dropdown
        this.dropdown = document.getElementById('pattern-dropdown');
        this.dropdownTrigger = document.getElementById('dropdown-trigger');
        this.dropdownMenu = document.getElementById('dropdown-menu');
        this.currentPatternLabel = document.getElementById('current-pattern');
        this.dropdownItems = this.dropdownMenu.querySelectorAll('li');

        // Advanced Controls
        this.settingsToggle = document.getElementById('settings-toggle');
        this.settingsPanel = document.getElementById('settings-panel');
        this.complexitySlider = document.getElementById('complexity-slider');
        this.hueSlider = document.getElementById('hue-slider');
        this.animateToggle = document.getElementById('animate-toggle');
        this.grainToggle = document.getElementById('grain-toggle');
        this.autogenToggle = document.getElementById('autogen-toggle');
        this.gyroToggle = document.getElementById('gyro-toggle');
        this.paletteSwatches = document.querySelectorAll('.palette');


        this.time = 0;
        this.autoGenTimer = 0;
        this.mouse = { x: 0, y: 0 };
        this.targetMouse = { x: 0, y: 0 };
        
        // Social Modal & Cropping
        this.socialSaveBtn = document.getElementById('social-save-btn');
        this.socialModal = document.getElementById('social-modal');
        this.closeModalBtn = this.socialModal.querySelector('.close-modal');
        this.socialOptions = this.socialModal.querySelectorAll('.social-option');
        this.manualCropToggle = document.getElementById('manual-crop-toggle');
        
        this.cropOverlay = document.getElementById('crop-overlay');
        this.cropBox = document.getElementById('crop-box');
        this.cancelCropBtn = document.getElementById('cancel-crop');
        this.confirmCropBtn = document.getElementById('confirm-crop');
        
        this.isCropping = false;
        this.cropState = {
            active: false,
            x: 0, y: 0,
            width: 0, height: 0,
            ratio: 1,
            label: ''
        };

        // Swipe Gesture & History State
        this.touchStart = { x: 0, y: 0 };
        this.touchThreshold = 70;
        // Load State from URL
        this.history = [];
        this.historyIndex = -1;
        this.loadStateFromHash();
        
        this.init();
        this.attachEventListeners();
        this.initCropResizing(); // Initialize handles
        this.initGyroscope();
        this.animate();
        this.registerServiceWorker();
    }

    init() {
        this.resize();
        this.updateDate();
    }

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('SW Registered'))
                .catch(err => console.log('SW Failed', err));
        }
    }

    loadStateFromHash() {
        const hash = window.location.hash.substring(1);
        if (hash) {
            try {
                const state = JSON.parse(decodeURIComponent(hash));
                this.selectedPattern = state.p || 'aurora';
                this.currentSeed = state.s || Math.random() * 1000000;
                this.selectedPalette = state.c || ['#6366f1', '#ec4899', '#a855f7'];
                
                // Update UI to match loaded state
                this.updateUIToState();
            } catch (e) {
                console.error("Invalid state hash");
                this.selectedPattern = 'aurora';
                this.currentSeed = Math.random() * 1000000;
                this.selectedPalette = ['#6366f1', '#ec4899', '#a855f7'];
            }
        } else {
            this.selectedPattern = 'aurora';
            this.currentSeed = this.getDailySeed();
            this.selectedPalette = ['#6366f1', '#ec4899', '#a855f7'];
            this.updateUIToState();
        }

        // Push initial state to history if not already there
        if (this.history.length === 0) {
            this.pushToHistory({
                p: this.selectedPattern,
                s: this.currentSeed,
                c: [...this.selectedPalette]
            });
        }
    }

    updateUIToState() {
        // Update Pattern Label
        const activeItem = [...this.dropdownItems].find(item => item.dataset.value === this.selectedPattern);
        if (activeItem) {
            this.currentPatternLabel.textContent = activeItem.textContent;
            this.dropdownItems.forEach(i => i.classList.remove('active'));
            activeItem.classList.add('active');
        }

        // Update Palette Swatches
        const hexPalette = this.selectedPalette.join(',').toLowerCase();
        this.paletteSwatches.forEach(p => {
            if (p.dataset.colors.toLowerCase() === hexPalette) {
                p.classList.add('active');
            } else {
                p.classList.remove('active');
            }
        });
    }

    updateHash() {
        const state = {
            p: this.selectedPattern,
            s: Math.floor(this.currentSeed),
            c: this.selectedPalette
        };
        window.history.replaceState(null, null, "#" + encodeURIComponent(JSON.stringify(state)));
    }

    animate() {
        if (this.animateToggle.checked) {
            this.time += 0.005;
        }

        if (this.autogenToggle.checked) {
            this.autoGenTimer++;
            if (this.autoGenTimer > 900) { // ~15s at 60fps
                this.currentSeed = Math.random() * 1000000;
                this.autoGenTimer = 0;
            }
        }

        this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.05;
        this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.05;

        this.generate();
        
        if (this.grainToggle.checked) {
            this.renderGrain();
        }

        requestAnimationFrame(() => this.animate());
    }

    updateDate() {
        const options = { month: 'long', day: 'numeric', year: 'numeric' };
        this.dateDisplay.textContent = new Date().toLocaleDateString('en-US', options);
    }

    getDailySeed() {
        const d = new Date();
        return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        this.ctx.scale(dpr, dpr);
        this.resolutionInfo.textContent = `${window.innerWidth} x ${window.innerHeight}`;
    }

    attachEventListeners() {
        // Debounced Resize
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => this.resize(), 100);
        });

        // Keyboard Shortcuts
        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;
            
            if (e.code === 'Space') {
                e.preventDefault();
                this.generateBtn.click();
            } else if (e.code === 'KeyS') {
                this.downloadBtn.click();
            } else if (e.code === 'KeyC') {
                this.settingsToggle.click();
            }

            // Keyboard Navigation
            if (e.code === 'ArrowDown' || e.code === 'ArrowUp') {
                e.preventDefault();
                this.cyclePattern(e.code === 'ArrowDown' ? 1 : -1);
            } else if (e.code === 'Tab') {
                e.preventDefault();
                this.cycleCategory(e.shiftKey ? -1 : 1);
            }
        });

        window.addEventListener('mousemove', (e) => {
            this.targetMouse.x = (e.clientX / window.innerWidth) - 0.5;
            this.targetMouse.y = (e.clientY / window.innerHeight) - 0.5;
        });

        // Touch/Swipe Events
        this.canvas.addEventListener('touchstart', (e) => {
            this.touchStart.x = e.touches[0].clientX;
            this.touchStart.y = e.touches[0].clientY;
        }, { passive: true });

        this.canvas.addEventListener('touchmove', (e) => {
            // Update parallax target for touch
            this.targetMouse.x = (e.touches[0].clientX / window.innerWidth) - 0.5;
            this.targetMouse.y = (e.touches[0].clientY / window.innerHeight) - 0.5;
        }, { passive: true });

        this.canvas.addEventListener('click', (e) => {
            // New interaction: Clicking only changes SEED within current category
            this.currentSeed = Math.random() * 1000000;
            this.autoGenTimer = 0;
            this.updateHash();
            this.generate();
        });

        this.canvas.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            
            const dx = touchEndX - this.touchStart.x;
            const dy = touchEndY - this.touchStart.y;
            
            // Check for vertical swipe (Reels style)
            if (Math.abs(dy) > this.touchThreshold && Math.abs(dy) > Math.abs(dx)) {
                // New interaction: Swiping changes CATEGORY
                this.cyclePattern(dy > 0 ? -1 : 1); 
            }
        }, { passive: true });

        this.downloadBtn.addEventListener('click', () => this.download());

        this.gyroToggle.addEventListener('change', () => {
            if (this.gyroToggle.checked) {
                if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
                    DeviceOrientationEvent.requestPermission()
                        .then(state => {
                            if (state === 'granted') this.showToast('Motion enabled');
                        })
                        .catch(e => console.error(e));
                } else {
                    this.showToast('Motion enabled');
                }
            }
        });


        this.shareBtn.addEventListener('click', () => {
            const url = window.location.href;
            navigator.clipboard.writeText(url).then(() => {
                this.showToast('Link copied to clipboard!');
            });
        });

        this.socialSaveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.socialModal.classList.add('open');
        });

        this.closeModalBtn.addEventListener('click', () => {
            this.socialModal.classList.remove('open');
        });

        this.socialOptions.forEach(opt => {
            opt.addEventListener('click', () => {
                const ratioStr = opt.dataset.ratio;
                const [rw, rh] = ratioStr.split('/').map(Number);
                const ratio = rw / rh;
                const label = opt.dataset.label;
                
                this.socialModal.classList.remove('open');
                
                if (this.manualCropToggle.checked) {
                    this.startManualCrop(ratio, label);
                } else {
                    this.downloadSocial(ratio, label);
                }
            });
        });

        // Close modal when clicking outside
        this.socialModal.addEventListener('click', (e) => {
            if (e.target === this.socialModal) {
                this.socialModal.classList.remove('open');
            }
        });

        this.cancelCropBtn.addEventListener('click', () => this.stopManualCrop());
        this.confirmCropBtn.addEventListener('click', () => this.executeCrop());

        this.settingsToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.settingsPanel.classList.toggle('open');
        });

        this.paletteSwatches.forEach(p => {
            p.addEventListener('click', () => {
                this.selectedPalette = p.dataset.colors.split(',');
                this.paletteSwatches.forEach(sw => sw.classList.remove('active'));
                p.classList.add('active');
                this.updateHash();
            });
        });

        document.addEventListener('click', (e) => {
            if (!this.settingsPanel.contains(e.target)) {
                this.settingsPanel.classList.remove('open');
            }
        });

        this.dropdownTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            this.dropdown.classList.toggle('open');
        });

        this.dropdownItems.forEach(item => {
            item.addEventListener('click', () => {
                this.selectedPattern = item.dataset.value;
                this.currentPatternLabel.textContent = item.textContent;
                this.dropdownItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                this.dropdown.classList.remove('open');
                this.updateHash();
            });
        });

        document.addEventListener('click', () => {
            this.dropdown.classList.remove('open');
        });
    }

    cyclePattern(direction) {
        const items = Array.from(this.dropdown.querySelectorAll('li[data-value]'));
        const currentIdx = items.findIndex(item => item.dataset.value === this.selectedPattern);
        let nextIdx = currentIdx + direction;
        
        if (nextIdx >= items.length) nextIdx = 0;
        if (nextIdx < 0) nextIdx = items.length - 1;
        
        this.selectItem(items[nextIdx]);
    }

    cycleCategory(direction) {
        const dividers = Array.from(this.dropdown.querySelectorAll('li.dropdown-divider'));
        const items = Array.from(this.dropdown.querySelectorAll('li'));
        const currentItem = this.dropdown.querySelector(`li[data-value="${this.selectedPattern}"]`);
        const itemIdx = items.indexOf(currentItem);
        
        let currentDivIdx = -1;
        for (let i = itemIdx; i >= 0; i--) {
            if (items[i] && items[i].classList && items[i].classList.contains('dropdown-divider')) {
                currentDivIdx = dividers.indexOf(items[i]);
                break;
            }
        }

        let nextDivIdx = currentDivIdx + direction;
        if (nextDivIdx >= dividers.length) nextDivIdx = 0;
        if (nextDivIdx < 0) nextDivIdx = dividers.length - 1;

        const nextDivider = dividers[nextDivIdx];
        const nextDividerIdx = items.indexOf(nextDivider);
        
        for (let i = nextDividerIdx + 1; i < items.length; i++) {
            if (items[i].dataset && items[i].dataset.value) {
                this.selectItem(items[i]);
                this.showToast(`Category: ${nextDivider.textContent}`);
                break;
            }
        }
    }

    pushToHistory(state) {
        // If we're not at the end of history, truncate the "future"
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        this.history.push(state);
        this.historyIndex = this.history.length - 1;
        // Keep history manageable
        if (this.history.length > 50) {
            this.history.shift();
            this.historyIndex--;
        }
    }

    navigateHistory(direction) {
        if (direction === -1) { // Previous
            if (this.historyIndex > 0) {
                this.historyIndex--;
                this.applyState(this.history[this.historyIndex]);
            } else {
                this.showToast('At the beginning of history');
            }
        } else { // Next
            if (this.historyIndex < this.history.length - 1) {
                this.historyIndex++;
                this.applyState(this.history[this.historyIndex]);
            } else {
                this.randomizeWallpaper();
            }
        }
    }

    applyState(state) {
        this.selectedPattern = state.p;
        this.currentSeed = state.s;
        this.selectedPalette = state.c;
        
        const item = Array.from(this.dropdownItems).find(i => i.dataset.value === this.selectedPattern);
        if (item) {
            this.currentPatternLabel.textContent = item.textContent;
            this.dropdownItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
        
        this.generate();
        this.updateHash();
    }

    randomizeWallpaper() {
        const items = Array.from(this.dropdownItems).filter(item => item.dataset.value);
        if (items.length === 0) return;
        
        const randomIndex = Math.floor(Math.random() * items.length);
        const randomItem = items[randomIndex];
        
        this.selectedPattern = randomItem.dataset.value;
        this.currentSeed = Math.random() * 1000000;
        
        // Push NEW randomized state to history
        this.pushToHistory({
            p: this.selectedPattern,
            s: this.currentSeed,
            c: [...this.selectedPalette]
        });

        this.selectItem(randomItem, false); // false = don't push to history again
    }

    selectItem(item, addToHistory = true) {
        if (!item) return;
        this.selectedPattern = item.dataset.value;
        this.currentPatternLabel.textContent = item.textContent;
        this.dropdownItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

        if (addToHistory) {
            this.pushToHistory({
                p: this.selectedPattern,
                s: this.currentSeed,
                c: [...this.selectedPalette]
            });
        }

        this.generate();
        this.updateHash();
    }



    initGyroscope() {
        // Primary listener (Standard/iOS)
        if (window.DeviceOrientationEvent) {
            const sensitivity = 2.0; 
            const handleOrientation = (e) => {
                if (!this.gyroToggle.checked) return;
                if (e.beta !== null && e.gamma !== null) {
                    const tiltX = (e.gamma / 30) * sensitivity; 
                    const tiltY = ((e.beta - 45) / 30) * sensitivity; 
                    this.targetMouse.x = Math.max(-0.6, Math.min(0.6, tiltX));
                    this.targetMouse.y = Math.max(-0.6, Math.min(0.6, tiltY));
                }
            };

            window.addEventListener('deviceorientation', handleOrientation, true);
            
            // Android Chrome Fallback
            if ('ondeviceorientationabsolute' in window) {
                window.addEventListener('deviceorientationabsolute', handleOrientation, true);
            }
        }
    }

    showToast(msg) {
        let toast = document.querySelector('.toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'toast';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    startManualCrop(ratio, label) {
        this.isCropping = true;
        this.cropState.active = true;
        this.cropState.ratio = ratio;
        this.cropState.label = label;
        
        const margin = 50;
        let w = (window.innerWidth - margin * 2) * 0.7;
        let h = w / ratio;
        
        if (h > window.innerHeight - margin * 2) {
            h = (window.innerHeight - margin * 2) * 0.7;
            w = h * ratio;
        }
        
        this.cropState.width = w;
        this.cropState.height = h;
        this.cropState.x = (window.innerWidth - w) / 2;
        this.cropState.y = (window.innerHeight - h) / 2;
        
        this.cropOverlay.style.display = 'block';
        this.cropOverlay.classList.add('active');
        this.updateCropBox();
        this.showToast(`Drag to adjust ${label}`);

        this.initCropDragging();
    }

    initCropResizing() {
        const handles = this.cropOverlay.querySelectorAll('.crop-handle');
        let isResizing = false;
        let currentHandle = null;
        let startX, startY;
        let startW, startH;
        let startXBox, startYBox;

        const startResizing = (e, handle) => {
            isResizing = true;
            currentHandle = handle;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            startX = clientX;
            startY = clientY;
            startW = this.cropState.width;
            startH = this.cropState.height;
            startXBox = this.cropState.x;
            startYBox = this.cropState.y;
            e.stopPropagation();
            if (!e.touches) e.preventDefault();
        };

        const moveResizing = (e) => {
            if (!isResizing) return;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            const dx = clientX - startX;
            const dy = clientY - startY;

            let newW = startW;
            let newH = startH;
            let newX = startXBox;
            let newY = startYBox;

            if (currentHandle.classList.contains('se')) {
                newW = Math.max(100, startW + dx);
                newH = newW / this.cropState.ratio;
            } else if (currentHandle.classList.contains('sw')) {
                newW = Math.max(100, startW - dx);
                newH = newW / this.cropState.ratio;
                newX = startXBox + (startW - newW);
            } else if (currentHandle.classList.contains('ne')) {
                newH = Math.max(100, startH - dy);
                newW = newH * this.cropState.ratio;
                newY = startYBox + (startH - newH);
            } else if (currentHandle.classList.contains('nw')) {
                newW = Math.max(100, startW - dx);
                newH = newW / this.cropState.ratio;
                newX = startXBox + (startW - newW);
                newY = startYBox + (startH - newH);
            }

            // Boundary checks
            if (newX >= 0 && newY >= 0 && newX + newW <= window.innerWidth && newY + newH <= window.innerHeight) {
                this.cropState.width = newW;
                this.cropState.height = newH;
                this.cropState.x = newX;
                this.cropState.y = newY;
                this.updateCropBox();
            }
        };

        const stopResizing = () => {
            isResizing = false;
            currentHandle = null;
        };

        handles.forEach(handle => {
            handle.addEventListener('mousedown', (e) => startResizing(e, handle));
            handle.addEventListener('touchstart', (e) => startResizing(e, handle), { passive: false });
        });

        window.addEventListener('mousemove', moveResizing);
        window.addEventListener('touchmove', moveResizing, { passive: false });
        window.addEventListener('mouseup', stopResizing);
        window.addEventListener('touchend', stopResizing);
    }

    initCropDragging() {
        let isDragging = false;
        let startX, startY;
        let startBoxX, startBoxY;

        const startDragging = (e) => {
            isDragging = true;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            startX = clientX;
            startY = clientY;
            startBoxX = this.cropState.x;
            startBoxY = this.cropState.y;
            if (!e.touches) e.preventDefault();
        };

        const moveDragging = (e) => {
            if (!isDragging) return;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            const dx = clientX - startX;
            const dy = clientY - startY;
            
            this.cropState.x = Math.max(0, Math.min(window.innerWidth - this.cropState.width, startBoxX + dx));
            this.cropState.y = Math.max(0, Math.min(window.innerHeight - this.cropState.height, startBoxY + dy));
            
            this.updateCropBox();
        };

        const stopDragging = () => {
            isDragging = false;
        };

        // Desktop
        this.cropBox.onmousedown = startDragging;
        window.onmousemove = moveDragging;
        window.onmouseup = stopDragging;

        // Mobile
        this.cropBox.ontouchstart = startDragging;
        window.ontouchmove = moveDragging;
        window.ontouchend = stopDragging;
    }

    updateCropBox() {
        this.cropBox.style.width = `${this.cropState.width}px`;
        this.cropBox.style.height = `${this.cropState.height}px`;
        this.cropBox.style.left = `${this.cropState.x}px`;
        this.cropBox.style.top = `${this.cropState.y}px`;
    }

    stopManualCrop() {
        this.isCropping = false;
        this.cropState.active = false;
        this.cropOverlay.style.display = 'none';
        this.cropOverlay.classList.remove('active');
        this.cropBox.onmousedown = null;
        window.onmousemove = null;
        window.onmouseup = null;
    }

    executeCrop() {
        const dpr = window.devicePixelRatio || 1;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.cropState.width * dpr;
        tempCanvas.height = this.cropState.height * dpr;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Use exact dpr-adjusted positions for the high-res buffer
        tempCtx.drawImage(
            this.canvas,
            this.cropState.x * dpr, this.cropState.y * dpr,
            this.cropState.width * dpr, this.cropState.height * dpr,
            0, 0,
            tempCanvas.width, tempCanvas.height
        );
        
        const link = document.createElement('a');
        const timestamp = Date.now();
        link.download = `AuraWall-${this.cropState.label.replace(/\s+/g, '-')}-${timestamp}.png`;
        link.href = tempCanvas.toDataURL('image/png', 1.0);
        link.click();
        
        this.stopManualCrop();
        this.showToast('Image saved!');
    }

    downloadSocial(ratio, label) {
        // High quality render
        const targetWidth = 2400; 
        const targetHeight = targetWidth / ratio;
        
        const hqCanvas = document.createElement('canvas');
        hqCanvas.width = targetWidth;
        hqCanvas.height = targetHeight;
        const hqCtx = hqCanvas.getContext('2d');

        // Hackily swap context for rendering
        const originalCtx = this.ctx;
        this.ctx = hqCtx;
        
        // Re-generate current pattern with current seed on HQ canvas
        this.generate(this.currentSeed, targetWidth, targetHeight);
        
        const link = document.createElement('a');
        const timestamp = Date.now();
        link.download = `AuraWall-${label.replace(/\s+/g, '-')}-${timestamp}.png`;
        link.href = hqCanvas.toDataURL('image/png', 1.0);
        link.click();
        
        // Restore context
        this.ctx = originalCtx;
        this.showToast(`${label} saved!`);
    }

    seededRandom(seed) {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    }

    generate(seed = this.currentSeed, w = window.innerWidth, h = window.innerHeight) {
        const pattern = this.selectedPattern;
        this.ctx.clearRect(0, 0, w, h);

        switch(pattern) {
            case 'aurora': this.renderAurora(seed, w, h); break;
            case 'geometric': this.renderGeometric(seed, w, h); break;
            case 'nebula': this.renderNebula(seed, w, h); break;
            case 'minimal': this.renderMinimal(seed, w, h); break;
            case 'solid': this.renderSolid(seed, w, h); break;
            case 'linear': this.renderLinear(seed, w, h); break;
            case 'radial': this.renderRadial(seed, w, h); break;
            case 'mesh': this.renderMesh(seed, w, h); break;
            case 'rain': this.renderRain(seed, w, h); break;
            case 'smokey': this.renderSmokey(seed, w, h); break;
            case 'matrix': this.renderMatrix(seed, w, h); break;
            case 'binary': this.renderBinary(seed, w, h); break;
            case 'neon': this.renderNeon(seed, w, h); break;
            case 'ink': this.renderInk(seed, w, h); break;
            case 'void': this.renderVoid(seed, w, h); break;
            case 'grid': this.renderGrid(seed, w, h); break;
            case 'glass': this.renderGlass(seed, w, h); break;
            case 'silk2': this.renderSilk2(seed, w, h); break;
            case 'speed': this.renderSpeed(seed, w, h); break;
            case 'circuit': this.renderCircuit(seed, w, h); break;
            case 'vortex': this.renderVortex(seed, w, h); break;
            case 'electric': this.renderElectric(seed, w, h); break;
            case 'poly': this.renderPoly(seed, w, h); break;
            case 'crystal': this.renderCrystal(seed, w, h); break;
            case 'ocean': this.renderOcean(seed, w, h); break;
            case 'fire': this.renderFire(seed, w, h); break;
            case 'clouds': this.renderClouds(seed, w, h); break;
            case 'snow': this.renderSnow(seed, w, h); break;
            case 'crt': this.renderCRT(seed, w, h); break;
            case 'vhs': this.renderVHS(seed, w, h); break;
            case 'pixel': this.renderPixel(seed, w, h); break;
            case 'sunset': this.renderSunset(seed, w, h); break;
            case 'voronoi': this.renderVoronoi(seed, w, h); break;
            case 'delaunay': this.renderDelaunay(seed, w, h); break;
            case 'cellular': this.renderCellular(seed, w, h); break;
            case 'slime': this.renderSlime(seed, w, h); break;
            case 'coral': this.renderCoral(seed, w, h); break;
            case 'plasma': this.renderPlasma(seed, w, h); break;
            case 'wormhole': this.renderWormhole(seed, w, h); break;
            case 'data': this.renderData(seed, w, h); break;
            case 'hologram': this.renderHologram(seed, w, h); break;
            case 'dots': this.renderDots(seed, w, h); break;
            case 'spheres': this.renderSpheres(seed, w, h); break;
            case 'paper': this.renderPaper(seed, w, h); break;
            case 'soft': this.renderSoft(seed, w, h); break;
        }
    }

    renderOcean(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        const complexity = parseInt(this.complexitySlider.value);
        
        this.ctx.fillStyle = '#0a192f';
        this.ctx.fillRect(0, 0, w, h);

        const layers = Math.floor(complexity / 10) + 3;
        for (let i = 0; i < layers; i++) {
            const color = this.selectedPalette[i % this.selectedPalette.length];
            this.ctx.fillStyle = this.getAdjustedColor(color, 0.4);
            
            this.ctx.beginPath();
            this.ctx.moveTo(0, h);
            
            const segmentCount = 20;
            const segmentWidth = w / segmentCount;
            
            for (let j = 0; j <= segmentCount; j++) {
                const x = j * segmentWidth;
                const waveHeight = (h / layers) * (layers - i);
                const y = waveHeight + Math.sin(this.time * 2 + (j * 0.5) + (i * 1.5)) * 30;
                this.ctx.lineTo(x, y);
            }
            
            this.ctx.lineTo(w, h);
            this.ctx.closePath();
            this.ctx.fill();
        }
    }

    renderFire(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        const complexity = parseInt(this.complexitySlider.value);
        
        this.ctx.fillStyle = '#050000';
        this.ctx.fillRect(0, 0, w, h);

        const count = complexity * 4 + 20;
        for (let i = 0; i < count; i++) {
            const x = this.seededRandom(s++) * w + (this.mouse.x * 50);
            const y = (this.seededRandom(s++) * h - (this.time * 500)) % h;
            const finalY = y < 0 ? y + h : y;
            
            const size = this.seededRandom(s++) * 5 + 1;
            const color = this.selectedPalette[i % this.selectedPalette.length];
            
            this.ctx.fillStyle = this.getAdjustedColor(color, (finalY / h));
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = color;
            
            this.ctx.beginPath();
            this.ctx.arc(x, finalY, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.shadowBlur = 0;
    }

    renderClouds(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        const complexity = parseInt(this.complexitySlider.value);
        
        const baseColor = this.selectedPalette[0];
        this.ctx.fillStyle = this.getAdjustedColor(baseColor, 0.1);
        this.ctx.fillRect(0, 0, w, h);

        const count = Math.floor(complexity / 5) + 5;
        for (let i = 0; i < count; i++) {
            const x = (this.seededRandom(s++) * w + this.time * 50) % w;
            const y = this.seededRandom(s++) * h;
            const size = this.seededRandom(s++) * 300 + 100;
            const color = this.selectedPalette[i % this.selectedPalette.length];
            
            const grad = this.ctx.createRadialGradient(x, y, 0, x, y, size);
            grad.addColorStop(0, this.getAdjustedColor(color, 0.2));
            grad.addColorStop(1, 'transparent');
            
            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.ellipse(x, y, size, size * 0.6, 0, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    renderSnow(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        const complexity = parseInt(this.complexitySlider.value);
        
        this.ctx.fillStyle = '#050510';
        this.ctx.fillRect(0, 0, w, h);

        const count = complexity * 5 + 50;
        for (let i = 0; i < count; i++) {
            const x = (this.seededRandom(s++) * w + this.mouse.x * 100) % w;
            const y = (this.seededRandom(s++) * h + (this.time * 200)) % h;
            const size = this.seededRandom(s++) * 3 + 1;
            
            this.ctx.fillStyle = 'white';
            this.ctx.globalAlpha = this.seededRandom(s++) * 0.8;
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1.0;
    }

    renderVortex(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        const complexity = parseInt(this.complexitySlider.value);
        
        this.ctx.fillStyle = '#050508';
        this.ctx.fillRect(0, 0, w, h);

        const cx = w / 2 + (this.mouse.x * 100);
        const cy = h / 2 + (this.mouse.y * 100);
        const count = complexity * 5 + 50;

        for (let i = 0; i < count; i++) {
            const angle = (i * 0.1) + this.time + (this.seededRandom(s++) * Math.PI);
            const r = (i / count) * Math.max(w, h) * 0.8;
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;
            
            const color = this.selectedPalette[i % this.selectedPalette.length];
            this.ctx.fillStyle = this.getAdjustedColor(color, (1 - i / count) * 0.8);
            this.ctx.beginPath();
            this.ctx.arc(x, y, (1 - i / count) * 5 + 1, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    renderElectric(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        const complexity = parseInt(this.complexitySlider.value);
        
        this.ctx.fillStyle = '#00000a';
        this.ctx.fillRect(0, 0, w, h);

        const branches = Math.floor(complexity / 10) + 2;
        for (let b = 0; b < branches; b++) {
            let x = w / 2;
            let y = h / 2;
            const color = this.selectedPalette[b % this.selectedPalette.length];
            
            this.ctx.strokeStyle = this.getAdjustedColor(color, 0.8);
            this.ctx.lineWidth = 2;
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = color;
            
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            
            for (let i = 0; i < 20; i++) {
                x += (this.seededRandom(s++) - 0.5) * 200;
                y += (this.seededRandom(s++) - 0.5) * 200;
                this.ctx.lineTo(x, y);
            }
            this.ctx.stroke();
        }
        this.ctx.shadowBlur = 0;
    }

    renderPoly(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        const complexity = parseInt(this.complexitySlider.value);
        
        const baseColor = this.selectedPalette[0];
        this.ctx.fillStyle = this.getAdjustedColor(baseColor, 0.2);
        this.ctx.fillRect(0, 0, w, h);

        const gridSize = 100 - (complexity / 2);
        const cols = Math.ceil(w / gridSize) + 1;
        const rows = Math.ceil(h / gridSize) + 1;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const x1 = c * gridSize;
                const y1 = r * gridSize;
                
                const offset = (this.seededRandom(s++) - 0.5) * gridSize * 0.8;
                const paletteColor = this.selectedPalette[(c + r) % this.selectedPalette.length];
                
                // Draw triangles
                this.ctx.fillStyle = this.getAdjustedColor(paletteColor, 0.4 + (this.seededRandom(s++) * 0.2));
                this.ctx.beginPath();
                this.ctx.moveTo(x1, y1);
                this.ctx.lineTo(x1 + gridSize, y1);
                this.ctx.lineTo(x1 + gridSize/2 + offset, y1 + gridSize/2);
                this.ctx.closePath();
                this.ctx.fill();
            }
        }
    }

    renderCrystal(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        const complexity = parseInt(this.complexitySlider.value);
        
        this.ctx.fillStyle = '#0a0a0c';
        this.ctx.fillRect(0, 0, w, h);

        const count = Math.floor(complexity / 5) + 5;
        for (let i = 0; i < count; i++) {
            const x = this.seededRandom(s++) * w;
            const y = this.seededRandom(s++) * h;
            const size = this.seededRandom(s++) * 200 + 100;
            const color = this.selectedPalette[i % this.selectedPalette.length];
            
            this.ctx.save();
            this.ctx.translate(x, y);
            this.ctx.rotate(this.time * 0.2 + s);
            
            this.ctx.beginPath();
            for (let j = 0; j < 6; j++) {
                const angle = (j / 6) * Math.PI * 2;
                const r = size * (0.8 + this.seededRandom(s++) * 0.4);
                if (j === 0) this.ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
                else this.ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
            }
            this.ctx.closePath();
            
            const grad = this.ctx.createLinearGradient(-size, -size, size, size);
            grad.addColorStop(0, this.getAdjustedColor(color, 0.4));
            grad.addColorStop(1, 'transparent');
            this.ctx.fillStyle = grad;
            this.ctx.fill();
            this.ctx.strokeStyle = this.getAdjustedColor(color, 0.6);
            this.ctx.stroke();
            
            this.ctx.restore();
        }
    }

    renderGlass(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        const complexity = parseInt(this.complexitySlider.value);
        
        // Dynamic Backdrop
        const bgGrad = this.ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w);
        bgGrad.addColorStop(0, this.getAdjustedColor(this.selectedPalette[0], 0.4));
        bgGrad.addColorStop(1, '#0f172a');
        this.ctx.fillStyle = bgGrad;
        this.ctx.fillRect(0, 0, w, h);

        const count = Math.floor(complexity / 15) + 3;
        for (let i = 0; i < count; i++) {
            const x = w * this.seededRandom(s++) + (Math.sin(this.time + s) * 50);
            const y = h * this.seededRandom(s++) + (Math.cos(this.time + s) * 50);
            const size = this.seededRandom(s++) * 300 + 100;
            
            this.ctx.save();
            this.ctx.translate(x, y);
            this.ctx.rotate(this.time * 0.1 + s);
            
            // Frosted Glass Effect
            this.ctx.beginPath();
            this.ctx.roundRect(-size/2, -size/2, size, size, 20);
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            this.ctx.fill();
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
            
            // Shine
            const shine = this.ctx.createLinearGradient(-size/2, -size/2, size/2, size/2);
            shine.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
            shine.addColorStop(0.5, 'transparent');
            shine.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
            this.ctx.fillStyle = shine;
            this.ctx.fill();
            
            this.ctx.restore();
        }
    }

    renderSilk2(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        const complexity = parseInt(this.complexitySlider.value);
        
        this.ctx.fillStyle = '#050505';
        this.ctx.fillRect(0, 0, w, h);

        const lines = complexity + 10;
        for (let i = 0; i < lines; i++) {
            const color = this.selectedPalette[i % this.selectedPalette.length];
            this.ctx.strokeStyle = this.getAdjustedColor(color, 0.3);
            this.ctx.lineWidth = 0.5;
            
            this.ctx.beginPath();
            let x = -50;
            let y = (h / lines) * i;
            this.ctx.moveTo(x, y);
            
            for (let j = 0; j < 20; j++) {
                const nx = x + (w / 18);
                const ny = y + Math.sin(this.time + (j * 0.5) + (i * 0.2)) * 100;
                this.ctx.lineTo(nx, ny);
                x = nx;
            }
            this.ctx.stroke();
        }
    }

    renderSpeed(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        const complexity = parseInt(this.complexitySlider.value);
        
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, w, h);

        const count = complexity * 3;
        const cx = w / 2;
        const cy = h / 2;
        
        for (let i = 0; i < count; i++) {
            const angle = this.seededRandom(s++) * Math.PI * 2;
            const dist = (this.seededRandom(s++) * w + this.time * 2000) % w;
            const x = cx + Math.cos(angle) * dist;
            const y = cy + Math.sin(angle) * dist;
            const length = (dist / w) * 100;
            
            const color = this.selectedPalette[Math.floor(this.seededRandom(s++) * this.selectedPalette.length)];
            this.ctx.strokeStyle = this.getAdjustedColor(color, dist / w);
            this.ctx.lineWidth = (dist / w) * 3;
            
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
            this.ctx.stroke();
        }
    }

    renderCircuit(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        const complexity = parseInt(this.complexitySlider.value);
        
        this.ctx.fillStyle = '#0a0a0c';
        this.ctx.fillRect(0, 0, w, h);

        const gridSize = 40;
        this.ctx.strokeStyle = this.getAdjustedColor(this.selectedPalette[0], 0.2);
        this.ctx.lineWidth = 1;

        const count = complexity / 2 + 5;
        for (let i = 0; i < count; i++) {
            let x = Math.floor(this.seededRandom(s++) * (w / gridSize)) * gridSize;
            let y = Math.floor(this.seededRandom(s++) * (h / gridSize)) * gridSize;
            
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            
            const color = this.selectedPalette[Math.floor(this.seededRandom(s++) * this.selectedPalette.length)];
            this.ctx.strokeStyle = this.getAdjustedColor(color, 0.6);
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = color;

            for (let j = 0; j < 5; j++) {
                const dir = Math.floor(this.seededRandom(s++) * 4);
                if (dir === 0) x += gridSize;
                else if (dir === 1) x -= gridSize;
                else if (dir === 2) y += gridSize;
                else y -= gridSize;
                this.ctx.lineTo(x, y);
            }
            this.ctx.stroke();
            
            // Node point
            this.ctx.fillStyle = this.getAdjustedColor(color, 1);
            this.ctx.beginPath();
            this.ctx.arc(x, y, 3, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.shadowBlur = 0;
    }

    renderNeon(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        const complexity = parseInt(this.complexitySlider.value);
        
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, w, h);

        const count = Math.floor(complexity / 4) + 5;
        for (let i = 0; i < count; i++) {
            const paletteColor = this.selectedPalette[Math.floor(this.seededRandom(s++) * this.selectedPalette.length)];
            const color = this.getAdjustedColor(paletteColor);
            
            this.ctx.strokeStyle = color;
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = color;
            this.ctx.lineWidth = 2;
            
            this.ctx.beginPath();
            const y = (this.seededRandom(s++) * h + this.time * 200) % h;
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(w, y);
            this.ctx.stroke();
        }
        this.ctx.shadowBlur = 0;
    }

    renderInk(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        const complexity = parseInt(this.complexitySlider.value);
        
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, w, h);

        for (let i = 0; i < 5; i++) {
            const x = w * this.seededRandom(s++) + (this.mouse.x * 200);
            const y = h * this.seededRandom(s++) + (this.mouse.y * 200);
            const rad = this.seededRandom(s++) * w * 0.5 + 100;
            
            const paletteColor = this.selectedPalette[i % this.selectedPalette.length];
            const grad = this.ctx.createRadialGradient(x, y, 0, x, y, rad);
            grad.addColorStop(0, this.getAdjustedColor(paletteColor, 0.3));
            grad.addColorStop(1, 'transparent');
            
            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.ellipse(x, y, rad, rad * 0.6, this.time + s, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    renderVoid(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        const complexity = parseInt(this.complexitySlider.value);
        
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, w, h);

        // Distant Stars
        this.ctx.fillStyle = '#fff';
        for (let i = 0; i < complexity * 2; i++) {
            const x = (this.seededRandom(s++) * w + this.mouse.x * 20) % w;
            const y = (this.seededRandom(s++) * h + this.mouse.y * 20) % h;
            this.ctx.globalAlpha = this.seededRandom(s++) * 0.8;
            this.ctx.fillRect(x, y, 1, 1);
        }

        // Nebula Wisps
        for (let i = 0; i < 3; i++) {
            const x = w * this.seededRandom(s++);
            const y = h * this.seededRandom(s++);
            const paletteColor = this.selectedPalette[Math.floor(this.seededRandom(s++) * this.selectedPalette.length)];
            const grad = this.ctx.createRadialGradient(x, y, 0, x, y, w * 0.6);
            grad.addColorStop(0, this.getAdjustedColor(paletteColor, 0.05));
            grad.addColorStop(1, 'transparent');
            this.ctx.fillStyle = grad;
            this.ctx.fillRect(0, 0, w, h);
        }
        this.ctx.globalAlpha = 1.0;
    }

    renderGrid(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        const complexity = parseInt(this.complexitySlider.value);
        
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, w, h);

        const mainColor = this.selectedPalette[Math.floor(this.seededRandom(s++) * this.selectedPalette.length)];
        const color = this.getAdjustedColor(mainColor, 0.4);
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 1;
        
        const horizon = h * (0.4 + this.seededRandom(s++) * 0.3); // Seeded horizon
        const step = 40 + (complexity / 2);
        
        const vanishX = w / 2 + (this.mouse.x * 100) + (this.seededRandom(s++) - 0.5) * 200; // Seeded vanishing point
        
        // Vertical lines
        for (let x = -w; x < w * 2; x += step) {
            this.ctx.beginPath();
            this.ctx.moveTo(vanishX + (x - w / 2) * 0.1, horizon);
            this.ctx.lineTo(x + this.mouse.x * 100, h);
            this.ctx.stroke();
        }

        // Horizontal lines (animated)
        const offset = (this.time * 50) % step;
        for (let y = horizon; y < h; y += (y - horizon) * 0.3 + 5) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y + offset);
            this.ctx.lineTo(w, y + offset);
            this.ctx.stroke();
        }
    }

    renderRain(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        const complexity = parseInt(this.complexitySlider.value);
        
        // Blurred Background Layer (Muted)
        const bgGrad = this.ctx.createLinearGradient(0, 0, 0, h);
        const baseColor = this.selectedPalette[0];
        bgGrad.addColorStop(0, this.getAdjustedColor(baseColor, 0.4));
        bgGrad.addColorStop(1, '#0a0a0c');
        this.ctx.fillStyle = bgGrad;
        this.ctx.fillRect(0, 0, w, h);

        // Glass Overlay (Slight tint)
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.fillRect(0, 0, w, h);

        const count = complexity + 10;
        for (let i = 0; i < count; i++) {
            const rx = this.seededRandom(s++) * w;
            const ry = (this.seededRandom(s++) * h + (this.time * (10 + this.seededRandom(s++) * 40))) % h;
            const size = this.seededRandom(s++) * 10 + 2;
            const color = this.selectedPalette[Math.floor(this.seededRandom(s++) * this.selectedPalette.length)];
            
            this.drawRainDrop(rx, ry, size, color, s++);
        }
    }

    drawRainDrop(x, y, size, color, s) {
        // Main Body / Refraction (Lens effect simulation)
        this.ctx.save();
        this.ctx.translate(x, y);
        
        // Drop shadow (Depth)
        this.ctx.beginPath();
        this.ctx.arc(1, 1, size, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        this.ctx.fill();

        // Drop body
        this.ctx.beginPath();
        this.ctx.arc(0, 0, size, 0, Math.PI * 2);
        const bodyGrad = this.ctx.createRadialGradient(-size/3, -size/3, 0, 0, 0, size);
        bodyGrad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
        bodyGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.05)');
        bodyGrad.addColorStop(1, this.getAdjustedColor(color, 0.2));
        this.ctx.fillStyle = bodyGrad;
        this.ctx.fill();

        // Highlight (Top Left)
        this.ctx.beginPath();
        this.ctx.arc(-size/2.5, -size/2.5, size/4, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        this.ctx.fill();

        // Bottom Reflection
        this.ctx.beginPath();
        this.ctx.arc(size/2.5, size/2.5, size/3, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.fill();

        this.ctx.restore();

        // Small stationary drops around it
        if (size > 5 && this.seededRandom(s) > 0.8) {
            for (let j = 0; j < 3; j++) {
                const ox = (this.seededRandom(s++) - 0.5) * size * 4;
                const oy = (this.seededRandom(s++) - 0.5) * size * 4;
                const smallSize = this.seededRandom(s++) * 2 + 1;
                this.ctx.beginPath();
                this.ctx.arc(x + ox, y + oy, smallSize, 0, Math.PI * 2);
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                this.ctx.fill();
            }
        }
    }

    renderSmokey(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        const complexity = parseInt(this.complexitySlider.value);
        
        this.ctx.fillStyle = '#111827';
        this.ctx.fillRect(0, 0, w, h);

        const count = Math.floor(complexity / 5) + 5;
        for (let i = 0; i < count; i++) {
            const x = this.seededRandom(s++) * w + (Math.sin(this.time * 0.5 + s) * 100);
            const y = this.seededRandom(s++) * h + (Math.cos(this.time * 0.5 + s) * 100);
            const size = this.seededRandom(s++) * 400 + 200;
            
            const grad = this.ctx.createRadialGradient(x, y, 0, x, y, size);
            const color = this.selectedPalette[Math.floor(this.seededRandom(s++) * this.selectedPalette.length)];
            
            grad.addColorStop(0, this.getAdjustedColor(color, 0.1));
            grad.addColorStop(1, 'transparent');
            
            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    renderMatrix(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        const complexity = parseInt(this.complexitySlider.value);
        
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, w, h);

        const fontSize = 12;
        const columns = Math.floor(w / fontSize);
        this.ctx.font = `bold ${fontSize}px monospace`;
        
        const density = Math.floor(complexity / 2) + 15;
        for (let i = 0; i < density; i++) {
            const x = Math.floor(this.seededRandom(s++) * columns) * fontSize;
            let y = (this.seededRandom(s++) * h + this.time * 600) % h;
            
            const color = this.selectedPalette[Math.floor(this.seededRandom(s++) * this.selectedPalette.length)];
            
            // Draw trail
            const trailLen = Math.floor(this.seededRandom(s++) * 15) + 5;
            for (let j = 0; j < trailLen; j++) {
                const opacity = 1 - (j / trailLen);
                this.ctx.fillStyle = this.getAdjustedColor(color, opacity * 0.8);
                
                const charCode = 0x30A0 + Math.floor(this.seededRandom(s + i + j) * 96);
                const char = String.fromCharCode(charCode);
                
                const cy = y - (j * fontSize);
                if (cy > 0 && cy < h) {
                    this.ctx.fillText(char, x, cy);
                }
            }
            
            // Glowing head
            this.ctx.fillStyle = '#fff';
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = color;
            const headCharCode = 0x30A0 + Math.floor(this.seededRandom(s + i) * 96);
            this.ctx.fillText(String.fromCharCode(headCharCode), x, y);
            this.ctx.shadowBlur = 0;
        }
    }

    renderBinary(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        const complexity = parseInt(this.complexitySlider.value);
        
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, w, h);

        const fontSize = 14;
        const columns = Math.floor(w / fontSize);
        this.ctx.font = `bold ${fontSize}px monospace`;
        
        const density = Math.floor(complexity / 2) + 20;
        for (let i = 0; i < density; i++) {
            const x = Math.floor(this.seededRandom(s++) * columns) * fontSize;
            let y = (this.seededRandom(s++) * h + this.time * 800) % h;
            
            // Draw trail
            const trailLen = Math.floor(this.seededRandom(s++) * 12) + 8;
            for (let j = 0; j < trailLen; j++) {
                const opacity = 1 - (j / trailLen);
                this.ctx.fillStyle = `rgba(0, 255, 70, ${opacity * 0.8})`;
                
                const char = this.seededRandom(s + i + j) > 0.5 ? "1" : "0";
                const cy = y - (j * fontSize);
                if (cy > 0 && cy < h) {
                    this.ctx.fillText(char, x, cy);
                }
            }
            
            // Glowing head
            this.ctx.fillStyle = '#bfffbf';
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = '#00ff46';
            const headChar = this.seededRandom(s + i) > 0.5 ? "1" : "0";
            this.ctx.fillText(headChar, x, y);
            this.ctx.shadowBlur = 0;
        }
    }

    renderNeon(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        const complexity = parseInt(this.complexitySlider.value);
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, w, h);
        const count = Math.floor(complexity / 4) + 5;
        for (let i = 0; i < count; i++) {
            const paletteColor = this.selectedPalette[Math.floor(this.seededRandom(s++) * this.selectedPalette.length)];
            const color = this.getAdjustedColor(paletteColor);
            this.ctx.strokeStyle = color;
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = color;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            const y = (this.seededRandom(s++) * h + this.time * 200) % h;
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(w, y);
            this.ctx.stroke();
        }
        this.ctx.shadowBlur = 0;
    }

    renderInk(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 5; i++) {
            const x = w * this.seededRandom(s++) + (this.mouse.x * 200);
            const y = h * this.seededRandom(s++) + (this.mouse.y * 200);
            const rad = this.seededRandom(s++) * w * 0.5 + 100;
            const paletteColor = this.selectedPalette[i % this.selectedPalette.length];
            const grad = this.ctx.createRadialGradient(x, y, 0, x, y, rad);
            grad.addColorStop(0, this.getAdjustedColor(paletteColor, 0.3));
            grad.addColorStop(1, 'transparent');
            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.ellipse(x, y, rad, rad * 0.6, this.time + s, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    renderGlass(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        const complexity = parseInt(this.complexitySlider.value);
        const bgGrad = this.ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w);
        bgGrad.addColorStop(0, this.getAdjustedColor(this.selectedPalette[0], 0.4));
        bgGrad.addColorStop(1, '#0f172a');
        this.ctx.fillStyle = bgGrad;
        this.ctx.fillRect(0, 0, w, h);
        const count = Math.floor(complexity / 15) + 3;
        for (let i = 0; i < count; i++) {
            const x = w * this.seededRandom(s++) + (Math.sin(this.time + s) * 50);
            const y = h * this.seededRandom(s++) + (Math.cos(this.time + s) * 50);
            const size = this.seededRandom(s++) * 300 + 100;
            this.ctx.save();
            this.ctx.translate(x, y);
            this.ctx.rotate(this.time * 0.1 + s);
            this.ctx.beginPath();
            this.ctx.roundRect(-size/2, -size/2, size, size, 20);
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            this.ctx.fill();
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
            this.ctx.restore();
        }
    }

    renderSilk2(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        const complexity = parseInt(this.complexitySlider.value);
        this.ctx.fillStyle = '#050505';
        this.ctx.fillRect(0, 0, w, h);
        const lines = complexity + 10;
        for (let i = 0; i < lines; i++) {
            const color = this.selectedPalette[i % this.selectedPalette.length];
            this.ctx.strokeStyle = this.getAdjustedColor(color, 0.3);
            this.ctx.lineWidth = 0.5;
            this.ctx.beginPath();
            let x = -50;
            let y = (h / lines) * i;
            this.ctx.moveTo(x, y);
            for (let j = 0; j < 20; j++) {
                const nx = x + (w / 18);
                const ny = y + Math.sin(this.time + (j * 0.5) + (i * 0.2)) * 100;
                this.ctx.lineTo(nx, ny);
                x = nx;
            }
            this.ctx.stroke();
        }
    }

    renderSpeed(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        const complexity = parseInt(this.complexitySlider.value);
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, w, h);
        const count = complexity * 3;
        const cx = w / 2;
        const cy = h / 2;
        for (let i = 0; i < count; i++) {
            const angle = this.seededRandom(s++) * Math.PI * 2;
            const dist = (this.seededRandom(s++) * w + this.time * 2000) % w;
            const x = cx + Math.cos(angle) * dist;
            const y = cy + Math.sin(angle) * dist;
            const length = (dist / w) * 100;
            const color = this.selectedPalette[Math.floor(this.seededRandom(s++) * this.selectedPalette.length)];
            this.ctx.strokeStyle = this.getAdjustedColor(color, dist / w);
            this.ctx.lineWidth = (dist / w) * 3;
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
            this.ctx.stroke();
        }
    }

    renderCircuit(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        this.ctx.fillStyle = '#0a0a0c';
        this.ctx.fillRect(0, 0, w, h);
        const gridSize = 40;
        const count = parseInt(this.complexitySlider.value) / 2 + 5;
        for (let i = 0; i < count; i++) {
            let x = Math.floor(this.seededRandom(s++) * (w / gridSize)) * gridSize;
            let y = Math.floor(this.seededRandom(s++) * (h / gridSize)) * gridSize;
            const color = this.selectedPalette[Math.floor(this.seededRandom(s++) * this.selectedPalette.length)];
            this.ctx.strokeStyle = this.getAdjustedColor(color, 0.6);
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            for (let j = 0; j < 5; j++) {
                const dir = Math.floor(this.seededRandom(s++) * 4);
                if (dir === 0) x += gridSize;
                else if (dir === 1) x -= gridSize;
                else if (dir === 2) y += gridSize;
                else y -= gridSize;
                this.ctx.lineTo(x, y);
            }
            this.ctx.stroke();
        }
    }

    renderVortex(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        const complexity = parseInt(this.complexitySlider.value);
        this.ctx.fillStyle = '#050508';
        this.ctx.fillRect(0, 0, w, h);
        const cx = w / 2 + (this.mouse.x * 100);
        const cy = h / 2 + (this.mouse.y * 100);
        const count = complexity * 5 + 50;
        for (let i = 0; i < count; i++) {
            const angle = (i * 0.1) + this.time + (this.seededRandom(s++) * Math.PI);
            const r = (i / count) * Math.max(w, h) * 0.8;
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;
            const color = this.selectedPalette[i % this.selectedPalette.length];
            this.ctx.fillStyle = this.getAdjustedColor(color, (1 - i / count) * 0.8);
            this.ctx.beginPath();
            this.ctx.arc(x, y, (1 - i / count) * 5 + 1, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    renderElectric(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        const complexity = parseInt(this.complexitySlider.value);
        this.ctx.fillStyle = '#00000a';
        this.ctx.fillRect(0, 0, w, h);
        const branches = Math.floor(complexity / 10) + 2;
        for (let b = 0; b < branches; b++) {
            let x = w / 2;
            let y = h / 2;
            const color = this.selectedPalette[b % this.selectedPalette.length];
            this.ctx.strokeStyle = this.getAdjustedColor(color, 0.8);
            this.ctx.lineWidth = 2;
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = color;
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            for (let i = 0; i < 20; i++) {
                x += (this.seededRandom(s++) - 0.5) * 200;
                y += (this.seededRandom(s++) - 0.5) * 200;
                this.ctx.lineTo(x, y);
            }
            this.ctx.stroke();
        }
        this.ctx.shadowBlur = 0;
    }

    renderPoly(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        const complexity = parseInt(this.complexitySlider.value);
        const baseColor = this.selectedPalette[0];
        this.ctx.fillStyle = this.getAdjustedColor(baseColor, 0.2);
        this.ctx.fillRect(0, 0, w, h);
        const gridSize = 100 - (complexity / 2);
        const cols = Math.ceil(w / gridSize) + 1;
        const rows = Math.ceil(h / gridSize) + 1;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const x1 = c * gridSize;
                const y1 = r * gridSize;
                const offset = (this.seededRandom(s++) - 0.5) * gridSize * 0.8;
                const paletteColor = this.selectedPalette[(c + r) % this.selectedPalette.length];
                this.ctx.fillStyle = this.getAdjustedColor(paletteColor, 0.4 + (this.seededRandom(s++) * 0.2));
                this.ctx.beginPath();
                this.ctx.moveTo(x1, y1);
                this.ctx.lineTo(x1 + gridSize, y1);
                this.ctx.lineTo(x1 + gridSize/2 + offset, y1 + gridSize/2);
                this.ctx.closePath();
                this.ctx.fill();
            }
        }
    }

    renderCrystal(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        const complexity = parseInt(this.complexitySlider.value);
        this.ctx.fillStyle = '#0a0a0c';
        this.ctx.fillRect(0, 0, w, h);
        const count = Math.floor(complexity / 5) + 5;
        for (let i = 0; i < count; i++) {
            const x = this.seededRandom(s++) * w;
            const y = this.seededRandom(s++) * h;
            const size = this.seededRandom(s++) * 200 + 100;
            const color = this.selectedPalette[i % this.selectedPalette.length];
            this.ctx.save();
            this.ctx.translate(x, y);
            this.ctx.rotate(this.time * 0.2 + s);
            this.ctx.beginPath();
            for (let j = 0; j < 6; j++) {
                const angle = (j / 6) * Math.PI * 2;
                const r = size * (0.8 + this.seededRandom(s++) * 0.4);
                if (j === 0) this.ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
                else this.ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
            }
            this.ctx.closePath();
            const grad = this.ctx.createLinearGradient(-size, -size, size, size);
            grad.addColorStop(0, this.getAdjustedColor(color, 0.4));
            grad.addColorStop(1, 'transparent');
            this.ctx.fillStyle = grad;
            this.ctx.fill();
            this.ctx.strokeStyle = this.getAdjustedColor(color, 0.6);
            this.ctx.stroke();
            this.ctx.restore();
        }
    }

    renderOcean(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        const complexity = parseInt(this.complexitySlider.value);
        this.ctx.fillStyle = '#0a192f';
        this.ctx.fillRect(0, 0, w, h);
        const layers = Math.floor(complexity / 10) + 3;
        for (let i = 0; i < layers; i++) {
            const color = this.selectedPalette[i % this.selectedPalette.length];
            this.ctx.fillStyle = this.getAdjustedColor(color, 0.4);
            this.ctx.beginPath();
            this.ctx.moveTo(0, h);
            const segmentCount = 20;
            const segmentWidth = w / segmentCount;
            for (let j = 0; j <= segmentCount; j++) {
                const x = j * segmentWidth;
                const waveHeight = (h / layers) * (layers - i);
                const y = waveHeight + Math.sin(this.time * 2 + (j * 0.5) + (i * 1.5)) * 30;
                this.ctx.lineTo(x, y);
            }
            this.ctx.lineTo(w, h);
            this.ctx.closePath();
            this.ctx.fill();
        }
    }

    renderFire(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        const complexity = parseInt(this.complexitySlider.value);
        this.ctx.fillStyle = '#050000';
        this.ctx.fillRect(0, 0, w, h);
        const count = complexity * 4 + 20;
        for (let i = 0; i < count; i++) {
            const x = this.seededRandom(s++) * w + (this.mouse.x * 50);
            const y = (this.seededRandom(s++) * h - (this.time * 500)) % h;
            const finalY = y < 0 ? y + h : y;
            const size = this.seededRandom(s++) * 5 + 1;
            const color = this.selectedPalette[i % this.selectedPalette.length];
            this.ctx.fillStyle = this.getAdjustedColor(color, (finalY / h));
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = color;
            this.ctx.beginPath();
            this.ctx.arc(x, finalY, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.shadowBlur = 0;
    }

    renderClouds(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        const complexity = parseInt(this.complexitySlider.value);
        const baseColor = this.selectedPalette[0];
        this.ctx.fillStyle = this.getAdjustedColor(baseColor, 0.1);
        this.ctx.fillRect(0, 0, w, h);
        const count = Math.floor(complexity / 5) + 5;
        for (let i = 0; i < count; i++) {
            const x = (this.seededRandom(s++) * w + this.time * 50) % w;
            const y = this.seededRandom(s++) * h;
            const size = this.seededRandom(s++) * 300 + 100;
            const color = this.selectedPalette[i % this.selectedPalette.length];
            const grad = this.ctx.createRadialGradient(x, y, 0, x, y, size);
            grad.addColorStop(0, this.getAdjustedColor(color, 0.2));
            grad.addColorStop(1, 'transparent');
            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.ellipse(x, y, size, size * 0.6, 0, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    renderSnow(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        const complexity = parseInt(this.complexitySlider.value);
        this.ctx.fillStyle = '#050510';
        this.ctx.fillRect(0, 0, w, h);
        const count = complexity * 5 + 50;
        for (let i = 0; i < count; i++) {
            const x = (this.seededRandom(s++) * w + this.mouse.x * 100) % w;
            const y = (this.seededRandom(s++) * h + (this.time * 200)) % h;
            const size = this.seededRandom(s++) * 3 + 1;
            this.ctx.fillStyle = 'white';
            this.ctx.globalAlpha = this.seededRandom(s++) * 0.8;
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1.0;
    }

    renderCRT(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        this.ctx.fillStyle = '#0a0a0c';
        this.ctx.fillRect(0, 0, w, h);
        this.ctx.fillStyle = this.getAdjustedColor(this.selectedPalette[0], 0.1);
        for(let y=0; y<h; y+=4) this.ctx.fillRect(0, y, w, 2);
        this.ctx.fillStyle = 'rgba(255,255,255,0.02)';
        for(let i=0; i<1000; i++) this.ctx.fillRect(this.seededRandom(s++)*w, this.seededRandom(s++)*h, 1, 1);
    }

    renderVHS(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        this.ctx.fillStyle = '#0a0a0c';
        this.ctx.fillRect(0, 0, w, h);
        for(let i=0; i<5; i++) {
            this.ctx.fillStyle = this.getAdjustedColor(this.selectedPalette[i%3], 0.1);
            const y = (this.seededRandom(s++)*h + this.time*200)%h;
            this.ctx.fillRect(0, y, w, 10);
        }
    }

    renderPixel(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        const size = 30;
        for(let x=0; x<w; x+=size) {
            for(let y=0; y<h; y+=size) {
                const color = this.selectedPalette[Math.floor(this.seededRandom(s++)*this.selectedPalette.length)];
                this.ctx.fillStyle = this.getAdjustedColor(color, 0.8);
                this.ctx.fillRect(x, y, size-2, size-2);
            }
        }
    }

    renderSunset(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        const complexity = parseInt(this.complexitySlider.value);
        
        const skyGrad = this.ctx.createLinearGradient(0, 0, 0, h);
        const topColor = this.selectedPalette[0];
        const bottomColor = this.selectedPalette[1] || '#a91079';
        
        skyGrad.addColorStop(0, this.getAdjustedColor(topColor));
        skyGrad.addColorStop(1, this.getAdjustedColor(bottomColor));
        this.ctx.fillStyle = skyGrad;
        this.ctx.fillRect(0, 0, w, h);
        
        // Sun
        const sunX = w * (0.3 + this.seededRandom(s++) * 0.4);
        const sunY = h * (0.4 + this.seededRandom(s++) * 0.2);
        const sunSize = 80 + this.seededRandom(s++) * 60;
        
        const sunGrad = this.ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunSize);
        sunGrad.addColorStop(0, '#f9ca24');
        sunGrad.addColorStop(1, 'rgba(249, 202, 36, 0)');
        
        this.ctx.fillStyle = sunGrad;
        this.ctx.beginPath();
        this.ctx.arc(sunX, sunY, sunSize, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Reflections/Clouds based on complexity
        if (complexity > 30) {
            for (let i = 0; i < complexity / 10; i++) {
                const cx = (this.seededRandom(s++) * w + this.time * 20) % w;
                const cy = sunY + (this.seededRandom(s++) - 0.5) * 200;
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                this.ctx.fillRect(cx, cy, 100, 2);
            }
        }
    }


    renderVoronoi(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        const complexity = parseInt(this.complexitySlider.value);
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, w, h);

        const points = [];
        const count = Math.floor(complexity / 10) + 10;
        for(let i=0; i<count; i++) {
            points.push({
                x: this.seededRandom(s++) * w,
                y: this.seededRandom(s++) * h,
                c: this.selectedPalette[i % this.selectedPalette.length]
            });
        }

        const step = 8;
        for(let x=0; x<w; x+=step) {
            for(let y=0; y<h; y+=step) {
                let minDist = Infinity;
                let closest = null;
                for(let p of points) {
                    const dist = (x-p.x)**2 + (y-p.y)**2;
                    if(dist < minDist) {
                        minDist = dist;
                        closest = p;
                    }
                }
                this.ctx.fillStyle = this.getAdjustedColor(closest.c, 0.8);
                this.ctx.fillRect(x, y, step, step);
            }
        }
    }

    renderDelaunay(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        const complexity = parseInt(this.complexitySlider.value);
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, w, h);

        const points = [];
        for(let i=0; i<30; i++) {
            points.push({x: this.seededRandom(s++)*w, y: this.seededRandom(s++)*h});
        }

        this.ctx.lineWidth = 1;
        for(let i=0; i<points.length; i++) {
            for(let j=i+1; j<points.length; j++) {
                const d = Math.sqrt((points[i].x-points[j].x)**2 + (points[i].y-points[j].y)**2);
                if(d < 300) {
                    this.ctx.strokeStyle = this.getAdjustedColor(this.selectedPalette[i%3], 1 - d/300);
                    this.ctx.beginPath();
                    this.ctx.moveTo(points[i].x, points[i].y);
                    this.ctx.lineTo(points[j].x, points[j].y);
                    this.ctx.stroke();
                }
            }
        }
    }

    renderCellular(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        const complexity = parseInt(this.complexitySlider.value);
        this.ctx.fillStyle = '#0a0a0c';
        this.ctx.fillRect(0, 0, w, h);

        const size = Math.max(4, 16 - Math.floor(complexity / 8)); // Complexity affects size
        const rows = Math.floor(h / size);
        const cols = Math.floor(w / size);
        
        // Seeded rule generation (0-255)
        const ruleNumber = Math.floor(this.seededRandom(s++) * 256);
        const rules = [];
        for (let i = 0; i < 8; i++) {
            rules.push((ruleNumber >> i) & 1);
        }

        // Seeded initial state
        let cells = new Array(cols).fill(0);
        for (let c = 0; c < cols; c++) {
            if (this.seededRandom(s++) > 0.9) cells[c] = 1;
        }
        cells[Math.floor(cols/2)] = 1;

        for(let r=0; r<rows; r++) {
            let nextCells = new Array(cols).fill(0);
            for(let c=0; c<cols; c++) {
                if(cells[c]) {
                    const paletteColor = this.selectedPalette[r % this.selectedPalette.length];
                    this.ctx.fillStyle = this.getAdjustedColor(paletteColor, 0.8);
                    this.ctx.fillRect(c * size, r * size, size - 1, size - 1);
                }
                const left = cells[(c - 1 + cols) % cols];
                const mid = cells[c];
                const right = cells[(c + 1) % cols];
                const type = (left << 2) | (mid << 1) | right;
                nextCells[c] = rules[type];
            }
            cells = nextCells;
        }
    }
    renderSlime(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        this.ctx.fillStyle = '#051005';
        this.ctx.fillRect(0, 0, w, h);
        for(let i=0; i<15; i++) {
            this.ctx.fillStyle = this.getAdjustedColor(this.selectedPalette[i%3], 0.1);
            this.ctx.beginPath();
            this.ctx.arc(this.seededRandom(s++)*w, this.seededRandom(s++)*h, 150, 0, Math.PI*2);
            this.ctx.fill();
        }
    }

    renderCoral(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        this.ctx.fillStyle = '#0a0505';
        this.ctx.fillRect(0, 0, w, h);

        const branches = [{x: w/2, y: h/2, a: 0, r: 20}];
        for(let i=0; i<200; i++) {
            const b = branches[Math.floor(this.seededRandom(s++) * branches.length)];
            const na = b.a + (this.seededRandom(s++) - 0.5) * 2;
            const nx = b.x + Math.cos(na) * 20;
            const ny = b.y + Math.sin(na) * 20;
            const nr = b.r * 0.98;
            
            if(nx > 0 && nx < w && ny > 0 && ny < h && nr > 1) {
                this.ctx.strokeStyle = this.getAdjustedColor(this.selectedPalette[i%3], 0.6);
                this.ctx.lineWidth = nr;
                this.ctx.beginPath();
                this.ctx.moveTo(b.x, b.y);
                this.ctx.lineTo(nx, ny);
                this.ctx.stroke();
                branches.push({x: nx, y: ny, a: na, r: nr});
            }
        }
    }

    renderPlasma(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        const complexity = parseInt(this.complexitySlider.value);
        
        // Multi-layered seeded gradient
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, w, h);
        
        const count = Math.floor(complexity / 20) + 2;
        for (let i = 0; i < count; i++) {
            const x = w * (0.2 + this.seededRandom(s++) * 0.6) + Math.sin(this.time + s) * 50;
            const y = h * (0.2 + this.seededRandom(s++) * 0.6) + Math.cos(this.time + s) * 50;
            const rad = this.seededRandom(s++) * w * 0.8 + 200;
            
            const color = this.selectedPalette[i % this.selectedPalette.length];
            const grad = this.ctx.createRadialGradient(x, y, 0, x, y, rad);
            grad.addColorStop(0, this.getAdjustedColor(color, 0.4 + (this.seededRandom(s++) * 0.2)));
            grad.addColorStop(1, 'transparent');
            
            this.ctx.fillStyle = grad;
            this.ctx.fillRect(0, 0, w, h);
        }
    }

    renderWormhole(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        const complexity = parseInt(this.complexitySlider.value);
        
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, w, h);
        
        const count = Math.floor(complexity / 5) + 5;
        const centerX = w / 2 + this.mouse.x * 100 + (this.seededRandom(s++) - 0.5) * 100;
        const centerY = h / 2 + this.mouse.y * 100 + (this.seededRandom(s++) - 0.5) * 100;
        
        for (let i = 0; i < count; i++) {
            const color = this.selectedPalette[i % this.selectedPalette.length];
            this.ctx.strokeStyle = this.getAdjustedColor(color, 0.3);
            this.ctx.lineWidth = 1 + (i / count) * 4;
            this.ctx.beginPath();
            
            const radius = (i * (600 / count) + this.time * 200 + this.seededRandom(s++) * 100) % 800;
            this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            this.ctx.stroke();
        }
    }

    renderData(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        this.ctx.fillStyle = '#050505';
        this.ctx.fillRect(0, 0, w, h);
        for(let i=0; i<40; i++) {
            this.ctx.fillStyle = this.getAdjustedColor(this.selectedPalette[i%3], 0.6);
            this.ctx.fillRect(this.seededRandom(s++)*w, (this.seededRandom(s++)*h + this.time*1000)%h, 2, 30);
        }
    }

    renderHologram(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        const complexity = parseInt(this.complexitySlider.value);
        
        const baseColor = this.selectedPalette[Math.floor(this.seededRandom(s++) * this.selectedPalette.length)];
        this.ctx.fillStyle = this.getAdjustedColor(baseColor, 0.05);
        this.ctx.fillRect(0, 0, w, h);
        
        const lineSpacing = 12 - (complexity / 10);
        for (let i = 0; i < h; i += lineSpacing) {
            const glitchOffset = this.seededRandom(s + Math.floor(i / 10)) > 0.95 ? (this.seededRandom(s++) - 0.5) * 20 : 0;
            this.ctx.fillStyle = this.getAdjustedColor(baseColor, 0.1 + Math.sin(this.time * 5 + i * 0.1) * 0.05);
            this.ctx.fillRect(0, i + Math.sin(this.time * 5) * 5 + glitchOffset, w, 1);
        }
    }

    renderDots(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(0, 0, w, h);
        for(let i=0; i<40; i++) {
            this.ctx.fillStyle = this.getAdjustedColor(this.selectedPalette[i%3], 0.4);
            this.ctx.beginPath();
            this.ctx.arc(this.seededRandom(s++)*w, this.seededRandom(s++)*h, 15, 0, Math.PI*2);
            this.ctx.fill();
        }
    }

    renderSpheres(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        for(let i=0; i<6; i++) {
            const x = this.seededRandom(s++)*w;
            const y = this.seededRandom(s++)*h;
            const grad = this.ctx.createRadialGradient(x-30, y-30, 0, x, y, 100);
            grad.addColorStop(0, '#fff');
            grad.addColorStop(1, this.getAdjustedColor(this.selectedPalette[i%3]));
            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 100, 0, Math.PI*2);
            this.ctx.fill();
        }
    }

    renderPaper(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        const complexity = parseInt(this.complexitySlider.value);
        
        this.ctx.fillStyle = '#f5f5f5';
        this.ctx.fillRect(0, 0, w, h);
        
        // Fold/Layer 1
        this.ctx.fillStyle = '#e8e8e8';
        this.ctx.beginPath();
        this.ctx.moveTo(0, h);
        const foldHeight = 200 + this.seededRandom(s++) * 200;
        this.ctx.lineTo(w, h - foldHeight);
        this.ctx.lineTo(w, h);
        this.ctx.fill();
        
        // Additional layers based on complexity
        const layers = Math.floor(complexity / 20);
        for (let i = 0; i < layers; i++) {
            this.ctx.fillStyle = `rgba(0, 0, 0, ${0.05 + this.seededRandom(s++) * 0.05})`;
            this.ctx.beginPath();
            const x1 = this.seededRandom(s++) * w;
            const y1 = this.seededRandom(s++) * h;
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x1 + this.seededRandom(s++) * 400, y1 + this.seededRandom(s++) * 400);
            this.ctx.lineTo(x1, y1 + this.seededRandom(s++) * 400);
            this.ctx.fill();
        }
    }

    renderSoft(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        const complexity = parseInt(this.complexitySlider.value);
        
        const c1 = this.selectedPalette[Math.floor(this.seededRandom(s++) * this.selectedPalette.length)];
        const c2 = this.selectedPalette[Math.floor(this.seededRandom(s++) * this.selectedPalette.length)];
        
        const cx = w * (0.3 + this.seededRandom(s++) * 0.4);
        const cy = h * (0.3 + this.seededRandom(s++) * 0.4);
        
        const grad = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, w * (0.5 + complexity / 100));
        grad.addColorStop(0, this.getAdjustedColor(c1, 0.4));
        grad.addColorStop(1, this.getAdjustedColor(c2, 0.1));
        
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, w, h);
    }

    renderSolid(seed) {
        let s = seed;
        const complexity = parseInt(this.complexitySlider.value);
        
        // Base Color
        const baseColor = this.selectedPalette[Math.floor(this.seededRandom(s++) * this.selectedPalette.length)];
        this.ctx.fillStyle = this.getAdjustedColor(baseColor);
        this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

        // Subtle Texture/Grain based on complexity
        if (complexity > 10) {
            this.ctx.globalAlpha = complexity / 500;
            for (let i = 0; i < complexity * 2; i++) {
                const x = this.seededRandom(s++) * window.innerWidth;
                const y = this.seededRandom(s++) * window.innerHeight;
                const size = this.seededRandom(s++) * 200 + 50;
                const grad = this.ctx.createRadialGradient(x, y, 0, x, y, size);
                grad.addColorStop(0, '#fff');
                grad.addColorStop(1, 'transparent');
                this.ctx.fillStyle = grad;
                this.ctx.beginPath();
                this.ctx.arc(x, y, size, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        this.ctx.globalAlpha = 1.0;
    }

    renderLinear(seed) {
        let s = seed;
        const complexity = parseInt(this.complexitySlider.value);
        const angle = (this.seededRandom(s++) * 360) + (this.time * 5); // Seeded + Animated
        
        const x1 = window.innerWidth / 2 + Math.cos(angle * Math.PI / 180) * window.innerWidth;
        const y1 = window.innerHeight / 2 + Math.sin(angle * Math.PI / 180) * window.innerHeight;
        const x2 = window.innerWidth / 2 - Math.cos(angle * Math.PI / 180) * window.innerWidth;
        const y2 = window.innerHeight / 2 - Math.sin(angle * Math.PI / 180) * window.innerHeight;

        const grad = this.ctx.createLinearGradient(x1, y1, x2, y2);
        
        // Use complexity to add more color stops
        const stops = Math.max(2, Math.floor(complexity / 20) + 2);
        for (let i = 0; i < stops; i++) {
            const color = this.selectedPalette[Math.floor(this.seededRandom(s++) * this.selectedPalette.length)];
            grad.addColorStop(i / (stops - 1), this.getAdjustedColor(color));
        }
        
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    }

    renderRadial(seed) {
        let s = seed;
        const complexity = parseInt(this.complexitySlider.value);
        
        // Seeded center variation
        const cx = window.innerWidth * (0.3 + this.seededRandom(s++) * 0.4) + (this.mouse.x * 200);
        const cy = window.innerHeight * (0.3 + this.seededRandom(s++) * 0.4) + (this.mouse.y * 200);
        const r = Math.max(window.innerWidth, window.innerHeight) * (0.5 + this.seededRandom(s++) * 0.5);

        const grad = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        
        const stops = Math.max(2, Math.floor(complexity / 15) + 2);
        for (let i = 0; i < stops; i++) {
            const color = this.selectedPalette[Math.floor(this.seededRandom(s++) * this.selectedPalette.length)];
            grad.addColorStop(i / (stops - 1), this.getAdjustedColor(color));
        }

        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    }

    renderMesh(seed, w = window.innerWidth, h = window.innerHeight) {
        let s = seed;
        const complexity = parseInt(this.complexitySlider.value);
        
        const baseColor = this.selectedPalette[Math.floor(this.seededRandom(s++) * this.selectedPalette.length)];
        this.ctx.fillStyle = this.getAdjustedColor(baseColor);
        this.ctx.fillRect(0, 0, w, h);

        const count = Math.floor(complexity / 10) + 4;
        for (let i = 0; i < count; i++) {
            const x = this.seededRandom(s++) * w + (this.mouse.x * 100);
            const y = this.seededRandom(s++) * h + (this.mouse.y * 100);
            const rad = this.seededRandom(s++) * w * 1.2 + 200;
            
            const grad = this.ctx.createRadialGradient(x, y, 0, x, y, rad);
            const color = this.selectedPalette[Math.floor(this.seededRandom(s++) * this.selectedPalette.length)];
            
            // Pulse opacity based on complexity and time
            const opacity = 0.2 + (complexity / 200) + (Math.sin(this.time + s) * 0.1);
            grad.addColorStop(0, this.getAdjustedColor(color, opacity));
            grad.addColorStop(1, 'transparent');
            
            this.ctx.fillStyle = grad;
            this.ctx.fillRect(0, 0, w, h);
        }
    }

    getAdjustedColor(hex, alpha = 1) {
        const shift = parseInt(this.hueSlider.value);
        
        // Convert hex to RGB
        let r = parseInt(hex.slice(1, 3), 16) / 255;
        let g = parseInt(hex.slice(3, 5), 16) / 255;
        let b = parseInt(hex.slice(5, 7), 16) / 255;
        
        // RGB to HSL
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }

        h = (h * 360 + shift) % 360;
        return `hsla(${h}, ${s * 100}%, ${l * 100}%, ${alpha})`;
    }

    renderGrain() {
        this.ctx.globalAlpha = 0.05;
        for (let i = 0; i < 10000; i++) {
            const x = Math.random() * window.innerWidth;
            const y = Math.random() * window.innerHeight;
            this.ctx.fillStyle = '#fff';
            this.ctx.fillRect(x, y, 1, 1);
        }
        this.ctx.globalAlpha = 1.0;
    }

    renderAurora(seed, w = window.innerWidth, h = window.innerHeight) {
        const complexity = parseInt(this.complexitySlider.value) / 10;
        const hueBase = parseInt(this.hueSlider.value);
        
        const bgGrad = this.ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, '#0a0a14');
        bgGrad.addColorStop(1, '#1a1a2e');
        this.ctx.fillStyle = bgGrad;
        this.ctx.fillRect(0, 0, w, h);

        let s = seed;
        for (let i = 0; i < complexity; i++) {
            this.ctx.beginPath();
            const paletteColor = this.selectedPalette[Math.floor(this.seededRandom(s++) * this.selectedPalette.length)];
            const color = this.getAdjustedColor(paletteColor, 0.15);
            
            this.ctx.shadowBlur = 80;
            this.ctx.shadowColor = this.getAdjustedColor(paletteColor, 0.5);
            
            this.ctx.moveTo(0, h * this.seededRandom(s++));
            
            for (let x = 0; x <= w; x += 30) {
                const wave1 = Math.sin(x * 0.002 + this.time + s) * 150;
                const wave2 = Math.cos(x * 0.001 - this.time * 0.5) * 50;
                const parallax = this.mouse.x * x * 0.1;
                const y = h * 0.5 + wave1 + wave2 + parallax;
                this.ctx.lineTo(x, y);
            }
            
            this.ctx.lineTo(w, h);
            this.ctx.lineTo(0, h);
            this.ctx.fillStyle = color;
            this.ctx.fill();
        }
        this.ctx.shadowBlur = 0;
    }

    renderGeometric(seed) {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const complexity = parseInt(this.complexitySlider.value);
        let s = seed;

        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, w, h);

        const gridSize = 150 - (complexity);
        for (let x = -gridSize; x < w + gridSize; x += gridSize) {
            for (let y = -gridSize; y < h + gridSize; y += gridSize) {
                const r = this.seededRandom(s++);
                if (r > 0.4) {
                    const parallaxX = this.mouse.x * 50;
                    const parallaxY = this.mouse.y * 50;
                    
                    const paletteColor = this.selectedPalette[Math.floor(this.seededRandom(s++) * this.selectedPalette.length)];
                    this.ctx.strokeStyle = this.getAdjustedColor(paletteColor);
                    this.ctx.globalAlpha = r * 0.3;
                    this.ctx.lineWidth = 1;
                    this.ctx.beginPath();
                    
                    const angle = this.time + r * Math.PI * 2;
                    const offsetX = Math.cos(angle) * 10;
                    const offsetY = Math.sin(angle) * 10;

                    this.ctx.moveTo(x + parallaxX + offsetX, y + parallaxY + offsetY);
                    this.ctx.lineTo(x + gridSize + parallaxX, y + gridSize + parallaxY);
                    this.ctx.stroke();
                }
            }
        }
        this.ctx.globalAlpha = 1.0;
    }

    renderNebula(seed, w = window.innerWidth, h = window.innerHeight) {
        const complexity = parseInt(this.complexitySlider.value) / 5;
        let s = seed;

        this.ctx.fillStyle = '#020617';
        this.ctx.fillRect(0, 0, w, h);

        for (let i = 0; i < complexity; i++) {
            const x = this.seededRandom(s++) * w + (this.mouse.x * 100);
            const y = this.seededRandom(s++) * h + (this.mouse.y * 100);
            const rad = this.seededRandom(s++) * 500 + 200;
            
            const grad = this.ctx.createRadialGradient(x, y, 0, x, y, rad);
            const paletteColor = this.selectedPalette[Math.floor(this.seededRandom(s++) * this.selectedPalette.length)];
            const drift = Math.sin(this.time + s) * 0.05;
            
            grad.addColorStop(0, this.getAdjustedColor(paletteColor, 0.2 + drift));
            grad.addColorStop(1, 'transparent');
            
            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.arc(x, y, rad, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.fillStyle = '#fff';
        for (let i = 0; i < 150; i++) {
            const x = (this.seededRandom(s++) * w + (this.mouse.x * 20)) % w;
            const y = (this.seededRandom(s++) * h + (this.mouse.y * 20)) % h;
            this.ctx.globalAlpha = Math.abs(Math.sin(this.time * 2 + s));
            this.ctx.fillRect(x, y, 1, 1);
        }
        this.ctx.globalAlpha = 1.0;
    }

    renderMinimal(seed, w = window.innerWidth, h = window.innerHeight) {
        const complexity = parseInt(this.complexitySlider.value);
        let s = seed;

        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, w, h);

        this.ctx.lineWidth = 0.5;
        for (let i = 0; i < complexity / 2; i++) {
            const paletteColor = this.selectedPalette[i % this.selectedPalette.length];
            this.ctx.strokeStyle = this.getAdjustedColor(paletteColor);
            this.ctx.globalAlpha = 0.15;
            
            this.ctx.beginPath();
            const startX = this.seededRandom(s++) * w;
            const startY = this.seededRandom(s++) * h;
            this.ctx.moveTo(startX, startY);
            
            const cp1x = w/2 + Math.sin(this.time + i) * w/4 + (this.mouse.x * w/2);
            const cp1y = h/2 + Math.cos(this.time) * h/4;
            
            this.ctx.bezierCurveTo(cp1x, cp1y, w - cp1x, h - cp1y, w - startX, h - startY);
            this.ctx.stroke();
        }
        this.ctx.globalAlpha = 1.0;
    }

    download() {
        const link = document.createElement('a');
        const timestamp = Date.now();
        link.download = `AuraWall-Pro-${this.selectedPattern}-${timestamp}.png`;
        link.href = this.canvas.toDataURL('image/png', 1.0);
        link.click();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new AuraWall();
});
