import express from "express";
import db from "./db.js";
import client from "./redis-client.js";

// await client.del("counter")

if (!(await client.exists("counter"))) {
    await client.set("counter", 134537)
}

const app = express();
app.use(express.json());
app.use(express.static("public"));

let arr = []

for (let i = 0; i < 10; i++) {
    arr.push(i.toString())
}
for (let i = 97; i <= 122; i++) {
    arr.push(String.fromCharCode(i))
}
for (let i = 65; i <= 90; i++) {
    arr.push(String.fromCharCode(i))
}

const urlStore = async () => {

    let a = Number(await client.get("counter"))
    await client.set("counter", a + 1)
    // console.log(a)
    let ans = ""
    while (a > 0) {
        ans += arr[a % 62]
        a /= 62
        a = Math.floor(a)
    }
    return ans
}

app.get((req, res) => {
    res.sendFile('./index.html')
})

app.post('/shorten', async (req, res) => {
    const { url } = req.body;
    if (!url) {
        return res.status(400).json({ message: 'URL is required.' });
    }
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            throw new Error('Invalid protocol');
        }
    } catch {
        return res.status(400).json({ message: 'Please provide a valid http/https URL.' });
    }
    const shortCode = await urlStore()
    const baseUrl = `${req.protocol}://localhost:3000`;
    const shortUrl = `${baseUrl}/r/${shortCode}`;
    await db.query("INSERT INTO urls (short_url, long_url) VALUES ($1, $2)", [shortCode, url]);
    return res.status(201).json({ shortUrl });
});

app.get('/r/:shortCode', async (req, res) => {
    const { shortCode } = req.params;
    const longUrl = await db.query("SELECT long_url FROM urls WHERE short_url = $1", [shortCode]);
    if (!longUrl.rows[0]) {
        return res.status(404).send('URL not found');
    }
    res.redirect(longUrl.rows[0].long_url);
    // await db.query("UPDATE urls SET count = count + 1 WHERE short_url = $1", [shortCode]);
});

app.listen(3000, () => {
    console.log("Server started on port 3000");
});