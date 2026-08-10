import express from "express";
import db from "./db.js";
import client from "./redis-client.js";
import { rateLimit } from 'express-rate-limit'

const app = express();
app.use(express.json());
app.use(express.static("public"));


const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
    standardHeaders: 'draft-8', // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
    ipv6Subnet: 56, // Set to 60 or 64 to be less aggressive, or 52 or 48 to be more aggressive
    // store: ... , // Redis, Memcached, etc. See below.
})

// Apply the rate limiting middleware to all requests.
app.use(limiter)

if (!(await client.exists("counter"))) {
    await client.set("counter", 134537)
}

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

    const a = Number(await client.incr("counter"));
    // await client.set("counter", a + 1)
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
    try {
        await db.query("INSERT INTO urls (short_url, long_url) VALUES ($1, $2)", [shortCode, url]);
    }
    catch (err) {
        return res.status(500).json({ message: err.message || "Server error" })
    }
    return res.status(201).json({ shortUrl });
});

app.get('/r/:shortCode', async (req, res) => {
    const { shortCode } = req.params;
    try {
        const longUrl = await db.query("SELECT long_url FROM urls WHERE short_url = $1", [shortCode]);
        if (!longUrl.rows[0]) {
            return res.status(404).send('URL not found');
        }
        res.redirect(longUrl.rows[0].long_url);
    }
    catch (err) {
        return res.status(500).json({ message: err.message || "Server error" })
    }

    // await db.query("UPDATE urls SET count = count + 1 WHERE short_url = $1", [shortCode]);
});

app.listen(3000, () => {
    console.log("Server started on port 3000");
});