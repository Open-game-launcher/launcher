export type ChecksumFile = {
    path: string;
    hash: string;
    size: number;
};

export type DownloadFileProgress = {
    total_size: number;
    downloaded_size: number;
};

export type DownloadGameFileRequest = {
    url: string;
    downloadDir: string;
    destPath: string;
};

export type DownloadProgressCallback = (progress: number, total: number, filepath: string) => void;

export type UpdateGameResult = 'updated' | 'up-to-date' | 'error';
