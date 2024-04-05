import { Router } from 'express';

export default function (db) {
    const router = Router();

    router.get('/', (req, res) => {
        const { domain, family, variation } = req.query;

        let sqlBase = `
            SELECT 
                *,
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

    return router;
}
