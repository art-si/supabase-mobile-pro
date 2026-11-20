export interface ChosenVideo {
  path: string;
  size: number;
  duration: number;
  width: number;
  height: number;
}
export function chooseVideoFile(maxBytes: number): Promise<ChosenVideo | null> {
  return new Promise((resolve, reject) =>
    uni.chooseVideo({
      sourceType: ["album", "camera"],
      compressed: false,
      success(result) {
        if (!Number.isFinite(result.size) || result.size <= 0) {
          reject(
            Object.assign(new Error("Invalid video"), {
              code: "VIDEO_UNSUPPORTED",
            }),
          );
          return;
        }
        if (result.size > maxBytes) {
          reject(
            Object.assign(new Error("Video too large"), {
              code: "VIDEO_TOO_LARGE",
            }),
          );
          return;
        }
        resolve({
          path: result.tempFilePath,
          size: result.size,
          duration: result.duration,
          width: result.width,
          height: result.height,
        });
      },
      fail(error) {
        if (String(error.errMsg).includes("cancel")) resolve(null);
        else
          reject(
            Object.assign(new Error("Video unavailable"), {
              code: "VIDEO_SELECTION_FAILED",
            }),
          );
      },
    }),
  );
}
