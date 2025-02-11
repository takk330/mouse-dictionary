/**
 * Mouse Dictionary (https://github.com/wtetsu/mouse-dictionary/)
 * Copyright 2018-present wtetsu
 * Licensed under MIT
 */

import immer from "immer";
import { debounce } from "../logic";
import { dom, Generator, view, entryDefault, storage } from "../extern";
import { MouseDictionarySettings } from "../types";

type PreviewWindow = { dialog: HTMLElement; content: HTMLElement };

export class Preview {
  element: HTMLElement;
  update: (settings: MouseDictionarySettings, text: string, refresh: boolean) => void;
  previewWindow: PreviewWindow;
  generator: Generator;
  buildEntries: (text: string, withCapitalized: boolean, includeOrgText: boolean) => { entries: string[]; lang: string };

  constructor(settings: MouseDictionarySettings) {
    this.update = debounce(this.updateBody.bind(this), 64);
    this.element = dom.create('<div style="position:absolute;top:10;left:0;z-index:-1;"></div>') as HTMLElement;
    this.element.hidden = true;
    document.body.appendChild(this.element);
    this.refreshGenerator(settings);
    this.refreshElement(settings);
    this.buildEntries = entryDefault();
  }

  updateBody(settings: MouseDictionarySettings, text: string, refresh: boolean): void {
    if (refresh) {
      this.refreshElement(settings);
    }
    this.refreshGenerator(settings);
    this.updateText(text, settings.lookupWithCapitalized);
    const dialog = this.previewWindow?.dialog;
    if (!dialog) {
      return;
    }
    dom.applyStyles(dialog, {
      width: `${settings.width}px`,
      height: `${settings.height}px`,
    });
  }

  async updateText(previewText: string, lookupWithCapitalized: boolean): Promise<void> {
    const { entries, lang } = this.buildEntries(previewText, lookupWithCapitalized, false);

    console.time("update");

    const descriptions = await storage.local.get(entries);
    const { html } = this.generator.generate(entries, descriptions, lang === "en");

    if (this.previewWindow) {
      const newDom = dom.create(html);
      this.previewWindow.content.innerHTML = "";
      this.previewWindow.content.appendChild(newDom);
    }

    console.timeEnd("update");
  }

  createWindow(settings: MouseDictionarySettings): PreviewWindow {
    const tmpSettings = immer(settings, (d) => {
      d.normalDialogStyles = null;
      d.hiddenDialogStyles = null;
      d.movingDialogStyles = null;
    });
    return view.create(tmpSettings) as PreviewWindow;
  }

  refreshGenerator(settings: MouseDictionarySettings): void {
    try {
      const newGenerator = new Generator(settings);
      if (newGenerator) {
        this.generator = newGenerator;
      }
    } catch {
      // Creating a Generator instance fails when settings is incorrect
    }
  }

  refreshElement(settings: MouseDictionarySettings): void {
    const orgPreviewWindow = this.previewWindow;
    this.previewWindow = null;

    try {
      this.previewWindow = this.createWindow(settings);
      this.element.appendChild(this.previewWindow.dialog);
    } catch (e) {
      console.error(e);
    }

    if (orgPreviewWindow?.dialog) {
      this.element.removeChild(orgPreviewWindow.dialog);
    }
  }

  setVisible(visible: boolean): void {
    this.element.hidden = !visible;
  }
}
