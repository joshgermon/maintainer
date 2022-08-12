import { check } from 'linkinator';

async function checkBrokenLinks(site: string) {
    const results = await check({
        path: site,
        recurse: false
    }) ;
    const linksChecked = results.links.length;
    const brokenLinks = results.links.filter((link) => link.state === 'BROKEN');
    console.log(`Links Checked: ${linksChecked}`);
    console.log(brokenLinks);
}

await checkBrokenLinks('https://www.skillsone.com.au/');