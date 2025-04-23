import semver from 'semver';
import { BaseDirectory, exists, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { fetch } from '@tauri-apps/plugin-http';
import { Channel, invoke } from '@tauri-apps/api/core';
import {
    ChecksumFile,
    DownloadFileProgress,
    DownloadGameFileRequest,
    DownloadProgressCallback,
    UpdateGameResult,
} from './Models.ts';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { resourceDir } from '@tauri-apps/api/path';

export abstract class BaseTemplate {
    protected static SERVER_BASE_URL = 'https://fake-data.kola.es/static/';
    protected static LOCAL_BASE_URI = 'game/';
    protected static LOCAL_VERSION_URI = BaseTemplate.LOCAL_BASE_URI + 'version';
    protected static LOCAL_CHECKSUM_URI = BaseTemplate.LOCAL_BASE_URI + 'checksum';
    protected static SERVER_CHECKSUM_URI = BaseTemplate.SERVER_BASE_URL + 'checksum';
    protected static SERVER_VERSION_URI = BaseTemplate.SERVER_BASE_URL + 'version';

    private currentDownloadProgressPerFile: Record<string, number> = {};
    private currentDownloadSize = 0;

    async init(): Promise<void> {}

    async updateGame(): Promise<UpdateGameResult> {
        const localVersion = await this.getLocalVersion();
        const serverVersion = await this.getServerVersion();
        const localChecksum = await this.getLocalChecksum();
        const serverChecksum = await this.getServerChecksum();

        this.currentDownloadSize = 0;
        this.currentDownloadProgressPerFile = {};

        console.log('Local version:', localVersion);
        console.log('Server version: ', serverVersion);
        console.log('Local checksum:', localChecksum);
        console.log('Server checksum:', serverChecksum);

        // By default, download all files
        let filesToDownload: ChecksumFile[] = serverChecksum;

        // If local version exists and local checksum exists, means that user has already downloaded the game so update
        // only files that are not present locally or have a different hash
        if (localVersion && localChecksum) {
            console.log('Local version and local checksum files found');
            if (!semver.lt(localVersion, serverVersion)) {
                console.log('Local version is up to date');
                return Promise.resolve('up-to-date');
            }

            console.log('Checking server checksum files to see if they need to be downloaded');
            filesToDownload = [];

            for (const serverFile of serverChecksum) {
                const localFile = localChecksum.find((file) => file.path === serverFile.path);

                if (!localFile || localFile.hash !== serverFile.hash) {
                    console.log(
                        `File ${localFile?.path} needs to be downloaded. Local hash: ${localFile?.hash}, server hash: ${serverFile.hash}`
                    );
                    filesToDownload.push(serverFile);
                }
            }
        }

        const downloads = this.getDownloadFiles(filesToDownload, (progress, filesTotalFilesize, filepath) => {
            this.currentDownloadSize += progress.downloaded_size - (this.currentDownloadProgressPerFile[filepath] ?? 0);
            this.currentDownloadProgressPerFile[filepath] = progress.downloaded_size;

            this.onUpdate(this.currentDownloadSize, filesTotalFilesize, filepath);
        });
        const totalDownloadSize = filesToDownload.reduce((acc, file) => acc + file.size, 0);

        console.log('Downloading files:', filesToDownload);
        console.log('Total download size:', totalDownloadSize);

        await Promise.allSettled(downloads).then((downloads) => {
            downloads.forEach((download, index) => {
                const filepath = filesToDownload[index].path;

                if (download.status === 'rejected') {
                    throw new Error(`Error on file ${filepath}: ${download.reason}`);
                }

                if (download.status === 'fulfilled') {
                    const progress = JSON.parse(download.value);
                    console.log(
                        `Download finished for file ${filepath} with progress ${progress.downloaded_size}/${progress.total_size}`
                    );

                    this.currentDownloadSize +=
                        progress.downloaded_size - (this.currentDownloadProgressPerFile[filepath] ?? 0);
                    this.currentDownloadProgressPerFile[filepath] = progress.downloaded_size;
                    this.onUpdate(this.currentDownloadSize, totalDownloadSize, filepath);
                }
            });
        });

        console.log('Saving version to disk');
        await this.saveVersionToDisk(serverVersion);
        console.log('Saving checksum to disk');
        await this.saveChecksumToDisk(serverChecksum);

        return Promise.resolve('updated');
    }

    protected async close() {
        await getCurrentWindow().close();
    }

    protected async minimize() {
        await getCurrentWindow().minimize();
    }

    protected async maximize() {
        await getCurrentWindow().maximize();
    }

    protected async isUpToDate(): Promise<boolean> {
        const localVersion = await this.getLocalVersion();

        if (!localVersion) {
            return false;
        }

        const serverVersion = await this.getServerVersion();
        return !semver.lt(localVersion, serverVersion);
    }

    protected async getLocalVersion(): Promise<string | null> {
        const existsFile = await exists(BaseTemplate.LOCAL_VERSION_URI, { baseDir: BaseDirectory.Resource });

        if (!existsFile) {
            return Promise.resolve(null);
        }

        return readTextFile(BaseTemplate.LOCAL_VERSION_URI, {
            baseDir: BaseDirectory.Resource,
        });
    }

    protected async getServerVersion(): Promise<string> {
        return fetch(BaseTemplate.SERVER_VERSION_URI).then((value) => value.text());
    }

    protected async getLocalChecksum(): Promise<ChecksumFile[] | null> {
        const existsFile = await exists(BaseTemplate.LOCAL_CHECKSUM_URI, { baseDir: BaseDirectory.Resource });

        if (!existsFile) {
            return Promise.resolve(null);
        }

        const uri = (await resourceDir()) + '/' + BaseTemplate.LOCAL_CHECKSUM_URI;
        console.log('Getting local checksum file contents in', uri);
        const fileContents = await invoke<string>('parse_local_checksum', { uri });
        return JSON.parse(fileContents) as ChecksumFile[];
    }

    protected async getServerChecksum(): Promise<ChecksumFile[]> {
        const url = BaseTemplate.SERVER_CHECKSUM_URI;
        console.log('Getting server checksum file contents in', url);
        const fileContents = await invoke<string>('parse_server_checksum', { url });
        return JSON.parse(fileContents) as ChecksumFile[];
    }

    protected async saveVersionToDisk(version: string): Promise<void> {
        await writeTextFile(BaseTemplate.LOCAL_VERSION_URI, version, {
            baseDir: BaseDirectory.Resource,
        });
    }

    protected async saveChecksumToDisk(checksum: ChecksumFile[]): Promise<void> {
        const contents = checksum.map((file) => `${file.path}\t${file.hash}\t${file.size}`).join('\n');

        await writeTextFile(BaseTemplate.LOCAL_CHECKSUM_URI, contents, {
            baseDir: BaseDirectory.Resource,
        });
    }

    private getDownloadFiles(
        files: ChecksumFile[],
        updateCallback: (progress: DownloadFileProgress, totalDownload: number, filepath: string) => void
    ): Promise<string>[] {
        const downloads: Promise<string>[] = [];
        const totalDownloadSize = files.reduce((acc, file) => acc + file.size, 0);

        for (const file of files) {
            const request: DownloadGameFileRequest = {
                url: BaseTemplate.SERVER_BASE_URL + file.path,
                downloadDir: BaseTemplate.LOCAL_BASE_URI,
                destPath: BaseTemplate.LOCAL_BASE_URI + file.path,
            };

            const channel = new Channel<DownloadFileProgress>();
            channel.onmessage = (e) => updateCallback(e, totalDownloadSize, file.path);
            downloads.push(invoke<string>('download_game_file', { request, channel }));
        }

        return downloads;
    }

    abstract onUpdate: DownloadProgressCallback;
    abstract get template(): string;
}
