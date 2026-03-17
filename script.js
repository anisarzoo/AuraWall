class AuraWall {
    constructor() {
        this.canvas = document.getElementById('wallpaper-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resolutionInfo = document.getElementById('resolution-info');
        this.dateDisplay = document.getElementById('current-date');
        this.generateBtn = document.getElementById('generate-btn');
        this.downloadBtn = document.getElementById('download-btn');
        
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

        this.selectedPattern = 'aurora';
        this.currentSeed = Math.random() * 1000000;
        this.time = 0;
        this.mouse = { x: 0, y: 0 };
        this.targetMouse = { x: 0, y: 0 };
        
        this.init();
        this.attachEventListeners();
        this.animate();
    }

    init() {
        this.resize();
        this.updateDate();
        this.generate();
    }

    animate() {
        if (this.animateToggle.checked) {
            this.time += 0.005;
        }

        // Smooth mouse follow
        this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.05;
        this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.05;

        this.generate();
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
        window.addEventListener('resize', () => {
            this.resize();
        });

        window.addEventListener('mousemove', (e) => {
            this.targetMouse.x = (e.clientX / window.innerWidth) - 0.5;
            this.targetMouse.y = (e.clientY / window.innerHeight) - 0.5;
        });

        this.generateBtn.addEventListener('click', () => {
            this.currentSeed = Math.random() * 1000000;
        });

        this.downloadBtn.addEventListener('click', () => this.download());

        this.settingsToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.settingsPanel.classList.toggle('open');
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
            });
        });

        document.addEventListener('click', () => {
            this.dropdown.classList.remove('open');
        });
    }

    seededRandom(seed) {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    }

    generate() {
        const pattern = this.selectedPattern;
        let seed = this.currentSeed;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        switch(pattern) {
            case 'aurora': this.renderAurora(seed); break;
            case 'geometric': this.renderGeometric(seed); break;
            case 'nebula': this.renderNebula(seed); break;
            case 'minimal': this.renderMinimal(seed); break;
        }
    }

    renderAurora(seed) {
        const w = window.innerWidth;
        const h = window.innerHeight;
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
            const hue = (hueBase + this.seededRandom(s++) * 60) % 360;
            const color = `hsla(${hue}, 70%, 60%, 0.15)`;
            this.ctx.shadowBlur = 80;
            this.ctx.shadowColor = `hsla(${hue}, 70%, 60%, 0.5)`;
            
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
                    
                    this.ctx.strokeStyle = `rgba(99, 102, 241, ${r * 0.2})`;
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
    }

    renderNebula(seed) {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const complexity = parseInt(this.complexitySlider.value) / 5;
        const hueBase = parseInt(this.hueSlider.value);
        let s = seed;

        this.ctx.fillStyle = '#020617';
        this.ctx.fillRect(0, 0, w, h);

        for (let i = 0; i < complexity; i++) {
            const x = this.seededRandom(s++) * w + (this.mouse.x * 100);
            const y = this.seededRandom(s++) * h + (this.mouse.y * 100);
            const rad = this.seededRandom(s++) * 500 + 200;
            
            const grad = this.ctx.createRadialGradient(x, y, 0, x, y, rad);
            const hue = (hueBase + this.seededRandom(s++) * 100) % 360;
            const drift = Math.sin(this.time + s) * 0.05;
            grad.addColorStop(0, `hsla(${hue}, 80%, 50%, ${0.1 + drift})`);
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
            const size = this.seededRandom(s++) * 2;
            this.ctx.globalAlpha = Math.abs(Math.sin(this.time * 2 + s));
            this.ctx.fillRect(x, y, size, size);
        }
        this.ctx.globalAlpha = 1.0;
    }

    renderMinimal(seed) {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const complexity = parseInt(this.complexitySlider.value);
        let s = seed;

        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, w, h);

        this.ctx.lineWidth = 0.5;
        for (let i = 0; i < complexity / 2; i++) {
            const hue = (parseInt(this.hueSlider.value) + i * 2) % 360;
            this.ctx.strokeStyle = `hsla(${hue}, 50%, 70%, 0.1)`;
            
            this.ctx.beginPath();
            const startX = this.seededRandom(s++) * w;
            const startY = this.seededRandom(s++) * h;
            this.ctx.moveTo(startX, startY);
            
            const cp1x = w/2 + Math.sin(this.time + i) * w/4 + (this.mouse.x * w/2);
            const cp1y = h/2 + Math.cos(this.time) * h/4;
            
            this.ctx.bezierCurveTo(cp1x, cp1y, w - cp1x, h - cp1y, w - startX, h - startY);
            this.ctx.stroke();
        }
    }

    download() {
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        link.download = `AuraWall-Power-${this.selectedPattern}-${timestamp}.png`;
        link.href = this.canvas.toDataURL('image/png', 1.0);
        link.click();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new AuraWall();
});
