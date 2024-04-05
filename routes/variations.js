import { Router } from 'express';

export default function (db) {
    const router = Router();

    router.get('/', (req, res) => {
        const { domain, family } = req.query;

        let sqlBase = `
            SELECT 
                p.id,
                p.domain, 
                p.domainSlug,
                p.family, 
                p.familySlug,
                p.variation, 
                p.variationSlug,
                p.parentId,
                COUNT(a.problemId) AS algorithms
            FROM 
                problems p
            LEFT JOIN 
                algorithms a ON p.id = a.problemId
        `;
        let whereConditions = [];
        if (domain) {
            whereConditions.push('p.domainSlug = :domainSlug');
        }
        if (family) {
            whereConditions.push('p.familySlug = :familySlug');
        }
        
        let whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        
        let sql = `
            ${sqlBase}
            ${whereClause}
            GROUP BY 
                p.variation, p.variationSlug
            ORDER BY 
                algorithms DESC
        `;
        

        const limit = req.query.limit;
        if (limit) {
            sql += ` LIMIT $limit`;
        }
        const result = db.prepare(sql).all({
            familySlug: family,
            domainSlug: domain,
            limit: limit
        });

        // Send the result as JSON
        res.header('Content-Type', 'application/json');
        console.log(result)

        res.json(result);
    });

    router.get('/:slug', (req, res) => {
        const slug = req.params.slug;
        const { domain, family } = req.query;

        let sql = `
            SELECT * FROM problems 
            WHERE variationSlug = $slug AND domainSlug = $domainSlug AND familySlug = $familySlug
        `;


        // Execute the SQL query
        let result = db.prepare(sql).get({
            slug: slug,
            domainSlug: domain,
            familySlug: family
        });

        if (result) {
            sql = `
                SELECT 
                p.id,
                    p.domainSlug,
                    p.familySlug,
                    p.variation, 
                    p.variationSlug,
                    p.parentId
                FROM problems p
                WHERE 
                    p.domainSlug = $domainSlug 
                    AND p.familySlug = $familySlug`
                    

            console.log(sql)

            const variations = db.prepare(sql).all({
                domainSlug: result.domainSlug,
                familySlug: result.familySlug,
            });
            result.related = variations;
           
        }


        res.header('Content-Type', 'application/json');
        res.json(result);
    });

    return router;
}
