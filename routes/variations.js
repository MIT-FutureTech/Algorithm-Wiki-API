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
                p.problemProperties,
                p.familyProperties,
                p.shortDescription,

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
                    


            const variations = db.prepare(sql).all({
                domainSlug: result.domainSlug,
                familySlug: result.familySlug,
            });
            result.related = variations;

            // get reductions
            sql = `
                SELECT 
                    r.*,
                    p.domainSlug as fromDomainSlug,
                    p.domain as fromDomain,
                    p.familySlug as fromFamilySlug,
                    p.family as fromFamily,
                    p.variation as fromVariation,
                    p.variationSlug as fromVariationSlug,
                    p2.domainSlug as toDomainSlug,
                    p2.domain as toDomain,
                    p2.familySlug as toFamilySlug,
                    p2.family as toFamily,
                    p2.variation as toVariation,
                    p2.variationSlug as toVariationSlug
                FROM 
                    reductions r
                JOIN
                    problems p ON p.id = r.fromProblemId
                JOIN
                    problems p2 ON p2.id = r.toProblemId
                WHERE
                    p.id = $problemId
                    OR p2.id = $problemId
            `;

            const reductions = db.prepare(sql).all({
                problemId: result.id
            });

            result.reductions = reductions;
           
        }

        


        res.header('Content-Type', 'application/json');
        res.json(result);
    });

    return router;
}
