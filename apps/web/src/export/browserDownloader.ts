import { ReportDownloader } from "./exportRiskReport";

/** Real implementation — triggers an actual browser file download via a Blob + object URL. */
export class BrowserDownloader implements ReportDownloader {
  download(filename: string, content: Blob, mimeType: string): void {
    const blob = content.type ? content : content.slice(0, content.size, mimeType);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }
}
