// gif.ts
//
// Purpose: GIF freeze/unfreeze helpers for shiggy images
// - Freezes a GIF by replacing its src with a data URL snapshot
// - Unfreezes by restoring the original animated src

const _frozenSrcs: WeakMap<HTMLImageElement, string> = new WeakMap();

export function freezeGif(img: HTMLImageElement): void {
    if (_frozenSrcs.has(img)) return;
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);
    _frozenSrcs.set(img, img.src);
    img.src = canvas.toDataURL("image/png");
}

export function unfreezeGif(img: HTMLImageElement): void {
    const original = _frozenSrcs.get(img);
    if (!original) return;
    img.src = original.split("?")[0] + `?v=${Date.now()}`;
    _frozenSrcs.delete(img);
}
