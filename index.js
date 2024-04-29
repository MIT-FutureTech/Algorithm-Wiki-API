// init express server
import 'dotenv/config'
import express from 'express';
import Database from 'better-sqlite3';
import migration from './migration.js';
import cors from 'cors';

const db = new Database('algowiki.db', {
});
db.pragma('journal_mode = WAL');

function runMigration() {
    migration(db).finally(() => {
        setTimeout(() => {
            runMigration();
        }, 
        60000);
    })
}

runMigration();






const app = express();

app.use(cors({
    origin: '*'
}));

app.get('/', (req, res) => {
    // search by domain, problem, variation or algorithm name case insensitive
    const search = req.query.search;
    const limit = req.query.limit || 10;
    const offset = req.query.offset || 0;

    if (!search) {
        res.header('type', 'application/json');
        res.json({});
        return;
    }

    const sql = `
        SELECT *, rank, ROWID from search_fts 
        WHERE search_fts MATCH $search
        ORDER BY  ROWID ASC, rank DESC
        LIMIT $limit
        OFFSET $offset
    `;
    const result = db.prepare(sql).all({
        search: search + '*',
        limit: limit,
        offset: offset
    });

    // group domain > family > variation > algorithm
    const grouped = result.reduce((acc, curr) => {
        const domain = curr.domain;
        const family = curr.family;
        const variation = curr.variation;
        const algorithm = curr.algorithm;

        if (algorithm) {
            if (!acc["algorithms"]) acc["algorithms"] = [];
            acc["algorithms"].push(curr);
            return acc;
        }

        if (variation) {
            if (!acc["variations"]) acc["variations"] = [];
            acc["variations"].push(curr);
            return acc;
        }

        if (family) {
            if (!acc["families"]) acc["families"] = [];
            acc["families"].push(curr);
            return acc;
        }

        if (domain) {
            if (!acc["domains"]) acc["domains"] = [];
            acc["domains"].push(curr);
            return acc;
        }

        if (!acc["others"]) acc["others"] = [];
        acc["others"].push(curr);
    }, {});





    res.header('type', 'application/json');
    res.json(grouped);

});

app.get('/stats', (req, res) => {
    const sql = `
    SELECT COUNT(DISTINCT domain) as domains, COUNT(DISTINCT family) as families, COUNT(DISTINCT variation) as variations from problems
    `;
    const sql2 = `
    SELECT COUNT(*) as algorithms from algorithms;
    `;
    const result = db.prepare(sql).get();
    const result2 = db.prepare(sql2).get();
    res.header('type', 'application/json');
    res.json({ ...result, ...result2 });

});

app.get('/glossary', (req, res) => {
    const sql = `
    SELECT * from glossary
    `;
    const result = db.prepare(sql).all();
    res.header('type', 'application/json');
    res.json(result);

});

app.get('/health', (req, res) => {
    const lastUpdated = db.prepare('SELECT * from metaInformation').get().datetime;

    res.header('type', 'application/json');
    res.json({
        status: 'ok',
        lastUpdated: lastUpdated
    });
});

import domains from './routes/domains.js';
import families from './routes/families.js';
import variations from './routes/variations.js';
import algorithms from './routes/algorithms.js';
import reductions from './routes/reductions.js';

app.use('/domains', domains(db));
app.use('/families', families(db));
app.use('/variations', variations(db));
app.use('/algorithms', algorithms(db));
app.use('/reductions', reductions(db));



app.listen(3001, () => {
    console.log('Server is running on port 3001');
}
);
