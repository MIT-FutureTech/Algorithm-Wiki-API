import { Router } from 'express';

export default function (db) {
    const router = Router();

    router.get('/', (req, res) => {
        const { domain, family, variation } = req.query;

        let sqlBase = `
            SELECT 
                *
            FROM 
                algorithms a
            LEFT JOIN 
                problems p ON p.id = a.problemId
        `;
        
        let whereConditions = [];
        if (domain) {
            whereConditions.push('p.domainSlug = $domainSlug');
        }
        if (family) {
            whereConditions.push('p.familySlug = $familySlug');
        }

        if (variation) {
            whereConditions.push('p.variationSlug = $variationSlug');
        }
        
        let whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        
        let sql = `
            ${sqlBase}
            ${whereClause}
        `;
        

        const limit = req.query.limit;
        if (limit) {
            sql += ` LIMIT $limit`;
        }
        const result = db.prepare(sql).all({
            familySlug: family,
            domainSlug: domain,
            variationSlug: variation,
            limit: limit
        });

        // Send the result as JSON
        res.header('Content-Type', 'application/json');
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

        // get children
        if (result) {
            let sql = `
                SELECT 
                    p.domainSlug,
                    p.familySlug,
                    p.variation, 
                    p.variationSlug,
                    p.id
                FROM problems p
                WHERE p.parentId = $problemId 
            `;
            const children = db.prepare(sql).all({
                problemId: result.id
            });
            result.children = children;
            if(result.parentId) {
                sql = `
                    SELECT 

                        p.domainSlug,
                        p.familySlug,
                        p.variation, 
                        p.variationSlug
                    FROM problems p
                    WHERE p.id = $parentId
                `;
                const parent = db.prepare(sql).get({
                    parentId: result.parentId
                });
                result.parent = parent;
            }

            // get variations from same family that are not the same as the current variation and are not in children or parent
            sql = `
                SELECT 
                    p.domainSlug,
                    p.familySlug,
                    p.variation, 
                    p.variationSlug
                FROM problems p
                WHERE 
                    p.domainSlug = $domainSlug 
                    AND p.familySlug = $familySlug 
                    AND p.variationSlug != $variationSlug 
                    AND p.id != $problemId 
                    AND p.id NOT IN (${children.map(c => c.id).join(',')}) 
                    ${result.parentId ? `AND p.id != ${result.parentId}` : ''}
                        `;


            const variations = db.prepare(sql).all({
                domainSlug: result.domainSlug,
                familySlug: result.familySlug,
                variationSlug: result.variationSlug,
                problemId: result.id,
                parentId: result.parentId
            });
            result.related = variations;
           
        }


        res.header('Content-Type', 'application/json');
        res.json(result);
    });

    return router;
}
