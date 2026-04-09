// save
//
// Purpose: Triggers a browser file download from a Blob

export function save(blob: Blob, name: string): void {
	if ((<any>navigator).msSaveOrOpenBlob) {
		(<any>navigator).msSaveOrOpenBlob(blob, name);
		return;
	}

	const anchor: HTMLAnchorElement = document.createElement("a");
	if (anchor.download !== undefined) {
		const url: string = URL.createObjectURL(blob);
		setTimeout(function () {
			URL.revokeObjectURL(url);
		}, 60000);
		anchor.href = url;
		anchor.download = name;
		setTimeout(function () {
			anchor.dispatchEvent(new MouseEvent("click"));
		}, 0);
	} else {
		const url: string = URL.createObjectURL(blob);
		setTimeout(function () {
			URL.revokeObjectURL(url);
		}, 60000);
		if (!window.open(url, "_blank")) window.location.href = url;
	}
}
