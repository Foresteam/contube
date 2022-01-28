const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { terminal } = require('terminal-kit');
const HTMLParser = require('node-html-parser');
const { exec } = require('child_process');

terminal.SingleColumnMenu = (items, opts = {}) => new Promise(resolve => terminal.singleColumnMenu(items, opts, (error, input) => resolve(input)));
terminal.InputField = () => new Promise(resolve => terminal.inputField((error, input) => resolve(input)));

const queryURL = (query, page) => `https://invidious.fdn.fr/search?q=${encodeURIComponent(query)}&page=${page}`;

let itemsList = items => [].concat(['<='], items, ['Back to search', '=>']);

(async () => {
    while (true) {
        terminal.clear();
        terminal('Enter search query (or leave empty to quit): ');
        let query = await terminal.InputField();
        if (!query)
            break;
        let page = 1;
        while (true) {
            terminal.clear();
            terminal.cyan(`${query}\n`);
            terminal.cyan(`Page: ${page}\n`);

            const html = await fetch(queryURL(query, page)).then(response => response.text());
            const root = HTMLParser.parse(html);

            const vids = root.querySelector('#contents').querySelectorAll('div.pure-g')[3]
                .querySelectorAll('.pure-u-1.pure-u-md-1-4')
                .map(node => node.querySelector('.h-box'))
                .map(node => ({
                    href: node.querySelector('a').getAttribute('href'),
                    length: node.querySelector('a').querySelectorAll('p')[0].innerText,
                    name: node.querySelector('a').querySelectorAll('p')[1].innerText,
                    channel: (node.querySelector('.video-card-row') || { querySelector: () => ({ innerText: null })}).querySelector('.channel-name').innerText
                }))
                .filter(vinfo => vinfo.channel);

            let choise = await terminal.SingleColumnMenu(itemsList(vids.map(vinfo => `${vinfo.length}\t${vinfo.channel}\t${vinfo.name}`)));
            choise = choise.selectedIndex;
            if (choise == 0 || choise == itemsList(vids).length - 1) {
                choise /= itemsList(vids).length - 1;
                page += choise * 2 - 1;
                if (page < 1)
                    page = 1;
                continue;
            }
            if (choise == itemsList(vids).length - 2)
                break;
            choise = vids[choise - 1];
            console.log(await new Promise(resolve => exec(`mpv 'https://invidious.fdn.fr${choise.href}'`, resolve)));
        }
    }
    terminal.processExit();
})();