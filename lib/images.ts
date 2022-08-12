import { load } from "cheerio";
import sharp from 'sharp';
import fs from 'fs';

const baseDir = process.cwd() + '/images';

async function getPageHTML(url: URL) {
    const req = await fetch(url);
    const data = await req.text();
    return data;
}

function getImagesFromPageHTML(page: string) {
    const $ = load(page, {
        xmlMode: true // to load noscript
    });
    const images = $('img')
        .toArray()
        .map(img => $(img).attr('src'))
        .filter(src => !src?.startsWith('data:') && !src?.endsWith('.svg'));
    console.log(images);
}

async function downloadImages(images: string[]) {
    for (const url of images) {
        const res = await fetch(url);
        const path = createDirStructure(new URL(url));
        const fileStream = fs.createWriteStream(path);
        await new Promise((resolve, reject) => {
            res.body?.pipe(fileStream);
            res.body?.on("error", reject);
            fileStream.on("finish", resolve);
        });
    }
}


async function optimiseImage(filePath: string) {
    const data = await sharp(filePath)
        .jpeg({ mozjpeg: true })
        .toBuffer();
    fs.writeFileSync(process.cwd() + '/images/i.jpg', data);
}

function createDirStructure(url: URL): string {
    // Add base dir & remove filename from the end of the pathname
    const dir = baseDir + url.pathname.substring(0, url.pathname.lastIndexOf('/'));
    if(fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
}

const testURL = new URL('https://www.jaladesign.com.au/wp-content/uploads/2016/06/banner1_opt.jpg');;
const pageHTML = await getPageHTML(testURL);
await getImagesFromPageHTML(pageHTML);