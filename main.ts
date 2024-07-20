import { App, Editor, Plugin, PluginSettingTab, Setting } from "obsidian";

// Remember to rename these classes and interfaces!
const CSS_CLASSNAME_PREFIX = "SIMPLE_CRITIC_MARKUP__";

interface SimpleCriticMarkupSettings {
	showDeletion: boolean;
}

const DEFAULT_SETTINGS: SimpleCriticMarkupSettings = {
	showDeletion: true,
};

function insertOrReplaceSelection(
	editor: Editor,
	replacer: (selection: string) => string
) {
	const selection = editor.getSelection();
	if (selection) {
		editor.replaceSelection(replacer(selection));
	} else {
		editor.replaceRange(replacer(selection), editor.getCursor());
	}
}

export default class SimpleCriticMarkup extends Plugin {
	settings: SimpleCriticMarkupSettings;

	toggleShowDeletion() {
		document.documentElement.style.setProperty(
			"--deletion-display",
			this.settings.showDeletion ? "inline-block" : "none"
		);
	}

	async onload() {
		await this.loadSettings();
		this.toggleShowDeletion();

		// custom commands
		// 1. addition
		this.addCommand({
			id: "addition",
			name: "Insert addition {++ ++}",
			editorCallback: (editor: Editor) => {
				// replace selection
				const pos = editor.getCursor();
				insertOrReplaceSelection(editor, (s) => `{++ ${s} ++}`);
				pos.ch += 4;
				editor.setCursor(pos);
			},
		});
		this.registerMarkdownPostProcessor((element, context) => {
			element.innerHTML = element.innerHTML.replace(
				/\{\+\+\s*?([^+]*)\s*?\+\+\}/g,
				`<ins class="${CSS_CLASSNAME_PREFIX}add">$1</ins>`
			);
		});

		// 2. deletion
		this.addCommand({
			id: "deletion",
			name: "Insert deletion {-- --}",
			editorCallback: (editor: Editor) => {
				// replace selection
				const pos = editor.getCursor();
				insertOrReplaceSelection(editor, (s) => `{-- ${s} --}`);
				pos.ch += 4;
				editor.setCursor(pos);
			},
		});
		this.registerMarkdownPostProcessor((element, context) => {
			element.innerHTML = element.innerHTML.replace(
				/\{\-\-\s*?([^-]*)\s*?\-\-\}/g,
				`<del class="${CSS_CLASSNAME_PREFIX}delete">$1</del>`
			);
		});

		// 3. substitution
		this.addCommand({
			id: "substitution",
			name: "Insert substitution {~~ ~> ~~}",
			editorCallback: (editor: Editor) => {
				// replace selection
				const selection = editor.getSelection();
				const pos = editor.getCursor();
				insertOrReplaceSelection(editor, (s) => `{~~${s}~> ~~}`);
				pos.ch += selection.length + 5;
				editor.setCursor(pos);
			},
		});
		this.registerMarkdownPostProcessor((element, context) => {
			element.innerHTML = element.innerHTML.replace(
				// NOTE: hacky way to replace the content
				/\{(\<del>|\~\~)\s*?([^~]*)~&gt;([^<~]*)\s*?(<\/del>|\~\~)\}/g,
				`<del class="${CSS_CLASSNAME_PREFIX}delete">$2</del><ins class="${CSS_CLASSNAME_PREFIX}add">$3</ins>`
			);
		});

		// toggle setting
		this.addCommand({
			id: "toggle-show-deletion",
			name: "Toggle deletion setting",
			callback: () => {
				// replace selection
				this.settings.showDeletion = !this.settings.showDeletion;
				this.saveSettings();
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new CustomSettingTab(this.app, this));
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.toggleShowDeletion();
	}
}

class CustomSettingTab extends PluginSettingTab {
	plugin: SimpleCriticMarkup;

	constructor(app: App, plugin: SimpleCriticMarkup) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Show deletion")
			.setDesc("whether to show deletion")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showDeletion)
					.onChange(async (value) => {
						this.plugin.settings.showDeletion = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
