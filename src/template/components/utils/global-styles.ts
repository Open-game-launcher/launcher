let globalSheets: CSSStyleSheet[] | null = null;

export function getGlobalStyles() {
    if (globalSheets === null) {
        globalSheets = Array.from(document.styleSheets).map((styleSheet) => {
            const sheet = new CSSStyleSheet();
            const css = [...styleSheet.cssRules].map((rule) => rule.cssText).join(' ');
            sheet.replaceSync(css);
            return sheet;
        });
    }

    return globalSheets;
}

export function addGlobalStylesToShadowRoot(shadowRoot: ShadowRoot) {
    shadowRoot.adoptedStyleSheets.push(...getGlobalStyles());
}
