class ColorPicker {
    constructor() {
        this.initElements();
        this.initEventListeners();
        this.historyColors = [];
        this.historyImages = [];
        this.loadHistory();
        this.addTooltipStyles();
        this.scale = 1;
        this.panningEnabled = false;
        this.lastX = 0;
        this.lastY = 0;
    }

    initElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.canvas = document.getElementById('imageCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.colorPreview = document.getElementById('colorPreview');
        this.hexValue = document.getElementById('hexValue');
        this.rgbValue = document.getElementById('rgbValue');
        this.hslValue = document.getElementById('hslValue');
        this.historyColorsList = document.getElementById('historyColorsList');
        this.historyImagesList = document.getElementById('historyImagesList');
        this.mainContent = document.querySelector('.main-content');
        this.imageToolbar = document.getElementById('imageToolbar');
        this.newImageBtn = document.getElementById('newImageBtn');

        // 添加提示元素
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'tooltip';
        document.body.appendChild(this.tooltip);

        // 添加十字准线元素
        this.crosshair = document.createElement('div');
        this.crosshair.className = 'crosshair';
        this.mainContent.appendChild(this.crosshair);
        
        // 添加实时颜色预览
        this.livePreview = document.createElement('div');
        this.livePreview.className = 'live-preview';
        document.body.appendChild(this.livePreview);
    }

    initEventListeners() {
        // 文件上传相关事件
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadArea.style.borderColor = 'var(--accent-color)';
        });
        this.uploadArea.addEventListener('dragleave', () => {
            this.uploadArea.style.borderColor = '';
        });
        this.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                this.loadImage(file);
            }
        });

        // 颜色选择事件
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));

        // 复制按钮事件
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', () => this.copyColorValue(btn.dataset.value));
        });

        // 重置图片事件
        this.newImageBtn.addEventListener('click', () => this.resetImage());

        // 添加鼠标移动事件
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseenter', () => this.crosshair.style.display = 'block');
        this.canvas.addEventListener('mouseleave', () => {
            this.crosshair.style.display = 'none';
            this.livePreview.style.display = 'none';
        });

        // 添加缩放事件
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));

        // 添加平移事件
        this.canvas.addEventListener('mousedown', (e) => this.startPanning(e));
        document.addEventListener('mousemove', (e) => this.pan(e));
        document.addEventListener('mouseup', () => this.stopPanning());
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                alert('请上传图片文件');
                return;
            }
            this.loadImage(file);
        }
    }

    loadImage(file) {
        if (!file.type.startsWith('image/')) {
            alert('请上传图片文件');
            return;
        }

        // 立即隐藏上传区域
        this.uploadArea.style.display = 'none';

        // 完全清除旧图片
        this.canvas.style.display = 'none';
        this.canvas.hidden = true;
        this.canvas.width = 0;
        this.canvas.height = 0;
        this.canvas.style.transform = 'none';
        this.scale = 1;

        // 创建并显示加载动画
        const loading = this.showLoading();

        // 清除文件输入，防止重复上传同一文件
        this.fileInput.value = '';

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // 计算适合画布的尺寸
                const maxWidth = this.mainContent.clientWidth - 40;
                const maxHeight = this.mainContent.clientHeight - 40;
                let width = img.width;
                let height = img.height;

                // 等比例缩放
                if (width > maxWidth) {
                    height = (maxWidth * height) / width;
                    width = maxWidth;
                }
                if (height > maxHeight) {
                    width = (maxHeight * width) / height;
                    height = maxHeight;
                }

                // 确保在设置新尺寸前清除画布
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                
                // 设置新的画布尺寸
                this.canvas.width = width;
                this.canvas.height = height;

                // 使用 requestAnimationFrame 确保在下一帧绘制
                requestAnimationFrame(() => {
                    // 清除并绘制新图片
                    this.ctx.clearRect(0, 0, width, height);
                    this.ctx.drawImage(img, 0, 0, width, height);

                    // 显示画布和工具栏
                    this.canvas.style.display = 'block';
                    this.canvas.hidden = false;
                    this.imageToolbar.hidden = false;

                    // 移除加载动画
                    loading.remove();
                });

                // 添加到历史记录
                this.addImageToHistory(file);
            };

            img.onerror = () => {
                alert('图片加载失败');
                loading.remove();
                this.resetImage();
            };

            img.src = e.target.result;
        };

        reader.onerror = () => {
            alert('文件读取失败');
            loading.remove();
            this.resetImage();
        };

        reader.readAsDataURL(file);
    }

    handleCanvasClick(event) {
        const color = this.getColorAtPosition(event);
        if (color) {
            this.updateColorInfo(color);
            this.addColorToHistory(color);
        }
    }

    updateColorInfo(color) {
        this.colorPreview.style.backgroundColor = color.hex;
        this.hexValue.value = color.hex;
        this.rgbValue.value = color.rgb;
        this.hslValue.value = color.hsl;
    }

    // 颜色转换工具方法
    rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }

    rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
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

        return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
    }

    // 历史记录相关方法
    addColorToHistory(color) {
        // 检查是否已存在相同颜色
        const exists = this.historyColors.some(c => c.hex === color.hex);
        if (!exists) {
            this.historyColors = [color, ...this.historyColors.slice(0, 14)];
            this.saveHistory();
            this.updateHistoryColorsUI();
        }
    }

    addImageToHistory(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            // 创建缩略图
            const img = new Image();
            img.onload = () => {
                // 创建缩略图画布
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const maxSize = 150; // 缩略图最大尺寸
                let width = img.width;
                let height = img.height;

                // 计算缩略图尺寸
                if (width > height) {
                    if (width > maxSize) {
                        height = (maxSize * height) / width;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width = (maxSize * width) / height;
                        height = maxSize;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                // 存储缩略图
                const thumbnail = {
                    name: file.name,
                    data: canvas.toDataURL('image/jpeg', 0.7), // 使用 JPEG 格式和较低质量以减小大小
                    timestamp: Date.now()
                };

                // 更新历史记录
                this.historyImages = [thumbnail, ...this.historyImages.slice(0, 7)];
                this.saveHistory();
                this.updateHistoryImagesUI();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    saveHistory() {
        try {
            localStorage.setItem('colorHistory', JSON.stringify(this.historyColors));
            localStorage.setItem('imageHistory', JSON.stringify(this.historyImages));
        } catch (e) {
            console.error('Error saving history:', e);
            // 如果存储失败，尝试清理一些旧数据
            this.historyImages = this.historyImages.slice(0, 5);
            this.historyColors = this.historyColors.slice(0, 10);
            localStorage.clear();
            this.saveHistory();
        }
    }

    loadHistory() {
        try {
            const colorHistory = localStorage.getItem('colorHistory');
            const imageHistory = localStorage.getItem('imageHistory');
            
            this.historyColors = colorHistory ? JSON.parse(colorHistory) : [];
            this.historyImages = imageHistory ? JSON.parse(imageHistory) : [];
            
            // 立即更新 UI
            requestAnimationFrame(() => {
                this.updateHistoryColorsUI();
                this.updateHistoryImagesUI();
            });
        } catch (e) {
            console.error('Error loading history:', e);
            this.historyColors = [];
            this.historyImages = [];
            localStorage.clear();
        }
    }

    updateHistoryColorsUI() {
        if (!this.historyColorsList) return;
        
        this.historyColorsList.innerHTML = this.historyColors
            .map(color => `
                <div class="history-color-item" 
                     style="background-color: ${color.hex}"
                     title="${color.hex}"
                     data-color='${JSON.stringify(color)}'
                     onclick="colorPicker.selectHistoryColor(this)">
                    <button class="delete-btn" onclick="event.stopPropagation(); colorPicker.deleteHistoryColor('${color.hex}')">×</button>
                </div>
            `).join('');
    }

    updateHistoryImagesUI() {
        if (!this.historyImagesList) return;
        
        this.historyImagesList.innerHTML = this.historyImages
            .map(img => `
                <div class="history-image-item">
                    <img src="${img.data}" alt="${img.name}" title="${img.name}"
                         onclick="colorPicker.loadHistoryImage('${img.timestamp}')">
                    <button class="delete-btn" onclick="colorPicker.deleteHistoryImage(${img.timestamp})">×</button>
                </div>
            `).join('');
    }

    copyColorValue(type) {
        const value = document.getElementById(`${type}Value`).value;
        navigator.clipboard.writeText(value).then(() => {
            const btn = document.querySelector(`[data-value="${type}"]`);
            const rect = btn.getBoundingClientRect();
            this.showTooltip('已复制！', rect.left, rect.bottom + 5);
        });
    }

    // 添加提示框样式
    addTooltipStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .tooltip {
                position: fixed;
                background: var(--accent-color);
                color: white;
                padding: 8px 12px;
                border-radius: 4px;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.3s ease;
                z-index: 1000;
            }
            .tooltip.show {
                opacity: 1;
            }
            .loading {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 100;
            }
            .loading::after {
                content: '';
                width: 30px;
                height: 30px;
                border: 3px solid var(--accent-color);
                border-top-color: transparent;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    showTooltip(text, x, y) {
        this.tooltip.textContent = text;
        this.tooltip.style.left = `${x}px`;
        this.tooltip.style.top = `${y}px`;
        this.tooltip.classList.add('show');
        setTimeout(() => this.tooltip.classList.remove('show'), 2000);
    }

    showLoading() {
        const loading = document.createElement('div');
        loading.className = 'loading';
        this.mainContent.appendChild(loading);
        return loading;
    }

    selectHistoryColor(element) {
        const color = JSON.parse(element.dataset.color);
        this.updateColorInfo(color);
    }

    deleteHistoryColor(hex) {
        this.historyColors = this.historyColors.filter(color => color.hex !== hex);
        this.saveHistory();
        this.updateHistoryColorsUI();
    }

    deleteHistoryImage(timestamp) {
        this.historyImages = this.historyImages.filter(img => img.timestamp !== timestamp);
        this.saveHistory();
        this.updateHistoryImagesUI();
    }

    loadHistoryImage(timestamp) {
        const img = this.historyImages.find(img => img.timestamp === parseInt(timestamp));
        if (img) {
            const image = new Image();
            image.onload = () => {
                // 计算适合画布的尺寸
                const maxWidth = this.mainContent.clientWidth - 40;
                const maxHeight = this.mainContent.clientHeight - 40;
                let width = image.width;
                let height = image.height;

                // 等比例缩放
                if (width > maxWidth) {
                    height = (maxWidth * height) / width;
                    width = maxWidth;
                }
                if (height > maxHeight) {
                    width = (maxHeight * width) / height;
                    height = maxHeight;
                }

                // 设置画布尺寸
                this.canvas.width = width;
                this.canvas.height = height;
                
                // 清除画布
                this.ctx.clearRect(0, 0, width, height);
                
                // 绘制图
                this.ctx.drawImage(image, 0, 0, width, height);
                
                // 显示画布和工具栏，隐藏上传区域
                this.canvas.style.display = 'block';
                this.canvas.hidden = false;
                this.imageToolbar.hidden = false;
                this.uploadArea.style.display = 'none';
            };
            image.src = img.data;
        }
    }

    // 添加重置图片的方法
    resetImage() {
        // 完全清除画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.canvas.width = 0;
        this.canvas.height = 0;
        this.canvas.style.transform = 'none';
        this.canvas.style.display = 'none';
        this.canvas.hidden = true;
        
        // 隐藏工具栏
        this.imageToolbar.hidden = true;
        
        // 显示上传区域
        this.uploadArea.style.display = 'flex';
        
        // 清除文件输入
        this.fileInput.value = '';
        
        // 重置缩放
        this.scale = 1;
    }

    handleMouseMove(event) {
        if (this.canvas.hidden) return;

        // 更新十字准线位置
        this.crosshair.style.left = `${event.clientX}px`;
        this.crosshair.style.top = `${event.clientY}px`;

        // 获取颜色并更新实时预览
        const color = this.getColorAtPosition(event);
        if (color) {
            this.livePreview.style.display = 'block';
            this.livePreview.style.backgroundColor = color.hex;
            this.livePreview.style.left = `${event.clientX + 20}px`;
            this.livePreview.style.top = `${event.clientY + 20}px`;
            this.livePreview.setAttribute('data-color', color.hex);
        }
    }

    handleWheel(event) {
        event.preventDefault();
        const delta = event.deltaY > 0 ? 0.9 : 1.1;
        this.scale *= delta;
        this.scale = Math.min(Math.max(0.1, this.scale), 5); // 限制缩放范围

        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.scale(delta, delta);
        this.ctx.translate(-x, -y);
        this.ctx.restore();
    }

    startPanning(event) {
        if (event.button === 1) { // 中键
            event.preventDefault();
            this.panningEnabled = true;
            this.lastX = event.clientX;
            this.lastY = event.clientY;
            this.canvas.style.cursor = 'grabbing';
        }
    }

    pan(event) {
        if (!this.panningEnabled) return;

        const deltaX = event.clientX - this.lastX;
        const deltaY = event.clientY - this.lastY;

        this.lastX = event.clientX;
        this.lastY = event.clientY;

        const rect = this.canvas.getBoundingClientRect();
        this.canvas.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    }

    stopPanning() {
        this.panningEnabled = false;
        this.canvas.style.cursor = 'crosshair';
    }

    // 添加新方法：获取精确的颜色值
    getColorAtPosition(event) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        const x = Math.round((event.clientX - rect.left) * scaleX);
        const y = Math.round((event.clientY - rect.top) * scaleY);
        
        // 检查坐标是否在画���范围内
        if (x >= 0 && x < this.canvas.width && y >= 0 && y < this.canvas.height) {
            const pixel = this.ctx.getImageData(x, y, 1, 1).data;
            return {
                hex: this.rgbToHex(pixel[0], pixel[1], pixel[2]),
                rgb: `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`,
                hsl: this.rgbToHsl(pixel[0], pixel[1], pixel[2])
            };
        }
        return null;
    }
}

// 初始化应用
let colorPicker;
document.addEventListener('DOMContentLoaded', () => {
    colorPicker = new ColorPicker();
}); 