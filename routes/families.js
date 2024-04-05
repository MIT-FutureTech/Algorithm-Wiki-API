import { Router } from 'express';

export default function (db) {
    const router = Router();

    router.get('/', (req, res) => {
        const domain = req.query.domain;
        // Base part of the SQL query
        let sql = `
        SELECT 
            p.domain, 
            p.domainSlug,
            p.family, 
            p.familySlug,
            COUNT(a.problemId) AS algorithms
        FROM 
            problems p
        LEFT JOIN 
            algorithms a ON p.id = a.problemId 
            ${domain ? 'WHERE p.domainSlug = $domainSlug' : ''}
        GROUP BY 
            p.family, p.familySlug
            ORDER BY algorithms DESC
        `;

        const limit = req.query.limit;
        if (limit) {
            sql += ` LIMIT $limit`;
        }

        const result = db.prepare(sql).all({
            domainSlug: domain,
            limit: limit
        });

        // Send the result as JSON
        res.header('Content-Type', 'application/json');
        res.json(result);
    });

    router.get('/:slug', (req, res) => {
        const slug = req.params.slug;
        const domain = req.query.domain;

        let sql = `
            SELECT * FROM problems 
            WHERE familySlug = $slug AND domainSlug = $domainSlug
        `;

        // Execute the SQL query
        const result = db.prepare(sql).get({
            slug: slug,
            domainSlug: domain
        });

        res.header('Content-Type', 'application/json');
        res.json(result);
    });

    return router;
}
