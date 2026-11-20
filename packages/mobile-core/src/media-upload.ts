export interface UploadedMedia {
  id: string;
  path: string;
  width: number;
  height: number;
  kind?: "image" | "video";
  duration?: number;
  size?: number;
  url?: string;
}
export interface MediaUploadEntry {
  key: string;
  path: string;
  kind?: "image" | "video";
  /** Locally normalized preview; path remains the selected source for retries. */
  previewPath?: string;
  size?: number;
  duration?: number;
  asset?: UploadedMedia;
  poster?: string;
  notice?: string;
  progress?: number;
  stage?: 'preparing' | 'uploading';
  preparationProgress?: number;
  busy: boolean;
  error: string;
  retryable?: boolean;
  needsLogin?: boolean;
  previewFailed?: boolean;
  release?: () => void;
}
