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

    let a = Number(await client.incr("counter"));
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

app.get('/', (req, res) => {
    res.sendFile('public/index.html', { root: '.' });
});

app.get('/api', (req, res) => {
    res.sendFile('public/api.html', { root: '.' });
});

app.get('/api/stats', async (req, res) => {
    try {
        const counter = await client.get("counter");
        return res.status(200).json({
            linksShortened: Number(counter) - 134537,
            uptime: "99.9%",
            responseTime: "<100ms"
        });
    } catch (err) {
        return res.status(200).json({
            linksShortened: 0,
            uptime: "99.9%",
            responseTime: "<100ms"
        });
    }
});

app.post('/shorten', async (req, res) => {
    let { url, expiresIn } = req.body;
    // console.log(req.headers)
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
    // console.log(expiresIn)
    // expiresIn = 10

    let shortCode = await urlStore();
    const baseUrl = req.headers.origin || `${req.protocol}://${req.get('host')}`;
    const shortUrl = `${baseUrl}/r/${shortCode}`;
    const date = new Date();
    try {
        await client.set(`url:${shortCode}`, url, { EX: Math.min(60 * 60 * 4, expiresIn || 5000000) });
        await db.query("INSERT INTO urls (short_url, long_url, expires_at) VALUES ($1, $2, $3)", [shortCode, url, expiresIn ? new Date(date.getTime() + expiresIn) : null]);
    } catch (err) {
        console.log(err)
        return res.status(500).json({ message: err.message || "Server error" });
    }

    return res.status(201).json({ shortUrl });
});

app.get('/r/:shortCode', async (req, res) => {
    const { shortCode } = req.params;
    try {
        // Check Redis first (for expiring URLs)
        const redisUrl = await client.get(`url:${shortCode}`);
        if (redisUrl) {
            return res.redirect(redisUrl);
        }

        // Fall back to Postgres (for permanent URLs)
        const longUrl = await db.query("SELECT long_url, expires_at FROM urls WHERE short_url = $1", [shortCode]);
        if (!longUrl.rows[0]) {
            return res.status(404).send('URL not found or has expired');
        }
        console.log(new Date() > longUrl.rows[0].expires_at)
        if (longUrl.rows[0].expires_at && new Date() > longUrl.rows[0].expires_at) {
            return res.status(404).send('URL has expired');
        }
        res.redirect(longUrl.rows[0].long_url);
    }
    catch (err) {
        return res.status(500).json({ message: err.message || "Server error" });
    }

    // await db.query("UPDATE urls SET count = count + 1 WHERE short_url = $1", [shortCode]);
});

app.listen(3000, () => {
    console.log("Server started on port 3000");
});