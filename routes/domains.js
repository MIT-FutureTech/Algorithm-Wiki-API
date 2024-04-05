import { Router } from 'express';

export default function (db) {
    const router = Router();

    router.get('/', (req, res) => {
        // Base part of the SQL query
        let sql = `
            SELECT 
                p.domain, 
                p.domainSlug,
                COUNT(a.problemId) AS algorithms
            FROM 
                problems p
            LEFT JOIN 
                algorithms a ON p.id = a.problemId
            GROUP BY 
                p.domain, p.domainSlug
            ORDER BY 
                algorithms DESC
        `;

        // Check for a limit parameter
        const limit = req.query.limit;
        if (limit) {
            sql += ` LIMIT $limit`;
        }

        // Execute the query
        const result = db.prepare(sql).all({
            limit: limit
        });

        // Send the result as JSON
        res.header('Content-Type', 'application/json');
        res.json(result);
    });

    router.get('/:slug', (req, res) => {
        const slug = req.params.slug;

        let sql = `
            SELECT * FROM problems 
            WHERE domainSlug = $slug
        `;

        // Execute the SQL query
        const result = db.prepare(sql).get({
            slug: slug
        });

        res.header('Content-Type', 'application/json');
        res.json(result);
    });

    return router;
}
