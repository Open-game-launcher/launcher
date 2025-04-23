import './template.css';
import htmlTemplate from './template.html?raw';
import { BaseTemplate } from '../utils/BaseTemplate.ts';
import { DownloadProgressCallback, UpdateGameResult } from '../utils/Models.ts';
import prettyBytes from 'pretty-bytes';

export class Template extends BaseTemplate {
    private minimizeButton!: HTMLButtonElement;
    private closeButton!: HTMLButtonElement;
    private playButton!: HTMLButtonElement;
    private updateButton!: HTMLButtonElement;
    private progressContainer!: HTMLDivElement;
    private progressBar!: HTMLProgressElement;
    private progressText!: HTMLLabelElement;
    private downloadErrorText!: HTMLSpanElement;

    onUpdate: DownloadProgressCallback = (progress, total, filepath) => {
        if (this.progressContainer.style.display !== 'block') {
            this.progressContainer.style.display = 'block';
        }

        console.log(`[${filepath}] - Progress: ${progress}/${total}`);
        this.progressBar.value = Math.min((progress / total) * 100, 100);
        this.progressText.querySelector<HTMLSpanElement>('.current')!.innerText = prettyBytes(progress, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
        this.progressText.querySelector<HTMLSpanElement>('.total')!.innerText = prettyBytes(total, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    get template() {
        return htmlTemplate;
    }

    async init() {
        await super.init();

        this.minimizeButton = document.querySelector<HTMLButtonElement>('#minimize-button')!;
        this.closeButton = document.querySelector<HTMLButtonElement>('#close-button')!;
        this.playButton = document.querySelector<HTMLButtonElement>('#play-button')!;
        this.updateButton = document.querySelector<HTMLButtonElement>('#update-button')!;
        this.progressBar = document.querySelector<HTMLProgressElement>('#download-progress-bar')!;
        this.progressText = document.querySelector<HTMLLabelElement>('#download-progress-bar + label')!;
        this.progressContainer = document.querySelector<HTMLDivElement>('.progress')!;
        this.downloadErrorText = document.querySelector<HTMLSpanElement>('#download-error')!;

        this.downloadErrorText.style.display = 'none';

        this.minimizeButton.addEventListener('click', this.minimize.bind(this));
        this.closeButton.addEventListener('click', this.close.bind(this));
        this.updateButton.addEventListener('click', this.updateGame.bind(this));

        if (await this.isUpToDate()) {
            this.playButton.style.display = '';
            this.updateButton.style.display = 'none';
        } else {
            this.playButton.style.display = 'none';
            this.updateButton.style.display = '';
        }

        this.observeForStickyActions();
    }

    async updateGame(): Promise<UpdateGameResult> {
        this.updateButton.disabled = true;

        try {
            const result = await super.updateGame();

            this.updateButton.disabled = false;
            this.updateButton.style.display = 'none';
            this.playButton.style.display = '';
            this.progressContainer.style.display = 'none';

            return result;
        } catch (e) {
            const error = e as Error;

            if (error.message.includes('404')) {
                this.updateButton.disabled = false;
                this.progressContainer.style.display = 'none';
                this.downloadErrorText.innerText = error.message;
                this.downloadErrorText.style.display = 'block';
            }

            return 'error';
        }
    }

    private observeForStickyActions() {
        const stickyActions = document.querySelector<HTMLDivElement>('.game-actions')!;
        const stickyActionsObserver = new IntersectionObserver(
            ([entry]) => {
                entry.target.classList.toggle('sticky', entry.intersectionRatio < 1);
            },
            {
                rootMargin: '-13px 0px 0px 0px',
                threshold: 1,
            }
        );

        stickyActionsObserver.observe(stickyActions);
    }
}
