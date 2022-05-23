import fetch from 'node-fetch';
import fs from 'fs-extra';
import path from 'path';
import {markdownTable} from 'markdown-table';

async function start() {
	fs.removeSync('data');
	const stats = await backup('/page/export', 'pages', 'anime', 1, {}, {});
	await backup('/mal/export', 'myanimelist');
	await backup('/anilist/export', 'anilist');
	await updateReadme(stats);
}


async function backup(url, name, type = 'anime', page = 1, ids = {}, stats = null) {
	return await getData(url + '/' + type + '/' + page).then(async (json) => {
		const promises = json.data.map(data => {
			if(!ids[data.page ?? type]) {
				ids[data.page ?? type] = [];
			}
			ids[data.page ?? type].push(data.identifier ?? data.id);
			if(name === 'pages') {
				if(!stats[data.page]) {
					stats[data.page] = {
						total: 0,
						mal: 0,
						noMal: 0,
						ani: 0,
						noAni: 0
					}
				}
				stats[data.page].total += 1;
				if(data.malId) {
					stats[data.page].mal += 1;
				} else {
					stats[data.page].noMal += 1;
				}
				if(data.aniId) {
					stats[data.page].ani += 1;
				} else {
					stats[data.page].noAni += 1;
				}
			}
			return fs.outputFile(`data/${name}/${data.page ?? type}/${data.identifier ?? data.id}.json`, JSON.stringify(data, null, 2))
		})
		await Promise.all(promises);

		if(json.next) {
			return await backup(url, name, type, page + 1, ids, stats);
		} else {
			if(type === 'anime') {
				return await backup(url, name, 'manga', 1, ids, stats);
			}
			for(const item in ids) {
				await fs.outputFile(`data/${name}/${item}/_index.json`, JSON.stringify(ids[item].sort(), null, 2));
			}
			if(name === 'pages') {
				await fs.outputFile(`data/${name}/_index.json`, JSON.stringify(Object.keys(ids).sort(), null, 2));
				return stats;
			}
			return true;
		}
	}).catch((e) => {
		throw 'backup error'
	});
}

async function getData(url) {
	return fetch(process.env.DOMAIN + url, {
		headers: {
			'Authorization': "Permanent " + process.env.ACCESS_TOKEN
		}
	}).then(res => {
		if(res.status !== 200) {
			throw "response status not 200";
		}
		return res.json()
	})
}

async function updateReadme(statsData) {
	let statsArray = [['Page', 'Total', 'MalID', 'noMalID', 'AniID', 'noAniID']];

	for (const pageName in statsData) {
		const stats = statsData[pageName];
		statsArray.push([pageName, stats.total, stats.mal, stats.noMal, stats.ani, stats.noAni])
	}

	const statstable = markdownTable(statsArray);
	const descFile = path.resolve('./README.md');

	fs.readFile(descFile, 'utf8', function(err, data) {
		if (err) {
			throw err;
		}
		const result = data.replace(/<!--statstable-->((.|\n|\r)*)<!--\/statstable-->/g, `<!--statstable-->\n${statstable}\n<!--/statstable-->`);

		fs.writeFile(descFile, result, 'utf8', function(err) {
			if (err) throw err;
		});
	});
}

process.on('unhandledRejection', err => {
	console.error(err);
	process.exit(1);
});

start();
