const http = require('http');
const https = require('https');
const fs = require('fs');
const FormData = require('form-data');

const appwriteEndpoint = 'https://appwrite.springhive.co/v1';
const appwriteProjectId = '69c4840a0022d6824d83';
const appwriteApiKey = 'standard_b650468f4a776eac08a7d0f31aea79b5de528e970e85714564a8d0480a9cffc6d0c947aaeaecc2a2011b98c97f90515cbf5f9e16d3cd6230d259d1e91d885a1de14d5c1cb20da10930d49bcc3f3cb7d3f4a5011619cba4e42d533abefbc60435de9ab782c82e59704a44ea08b88f9babd5a6edb83fb50e2bc6f4cb33e1069b6c';

async function testUpload() {
    try {
        fs.writeFileSync('temp.jpg', 'fake image content');
        
        const form = new FormData();
        form.append('fileId', 'unique');
        form.append('file', fs.createReadStream('temp.jpg'));
        
        const res = await fetch(`${appwriteEndpoint}/storage/buckets/customer_images/files`, {
            method: 'POST',
            headers: {
                'X-Appwrite-Project': appwriteProjectId,
                'X-Appwrite-Key': appwriteApiKey,
            },
            body: form
        });
        
        const data = await res.json();
        console.log('Upload Result:', data);
        
        fs.unlinkSync('temp.jpg');
    } catch(e) {
        console.error('Error:', e);
    }
}

testUpload();
