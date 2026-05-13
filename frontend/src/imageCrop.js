export class ImageCropModal {
  constructor() {
    this.modal = null;
    this.canvas = null;
    this.ctx = null;
    this.image = null;
    this.scale = 1;
    this.minScale = 1;
    this.x = 0;
    this.y = 0;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.init();
  }

  init() {
    this.modal = document.createElement('div');
    this.modal.className = 'fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm hidden opacity-0 transition-opacity';
    this.modal.innerHTML = `
      <div class="bg-surface-container-high rounded-xl p-6 w-full max-w-md shadow-2xl border border-outline-variant/30 transform scale-95 transition-transform" id="crop-modal-content">
        <h3 class="text-headline-md text-on-surface mb-4">Crop Image</h3>
        <div class="relative w-full aspect-square bg-surface-container-lowest rounded-lg overflow-hidden mb-4 cursor-move" id="crop-container">
          <canvas id="crop-canvas" class="absolute inset-0 w-full h-full"></canvas>
          <div class="absolute inset-0 pointer-events-none border-4 border-primary rounded-full shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] m-4"></div>
        </div>
        <div class="mb-6">
          <label class="text-label-caps text-on-surface-variant mb-2 block">Zoom</label>
          <input type="range" id="crop-zoom" min="1" max="3" step="0.01" value="1" class="w-full accent-primary">
        </div>
        <div class="flex justify-end gap-3">
          <button id="crop-cancel" class="px-4 py-2 rounded-lg text-on-surface-variant hover:bg-surface-variant/50 transition-colors font-label-caps">Cancel</button>
          <button id="crop-save" class="px-4 py-2 rounded-lg bg-primary text-on-primary hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20 font-label-caps">Save Image</button>
        </div>
      </div>
    `;
    document.body.appendChild(this.modal);

    this.canvas = this.modal.querySelector('#crop-canvas');
    this.ctx = this.canvas.getContext('2d');
    
    // Event listeners
    this.modal.querySelector('#crop-cancel').addEventListener('click', () => this.close());
    this.modal.querySelector('#crop-zoom').addEventListener('input', (e) => {
      this.scale = parseFloat(e.target.value);
      this.clampAndDraw();
    });

    const container = this.modal.querySelector('#crop-container');
    
    const startDrag = (e) => {
      this.isDragging = true;
      this.dragStartX = (e.touches ? e.touches[0].clientX : e.clientX) - this.x;
      this.dragStartY = (e.touches ? e.touches[0].clientY : e.clientY) - this.y;
    };

    const drag = (e) => {
      if (!this.isDragging) return;
      e.preventDefault();
      this.x = (e.touches ? e.touches[0].clientX : e.clientX) - this.dragStartX;
      this.y = (e.touches ? e.touches[0].clientY : e.clientY) - this.dragStartY;
      this.clampAndDraw();
    };

    const endDrag = () => {
      this.isDragging = false;
    };

    container.addEventListener('mousedown', startDrag);
    container.addEventListener('mousemove', drag);
    window.addEventListener('mouseup', endDrag);

    container.addEventListener('touchstart', startDrag, { passive: false });
    container.addEventListener('touchmove', drag, { passive: false });
    window.addEventListener('touchend', endDrag);
  }

  open(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          this.image = img;
          this.setupCanvas();
          
          this.modal.classList.remove('hidden');
          // Trigger reflow
          void this.modal.offsetWidth;
          this.modal.classList.remove('opacity-0');
          this.modal.querySelector('#crop-modal-content').classList.remove('scale-95');

          this.modal.querySelector('#crop-save').onclick = () => {
            resolve(this.getCroppedBlob());
            this.close();
          };
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  close() {
    this.modal.classList.add('opacity-0');
    this.modal.querySelector('#crop-modal-content').classList.add('scale-95');
    setTimeout(() => {
      this.modal.classList.add('hidden');
      this.image = null;
    }, 200);
  }

  setupCanvas() {
    const container = this.modal.querySelector('#crop-container');
    const size = container.clientWidth;
    this.canvas.width = size;
    this.canvas.height = size;

    const scaleX = size / this.image.width;
    const scaleY = size / this.image.height;
    this.minScale = Math.max(scaleX, scaleY);
    
    const zoomInput = this.modal.querySelector('#crop-zoom');
    zoomInput.min = this.minScale;
    zoomInput.max = this.minScale * 3;
    zoomInput.value = this.minScale;
    
    this.scale = this.minScale;
    
    // Center initially
    this.x = (size - this.image.width * this.scale) / 2;
    this.y = (size - this.image.height * this.scale) / 2;

    this.clampAndDraw();
  }

  clampAndDraw() {
    if (!this.image) return;

    const size = this.canvas.width;
    const scaledW = this.image.width * this.scale;
    const scaledH = this.image.height * this.scale;

    // Mask bounds (16px margin on each side as defined in HTML 'm-4')
    const maskMargin = 16;
    const maskSize = size - (maskMargin * 2);
    const maskMinX = maskMargin;
    const maskMinY = maskMargin;
    const maskMaxX = maskMargin + maskSize;
    const maskMaxY = maskMargin + maskSize;

    // Constrain x so image fills mask horizontally
    const minX = maskMaxX - scaledW;
    const maxX = maskMinX;
    this.x = Math.max(minX, Math.min(maxX, this.x));

    // Constrain y so image fills mask vertically
    const minY = maskMaxY - scaledH;
    const maxY = maskMinY;
    this.y = Math.max(minY, Math.min(maxY, this.y));

    // Draw
    this.ctx.clearRect(0, 0, size, size);
    this.ctx.drawImage(this.image, this.x, this.y, scaledW, scaledH);
  }

  getCroppedBlob() {
    return new Promise(resolve => {
      const outputCanvas = document.createElement('canvas');
      // Produce a 400x400 image
      const targetSize = 400;
      outputCanvas.width = targetSize;
      outputCanvas.height = targetSize;
      const ctx = outputCanvas.getContext('2d');

      const size = this.canvas.width;
      const maskMargin = 16;
      const maskSize = size - (maskMargin * 2);

      // Ratio of output size to mask size
      const ratio = targetSize / maskSize;

      // Draw image onto output canvas with translation and scale adjusted for the mask
      ctx.drawImage(
        this.image,
        (this.x - maskMargin) * ratio,
        (this.y - maskMargin) * ratio,
        this.image.width * this.scale * ratio,
        this.image.height * this.scale * ratio
      );

      outputCanvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.9);
    });
  }
}
