import { getDesktopAssets } from "@/lib/desktop-release";
import { DesktopDownloadButton } from "./desktop-download-button";

export async function DesktopDownload() {
  const assets = await getDesktopAssets();
  if (assets.length === 0) return null;
  return <DesktopDownloadButton assets={assets} />;
}
