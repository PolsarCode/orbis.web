export type DesktopAsset = { name: string; url: string };

export async function getDesktopAssets(): Promise<DesktopAsset[]> {
  try {
    const response = await fetch(
      "https://api.github.com/repos/PolsarCode/orbis.desktop/releases/latest",
      {
        headers: { Accept: "application/vnd.github+json", "User-Agent": "Orbis" },
        next: { revalidate: 300 },
      },
    );
    if (!response.ok) return [];
    const release = (await response.json()) as {
      assets?: { name: string; browser_download_url: string }[];
    };
    return (release.assets ?? []).map(({ name, browser_download_url }) => ({
      name,
      url: browser_download_url,
    }));
  } catch {
    return [];
  }
}
