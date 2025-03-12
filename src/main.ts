import {Channel, invoke} from "@tauri-apps/api/core";
import {resourceDir} from "@tauri-apps/api/path";
import prettyBytes from "pretty-bytes";

type ChecksumFile = {
    path: string;
    hash: string;
    size: number;
};

type DownloadFileProgress = {
    total_size: number;
    downloaded_size: number;
};

type DownloadGameFileRequest = {
    url: string,
    downloadDir: string,
    destPath: string,
}

function chunk<T>(array: T[], size: number = 10): T[][] {
    const chunkedArray: T[][] = [];

    for (let i = 0; i < array.length; i += size) {
        chunkedArray.push(array.slice(i, i + size));
    }

    return chunkedArray;
}

const baseUrl = "https://github.com/Open-game-launcher/testdeleteme/raw/refs/heads/master/";
// const baseUrl = "https://s3.tebi.io/launcher-game-test/";
const gameFilesDir = (await resourceDir()) + "/game/";
const progressEl = document.querySelector("progress")!;
const buttonEl = document.querySelector("button")!;
const pEl = document.querySelector("p")!;

buttonEl.addEventListener("click", async () => {
    let currentDownloadProgress: Record<string, number> = {};
    let currentDownloadSize = 0;
    let totalDownloadSize = 0;

    const rawChecksum = await invoke<string>('download_checksum', {url: baseUrl + 'checksum'});
    const checksum: ChecksumFile[] = JSON.parse(rawChecksum);
    const promises: Promise<string>[] = [];
    const chunks = chunk(checksum, 20);

    function updateProgress(progress: DownloadFileProgress, filepath: string) {
        currentDownloadSize += (progress.downloaded_size - (currentDownloadProgress[filepath] ?? 0));
        currentDownloadProgress[filepath] = progress.downloaded_size;

        progressEl.value = (currentDownloadSize / (totalDownloadSize)) * 100;
        pEl.innerText = `${prettyBytes(currentDownloadSize, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/${prettyBytes(totalDownloadSize, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    totalDownloadSize = checksum.reduce((acc, file) => acc + file.size, 0);

    for (const chunk of chunks) {
        for (const file of chunk) {
            const request: DownloadGameFileRequest = {
                url: baseUrl + file.path,
                downloadDir: gameFilesDir,
                destPath: gameFilesDir + file.path,
            };
            const channel = new Channel<DownloadFileProgress>();
            channel.onmessage = (e) => updateProgress(e, file.path);
            promises.push(invoke<string>('download_game_file', {request, channel}));
        }

        await Promise.all(promises).then((promises) => {
            promises.forEach((progress, index) => {
                updateProgress(JSON.parse(progress), checksum[index].path);
            });
        });
    }
});
