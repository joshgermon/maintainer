import { load } from "cheerio";
import sharp from 'sharp';
import fs from 'fs';
import { Writable } from 'stream';

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
        .filter((src: string | undefined): src is string => src?.match(/^.*\.(jpg|JPG|jpeg|png|PNG)$/g) !== null);
    console.log(images);
    return images;
}

async function downloadImages(images: Array<string>) {
    for (const image of images) {
        const url = new URL(image);
        const res = await fetch(url);
        const path = createDirStructure(new URL(url));
        const fileStream = fs.createWriteStream(path);
        const writeStream = Writable.toWeb(fileStream);
        await res.body?.pipeTo(writeStream);
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
    if(!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    // return full file path
    return baseDir + url.pathname;
}

const testURL = new URL('https://www.jaladesign.com.au/');;
const pageHTML = await getPageHTML(testURL);
const images = await getImagesFromPageHTML(pageHTML);
await downloadImages(images);