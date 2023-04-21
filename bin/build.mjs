import { Feed } from "feed";
import { minify as htmlMinify } from "html-minifier-terser";
import { promises as fs } from "node:fs";
import { render } from "ejs";
import { resolve } from "node:path";
import { select, selectAll } from "hast-util-select";
import { unified } from "unified";
import { version as nodeVersion } from "node:process";
import { toHtml } from "hast-util-to-html";
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

		const content = section.children.filter(item => item.tagName === 'h3' || item.tagName === 'ul') || null;

		return {
			version,
			date,
			content: content ? toHtml(content) : null
		};
	});

	console.timeEnd("Populating feed items");

	return items.slice(0, 10);
}

async function createFeed(items) {
	console.time("Creating feeds");

	const feed = new Feed({
		title: "Playdate SDK Changelog",
		description: "The missing feeds for Playdate SDK updates",
		id: "https://idleberg.github.io/playdate-sdk-feed",
		link: "https://idleberg.github.io/playdate-sdk-feed",
		language: "en",
		generator: `NodeJS v${nodeVersion}`,
		copyright: "Public Domain",
		updated: new Date(items[0].date),
		feedLinks: {
			atom: "https://idleberg.github.io/playdate-sdk-feed/feed.atom",
			json: "https://idleberg.github.io/playdate-sdk-feed/feed.json",
			rss: "https://idleberg.github.io/playdate-sdk-feed/feed.rss",
		},
		author: {
			name: "idleberg",
			link: "https://github.com/idleberg",
		},
	});

	// TODO remove after July 21, 2023
	const legacyFeed = new Feed({
		title: "Playdate SDK Changelog",
		description: "The missing feeds for Playdate SDK updates",
		id: "https://idleberg.github.io/playdate-sdk-feed",
		link: "https://idleberg.github.io/playdate-sdk-feed",
		language: "en",
		generator: `NodeJS v${nodeVersion}`,
		copyright: "Public Domain",
		updated: new Date(items[0].date),
		feedLinks: {
			atom: "https://idleberg.github.io/playdate-sdk-feed/feed.atom",
			json: "https://idleberg.github.io/playdate-sdk-feed/feed.json",
			rss: "https://idleberg.github.io/playdate-sdk-feed/feed.rss",
		},
		author: {
			name: "idleberg",
			link: "https://github.com/idleberg",
		},
	});

	// TODO remove after July 21, 2023
	legacyFeed.addItem({
		title: 'Deprecation Notice',
		id: 'urlMigration.v1',
		link: 'https://github.com/idleberg/playdate-sdk-feed/commit/fbdced2bc1d9ecf74fbd07819ba6e5e37b507469',
		description: `
			<p>To avoid problems with MIME-types, the URLs for all feeds have been changed. Some clients might actually handle this transition
			automatically based on the provided feed links. However, you might have to edit your subscriptions manually.</p>

			<p>The new feed URLs here:</p>

			<ul>
				<li><a href="https://idleberg.github.io/playdate-sdk-feed/feed.atom">https://idleberg.github.io/playdate-sdk-feed/feed.atom</a></li>
				<li><a href="https://idleberg.github.io/playdate-sdk-feed/feed.json">https://idleberg.github.io/playdate-sdk-feed/feed.json</a></li>
				<li><a href="https://idleberg.github.io/playdate-sdk-feed/feed.rss">https://idleberg.github.io/playdate-sdk-feed/feed.rss</a></li>
			</ul>

			<p>The old URLs will be deleted on July 21, 2023. Sorry for causing any inconveniences.</p>
		`.trim(),
		date: new Date()
	});

	items.map((item) => {
		feed.addItem({
			title: `Playdate SDK v${item.version}`,
			id: item.version,
			link: `https://sdk.play.date/changelog#:~:text=${item.version}`,
			description: item.content,
			date: new Date(item.date),
		});

		// TODO remove after July 21, 2023
		legacyFeed.addItem({
			title: `Playdate SDK v${item.version}`,
			id: item.version,
			link: `https://sdk.play.date/changelog#:~:text=${item.version}`,
			description: item.content,
			date: new Date(item.date),
		});
	});
	
	try {
		await fs.mkdir("public");
	} catch (error) {
		console.warn("Output path exists");
	}

	const feeds = {
		atom: feed.atom1(),
		json: feed.json1(),
		rss: feed.rss2()
	};

	await fs.writeFile("public/feed.atom", feeds.atom, "utf-8");
	await fs.writeFile("public/feed.json", feeds.json, "utf-8");
	await fs.writeFile("public/feed.rss", feeds.rss, "utf-8");
	
	// TODO remove after July 21, 2023
	await fs.writeFile("public/atom", legacyFeed.atom1(), "utf-8");
	await fs.writeFile("public/json", legacyFeed.json1(), "utf-8");
	await fs.writeFile("public/rss", legacyFeed.rss2(), "utf-8");

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
