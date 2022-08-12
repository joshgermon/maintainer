import { load } from "cheerio";
import sharp from 'sharp';
import fs from 'fs';
import { Writable } from 'stream';

const baseDir = process.cwd() + '/test';

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
    let imagePaths: string[] = [];
    for (const image of images) {
        const url = new URL(image);
        const res = await fetch(url);
        const path = createDirStructure(new URL(url));
        const fileStream = fs.createWriteStream(path);
        const writeStream = Writable.toWeb(fileStream);
        await res.body?.pipeTo(writeStream);
        imagePaths.push(path);
    }
    return imagePaths;
}

async function optimiseImages(images: string[]) {
    for(const image of images) {
        if(image.match(/^.*\.(jpg|JPG|jpeg)$/g)) {
            await optimiseJpeg(image);
            continue;
        }
        if(image.match(/^.*\.(png|PNG)$/g)) {
            await optimisePng(image);
            continue;
        }
    }
}

async function optimiseJpeg(filePath: string) {
    const data = await sharp(filePath)
        .jpeg({ mozjpeg: true })
        .toBuffer();
    fs.writeFileSync(filePath + '_optimised.jpg', data);
}
async function optimisePng(filePath: string) {
    const data = await sharp(filePath)
        .png()
        .toBuffer();
    fs.writeFileSync(filePath + '_optimised.png', data);
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

export async function optimisePageImages() {
    const testURL = new URL('https://www.biennaleofsydney.art/');;
    const pageHTML = await getPageHTML(testURL);
    const images = await getImagesFromPageHTML(pageHTML);
    const imagePaths = await downloadImages(images);
    await optimiseImages(imagePaths);
}

await optimisePageImages();