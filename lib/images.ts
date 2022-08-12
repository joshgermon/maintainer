import { load } from "cheerio";
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { Writable } from 'stream';

const baseDir = process.cwd() + '/test-images';

interface LocalImage {
    path: string,
    size: number,
    ext: string,
    optimisedSize?: number
}

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

async function optimiseImages(images: LocalImage[]) {
    for(const image of images) {
        if(image.ext === '.jpg' || image.ext === '.jpg') {
            await optimiseJpg(image.path);
        }
        if(image.ext === '.png') {
            await optimisePng(image.path);
        }
    }
}

async function optimiseJpg(filePath: string) {
    const data = await sharp(filePath)
        .jpeg({ mozjpeg: true })
        .toBuffer();
    fs.writeFileSync(filePath, data);
}
async function optimisePng(filePath: string) {
    const data = await sharp(filePath)
        .png()
        .toBuffer();
    fs.writeFileSync(filePath, data);
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

function getFileSize(filePath: string) {
    return fs.statSync(filePath).size;
}

export async function optimisePageImages() {
    const testURL = new URL('https://www.biennaleofsydney.art/');;
    const pageHTML = await getPageHTML(testURL);
    const images = await getImagesFromPageHTML(pageHTML);
    const imageDownloadPaths = await downloadImages(images);
    const localImages = imageDownloadPaths.map((filePath) : LocalImage => ({
        path: filePath,
        size: getFileSize(filePath),
        ext: path.extname(filePath)
    }));
    await optimiseImages(localImages);
    localImages.forEach((image) => { image.optimisedSize = getFileSize(image.path)});
    console.log(localImages);
}

await optimisePageImages();