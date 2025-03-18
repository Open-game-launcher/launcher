import styles from './button.css?raw';
import { addGlobalStylesToShadowRoot } from '../utils/global-styles.ts';

export class ButtonComponent extends HTMLElement {
    private static template = `
        <button type="button">
            <slot></slot>
            <slot name="only-icon"></slot>
        </button>
    `;

    connectedCallback() {
        const shadowRoot = this.attachShadow({ mode: 'open' });
        const style = document.createElement('style');
        const template = document.createElement('template');

        style.textContent = styles;
        template.innerHTML = ButtonComponent.template.trim();

        addGlobalStylesToShadowRoot(shadowRoot);

        shadowRoot.append(style, template.content.firstChild!);

        const button = shadowRoot.querySelector('button')!;
        const slot: HTMLSlotElement = shadowRoot.querySelector('slot[name="only-icon"]')!;
        slot.addEventListener('slotchange', () => {
            button.classList.toggle('only-icon', slot.assignedNodes().length > 0);
        });
    }
}

customElements.define('ogl-button', ButtonComponent);
