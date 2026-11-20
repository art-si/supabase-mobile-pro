export interface ChosenMedia {
  path: string;
  kind: "image" | "video";
  size: number;
  duration?: number;
  poster?: string;
  notice?: string;
  release?: () => void;
}
export type MediaChooseSource = "camera" | "album";
/** Bounded signature inspection for a local selection hint, not format validation. */
export function imageSelectionNotice(bytes: Uint8Array) {
  const tag = (offset: number, value: string) => [...value].every((character, index) => bytes[offset + index] === character.charCodeAt(0));
  const gif = tag(0, 'GIF87a') || tag(0, 'GIF89a');
  const animatedWebp = bytes.length >= 30 && tag(0, 'RIFF') && tag(8, 'WEBP') && tag(12, 'VP8X') && Boolean(bytes[20]! & 2);
  const animatedAvif = bytes.length >= 16 && tag(4, 'ftyp') && tag(8, 'avis');
  return gif || animatedWebp || animatedAvif ? '动图将按静态首帧保存' : '';
}
export function chooseMediaFiles(
  count: number,
  accept: readonly ("image" | "video")[] = ["image", "video"],
  source?: MediaChooseSource,
): Promise<ChosenMedia[]> {
  if (count < 1 || (source === "camera" && !accept.includes("image")))
    return Promise.resolve([]);
  const maximum = source === "camera" ? 1 : count;
  const kinds: readonly ("image" | "video")[] = source === "camera" ? ["image"] : accept;
  // #ifdef H5
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = source === "camera" ? "image/*" : [
      ...(kinds.includes("image") ? ["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp", "image/avif", "image/heic", "image/heif", ".webp", ".gif", ".bmp", ".avif", ".heic", ".heif"] : []),
      ...(kinds.includes("video") ? ["video/*", "video/mp4", "video/quicktime", ".mp4", ".mov", ".m4v", ".webm", ".mkv", ".ts", ".mts", ".m2ts", ".ogv"] : []),
    ].join(",");
    if (source === "camera") input.setAttribute("capture", "environment");
    input.multiple = maximum > 1;
    input.style.display = "none";
    document.body.appendChild(input);
    let settled = false;
    const finish = () => {
      if (settled) return false;
      settled = true; input.remove(); return true;
    };
    input.addEventListener(
      "cancel",
      () => {
        if (finish()) resolve([]);
      },
      { once: true },
    );
    input.addEventListener(
      "change",
      async () => {
        if (!finish()) return;
        const files = Array.from(input.files || []);
        if (files.length > maximum) {
          reject(
            Object.assign(new Error("MEDIA_LIMIT"), { code: "MEDIA_LIMIT" }),
          );
          return;
        }
        resolve(
          await Promise.all(files.map(async (file) => {
            let notice = '';
            try { notice = imageSelectionNotice(new Uint8Array(await file.slice(0, 64).arrayBuffer())); } catch { /* Preparation reports unreadable files. */ }
            const path = URL.createObjectURL(file);
            return {
              path,
              size: file.size,
              notice,
              kind:
                file.type.startsWith("video/") ||
                /\.(mp4|mov|m4v|webm|mkv|ts|mts|m2ts|ogv)$/i.test(file.name)
                  ? "video" as const
                  : "image" as const,
              release: () => URL.revokeObjectURL(path),
            };
          })),
        );
      },
      { once: true },
    );
    try { input.click(); }
    catch (error) { if (finish()) reject(error); }
  });
  // #endif
  // #ifndef H5
  return new Promise((resolve, reject) => {
    uni.chooseMedia({
      count: maximum,
      mediaType: [...kinds],
      sourceType: source ? [source] : ["album", "camera"],
      sizeType: ["original"],
      success(result) {
        resolve(
          result.tempFiles.map((file) => ({
            path: file.tempFilePath,
            kind: file.fileType === "video" ? "video" : "image",
            size: file.size,
            duration: file.duration,
            poster: file.thumbTempFilePath,
          })),
        );
      },
      fail(error) {
        if (error.errMsg?.includes("cancel")) resolve([]);
        else
          reject(
            Object.assign(new Error("MEDIA_SELECTION_FAILED"), {
              code: "MEDIA_SELECTION_FAILED",
            }),
          );
      },
    });
  });
  // #endif
}
