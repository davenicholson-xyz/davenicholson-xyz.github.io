class WavatarComponent extends HTMLElement {
    shadow;
    image;
    canvas;
    context;
    scale;
    zoom;
    scaleMax;
    dragging;
    viewRect;
    imageOrigin;
    mouseOnCanvas;
    mouseOnImage;
    dragStart;
    offset;
    clipRound;
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: "open" });
        this.image = new Image();
        this.image.addEventListener("load", this.imageChange.bind(this));
        this.scale = 1;
        this.zoom = 1;
        this.scaleMax = 5;
        this.dragging = false;
        this.viewRect = { x: 0, y: 0, width: 0, height: 0 };
        this.imageOrigin = { x: 0, y: 0 };
        this.mouseOnCanvas = { x: 0, y: 0 };
        this.mouseOnImage = { x: 0, y: 0 };
        this.dragStart = { x: 0, y: 0 };
        this.offset = { x: 0, y: 0 };
    }
    static get observedAttributes() {
        return ["src", "max", "round"];
    }
    get width() {
        return this.getAttribute("width");
    }
    set width(value) {
        this.setAttribute("width", value);
    }
    get height() {
        return this.getAttribute("height");
    }
    set height(value) {
        this.setAttribute("height", value);
    }
    get src() {
        return this.getAttribute("src");
    }
    set src(value) {
        this.setAttribute("src", value);
    }
    get max() {
        return this.getAttribute("max");
    }
    set max(value) {
        this.setAttribute("max", value);
    }
    get round() {
        return this.hasAttribute("round");
    }
    set round(_) {
        this.setAttribute("round", "");
    }
    attributeChangedCallback(attr, _, newVal) {
        switch (attr) {
            case "src":
                this.image.src = newVal;
                break;
            case "max":
                this.scaleMax = parseInt(newVal);
                break;
            default:
                break;
        }
    }
    connectedCallback() {
        this.shadow.innerHTML = `
    <style>
      :host {
        display: inline-block;
        padding: 0;
        margin: 0;
        line-height: 0;
      }
    </style>
    <canvas></canvas>
    `;
        this.canvas = this.shadow.querySelector("canvas");
        this.context = this.canvas.getContext("2d");
        this.canvas.width = parseInt(this.getAttribute("width")) || 200;
        this.canvas.height = parseInt(this.getAttribute("height")) || 200;
        this.image.crossOrigin = "anonymous";
        this.image.src = this.src;
        this.clipRound = () => {
            this.context.arc(this.canvas.width / 2, this.canvas.height / 2, this.canvas.height / 2, 0, 2 * Math.PI, false);
        };
        this.canvas.addEventListener("mousedown", (e) => {
            this.dragging = true;
            this.dragStart = this.getCanvasPoint(e);
            this.emit("mousedown");
        });
        this.canvas.addEventListener("mouseup", () => {
            this.dragging = false;
            this.imageOrigin.x = this.imageOrigin.x - this.offset.x;
            this.imageOrigin.y = this.imageOrigin.y - this.offset.y;
            this.offset = { x: 0, y: 0 };
            this.emit("mouseup");
            this.draw();
        });
        this.canvas.addEventListener("mousemove", (e) => {
            this.mouseOnCanvas = this.getCanvasPoint(e);
            this.mouseOnImage.x =
                this.mouseOnCanvas.x / (this.scale * this.zoom) + this.viewRect.x;
            this.mouseOnImage.y =
                this.mouseOnCanvas.y / (this.scale * this.zoom) + this.viewRect.y;
            if (this.dragging) {
                this.offset.x =
                    (this.mouseOnCanvas.x - this.dragStart.x) / (this.scale * this.zoom);
                this.offset.y =
                    (this.mouseOnCanvas.y - this.dragStart.y) / (this.scale * this.zoom);
                this.draw();
            }
            this.emit("mousemove");
        });
        this.canvas.addEventListener("wheel", (e) => {
            e.preventDefault();
            let scale = this.zoom + e.deltaY * -0.025;
            scale = Math.min(this.scaleMax, Math.max(1, scale));
            this.zoom = scale;
            this.emit("wheel");
            this.draw();
        }, { passive: false });
    }
    getCanvasPoint(e) {
        let canvasRect = this.canvas.getBoundingClientRect();
        let x = e.clientX - canvasRect.x;
        let y = e.clientY - canvasRect.y;
        return { x, y };
    }
    clearCanvas() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    imageChange() {
        this.scale = Math.max(this.canvas.width / this.image.width, this.canvas.height / this.image.height);
        this.zoom = 1;
        this.imageOrigin.x = this.image.width / 2;
        this.imageOrigin.y = this.image.height / 2;
        this.emit("src");
        this.draw();
    }
    draw() {
        this.calculateViewRect();
        this.clearCanvas();
        this.context.save();
        if (this.round) {
            this.clipRound();
            this.context.clip();
        }
        this.context.drawImage(this.image, this.viewRect.x, this.viewRect.y, this.viewRect.width, this.viewRect.height, 0, 0, this.canvas.width, this.canvas.height);
        this.context.restore();
        this.emit("draw");
    }
    calculateViewRect() {
        let scale = this.scale * this.zoom;
        this.viewRect.width = this.canvas.width / scale;
        this.viewRect.height = this.canvas.height / scale;
        this.viewRect.x =
            this.imageOrigin.x - this.offset.x - this.viewRect.width / 2;
        this.viewRect.y =
            this.imageOrigin.y - this.offset.y - this.viewRect.height / 2;
        this.checkViewRectBounds();
    }
    checkViewRectBounds() {
        if (this.imageOrigin.x - this.offset.x - this.viewRect.width / 2 < 0) {
            let overX = this.imageOrigin.x - this.offset.x - this.viewRect.width / 2;
            this.viewRect.x = this.viewRect.x - overX;
            this.imageOrigin.x = this.viewRect.width / 2;
        }
        if (this.imageOrigin.x - this.offset.x + this.viewRect.width / 2 >
            this.image.width) {
            let overX = this.image.width -
                (this.imageOrigin.x - this.offset.x + this.viewRect.width / 2);
            this.viewRect.x = this.viewRect.x + overX;
            this.imageOrigin.x = this.image.width - this.viewRect.width / 2;
        }
        if (this.imageOrigin.y - this.offset.y - this.viewRect.height / 2 < 0) {
            let overY = this.imageOrigin.y - this.offset.y - this.viewRect.height / 2;
            this.viewRect.y = this.viewRect.y - overY;
            this.imageOrigin.y = this.viewRect.height / 2;
        }
        if (this.imageOrigin.y - this.offset.y + this.viewRect.height / 2 >
            this.image.height) {
            let overY = this.image.height -
                (this.imageOrigin.y - this.offset.y + this.viewRect.height / 2);
            this.viewRect.y = this.viewRect.y + overY;
            this.imageOrigin.y = this.image.height - this.viewRect.height / 2;
        }
    }
    debugInfo() {
        return {
            canvas: { width: this.canvas.width, height: this.canvas.height },
            image: {
                src: this.image.src,
                width: this.image.width,
                height: this.image.height,
            },
            viewRect: this.viewRect,
            scale: this.scale,
            zoom: this.zoom,
            mouseOnCanvas: this.mouseOnCanvas,
            mouseOnImage: this.mouseOnImage,
            round: this.round,
        };
    }
    debug() {
        return this.debugInfo();
    }
    emit(value) {
        let db = this.debugInfo();
        window.dispatchEvent(new CustomEvent("wavatar-debug", { detail: { ...db, event: value } }));
    }
    fileSelect(cb) {
        let fileselect = document.createElement("input");
        fileselect.type = "file";
        fileselect.addEventListener("change", (e) => {
            let imgfile = e.target.files[0];
            this.src = URL.createObjectURL(imgfile);
            if (typeof cb === "function") {
                cb();
            }
        });
        fileselect.click();
        fileselect.remove();
    }
    setZoom(value) {
        this.zoom = Math.min(Math.max(value, 1), this.scaleMax);
    }
    toPNG() {
        return this.canvas.toDataURL("image/png");
    }
    toJPEG() {
        return this.canvas.toDataURL("image/jpeg");
    }
    toBlob(cb) {
        this.canvas.toBlob((blob) => {
            cb(blob);
        });
    }
}
window.customElements.define("w-avatar", WavatarComponent);
