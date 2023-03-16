import { Feed } from "feed";
import { minify as htmlMinify } from "html-minifier-terser";
import { promises as fs } from "node:fs";
import { render } from "ejs";
import { resolve } from "node:path";
import { select, selectAll } from "hast-util-select";
import { unified } from "unified";
import { version as nodeVersion } from "node:process";
import parse from "rehype-parse";

const htmlMinifyOptions = {
	collapseWhitespace: true,
	removeAttributeQuotes: true,
	removeComments: true,
};

async function main() {
	console.log(/* let it breathe */);

	const sections = await getChangelog();
	const feedItems = createFeedItems(sections);

	createFeed(feedItems);
	await createPage();
}

await main();

async function getChangelog() {
	console.time("Downloading changelog");
	const response = await fetch("https://sdk.play.date/changelog/");
	console.timeEnd("Downloading changelog");

	if (!response.ok) {
		console.log(response.statusText);
		return;
	}

	const html = await response.text();
	const htmlPageTree = unified().use(parse).parse(html);
	const sections = selectAll(`section`, htmlPageTree);

	return sections;
}

function createFeedItems(sections) {
	console.time("Populating feed items");

	const items = sections.map((section) => {
		const version = select("h2", section)?.children[0]?.value?.trim() || "";
		const date =
			select("h2 + p", section)
				?.children[0]?.value?.trim()
				.replace(/(?!\d{1,2})(st|nd|rd|th)/g, "") || "";

		return {
			version,
			date: date,
		};
	});

	console.timeEnd("Populating feed items");

	return items.slice(0, 10);
}

async function createFeed(items) {
	console.time("Creating feeds");

	const feed = new Feed({
		title: "Playdate SDK Changelog",
		description: "A missing RSS feed for Playdate SDK updates",
		id: "https://idleberg.github.io/playdate-sdk-feed",
		link: "https://idleberg.github.io/playdate-sdk-feed",
		language: "en",
		generator: `NodeJS v${nodeVersion}`,
		copyright: "Public Domain",
		updated: new Date(items[0].date),
		feedLinks: {
			atom: "https://idleberg.github.io/playdate-sdk-feed/atom",
			json: "https://idleberg.github.io/playdate-sdk-feed/json",
			rss: "https://idleberg.github.io/playdate-sdk-feed/rss",
		},
		author: {
			name: "idleberg",
			link: "https://github.com/idleberg",
		},
	});

	items.map((item) => {
		feed.addItem({
			title: item.version,
			id: `https://download-keycdn.panic.com/playdate_sdk/PlaydateSDK-${item.version}.zip`,
			link: `https://download-keycdn.panic.com/playdate_sdk/PlaydateSDK-${item.version}.zip`,
			description: "",
			date: new Date(item.date),
		});
	});

	try {
		await fs.mkdir("public");
	} catch (error) {
		console.warn("Output path exists");
	}

	await fs.writeFile("public/atom", feed.atom1(), "utf-8");
	await fs.writeFile("public/json", feed.json1(), "utf-8");
	await fs.writeFile("public/rss", feed.rss2(), "utf-8");

	console.timeEnd("Creating feeds");
}

async function createPage() {
	console.time("Creating page");

	const templateFile = resolve("./src/template.ejs");
	const iconFile = resolve("./src/favicon.svg");

	const template = (await fs.readFile(templateFile)).toString();
	const icon = (await fs.readFile(iconFile)).toString();

	const html = await htmlMinify(render(template), htmlMinifyOptions);
	const favicon = await htmlMinify(icon, {
		...htmlMinifyOptions,
		removeAttributeQuotes: false,
	});

	await fs.writeFile("public/favicon.svg", favicon);
	await fs.writeFile("public/index.html", html);

	console.timeEnd("Creating page");
}
