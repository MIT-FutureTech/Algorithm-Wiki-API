import fs from 'fs';
import Database from 'better-sqlite3';
import getSheet from './getSheet.js';

const algorithmColumnsKeys = {
    "Algorithm Name": "name",
    "exact": "exactAlgorithm",
    "Span Encoding (T_1)": "spanEncoding",
    "Work Encoding (T_inf)": "workEncoding",
    "Reference mentions work efficiency?": "workEfficiencyReference",
    "Type of Randomized Algorithm (e.g. Las Vegas, Monte Carlo, Atlantic City)": "typeOfRandomizedAlgorithm",
    "Approximation Factor (if approximate algorithm)": "approximationFactor",
    "# of\nProcessors": "numberOfProcessors",
    "# of Proc Encoding": "numberOfProcessorsEncoding",
}

export default async function (db) {
    // const db = new Database('algowiki-temp.db', {});
    // db.pragma('journal_mode = WAL');

    const [
        problemsSheet,
        sheet1,
        newEntriesToSheet1,
        parallelAlgos,
        assumptionsHypotheses,
        reductionsSheet,
        problemFamilies,
        glossary,
        domainSheet,
    ] = await Promise.all([
        getSheet('Problems'),
        getSheet('Sheet1'),
        getSheet('New Entries to Sheet 1'),
        getSheet('Parallel Algos'),
        getSheet('Assumptions/Hypotheses'),
        getSheet('Reductions'),
        getSheet('Problem Families'),
        getSheet('Glossary'),
        getSheet('Domains'),
    ])

function createTables(){
    // problems table
    db.prepare(`
        CREATE TABLE IF NOT EXISTS problems (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            domain TEXT,
            family TEXT NOT NULL,
            variation TEXT NOT NULL,
            domainSlug TEXT,
            familySlug TEXT NOT NULL,
            variationSlug TEXT NOT NULL,
            description TEXT,
            problemProperties TEXT,
            shortDescription TEXT,
            familyProperties TEXT,
            familyDescription TEXT,
            domainDescription TEXT,
            alias TEXT,
            aliasSlug TEXT,
            parentId INTEGER,
            descriptionReference TEXT,
            parameters TEXT,
            parameterForGraphs TEXT,
            inputSize TEXT,
            outputSize TEXT,
            bestKnownUpperBound TEXT,	
            upperBoundReference TEXT,
            bestKnownLowerBound TEXT,	
            lowerBoundReference TEXT,
            numberOfAlgorithms INTEGER,
            numberOfVariations INTEGER,
            numberOfFamilies INTEGER,
            FOREIGN KEY (parentId) REFERENCES problems(id)
        )
    `).run();
    // algorithms table
    db.prepare(`
    CREATE TABLE IF NOT EXISTS algorithms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        problemId INTEGER NOT NULL,
        algorithmDescription TEXT, 
        finalCall TEXT, 
        exactProblemStatement TEXT, 
        exactAlgorithm TEXT, 
        timeComplexityAverage TEXT, 
        averageCaseDistribution TEXT, 
        reference TEXT, 
        year INTEGER, 
        paperReferenceLink TEXT, 
        constants TEXT, 
        derived TEXT, 
        paperReferenceForConstants TEXT, 
        timeComplexityImprovement TEXT, 
        transitionClass TEXT, 
        timeComplexityClass TEXT, 
        paramTimeClass TEXT, 
        timeComplexityWorstOnly TEXT, 
        parallelAlgorithmSpanDepth TEXT, 
        spanEncoding TEXT, 
        parallelAlgorithmSpanReferences TEXT, 
        parallelAlgorithmWork TEXT, 
        workEncoding TEXT, 
        parallelAlgorithmWorkReferences TEXT, 
        workEfficiencyReference TEXT, 
        parameterDefinitions TEXT, 
        preferredParameter TEXT, 
        timeComplexityReference TEXT, 
        derivedTimeComplexity TEXT, 
        computationalModel TEXT, 
        modelEncoding TEXT, 
        unitOfSpace TEXT, 
        spaceComplexityClass TEXT, 
        paramSpaceClass TEXT, 
        spaceComplexityAuxiliary TEXT, 
        spaceComplexityReference TEXT, 
        derivedSpaceComplexity TEXT, 
        spaceComplexityInOriginalPaper TEXT, 
        interestingSpaceComplexity TEXT, 
        randomized TEXT, 
        typeOfRandomizedAlgorithm TEXT, 
        approximate TEXT, 
        approximationFactor TEXT, 
        heuristicBased TEXT, 
        parallel TEXT, 
        numberOfProcessors INTEGER, 
        numberOfProcessorsEncoding TEXT, 
        quantum TEXT, 
        gpuBased TEXT, 
        otherReferences TEXT, 
        problemStatement TEXT, 
        title TEXT, 
        authors TEXT, 
        notes TEXT,
        reviewed TEXT,
        FOREIGN KEY (problemId) REFERENCES problems(id)
    )
`).run();
    // reductions table
    db.prepare(`
    CREATE TABLE IF NOT EXISTS reductions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fromProblemId INTEGER NOT NULL,
        toProblemId INTEGER NOT NULL,
        type TEXT,
        randomized TEXT,
        calls TEXT,
        timeComplexity TEXT,
        spaceComplexity TEXT,
        model TEXT,
        assumptionHypothesis TEXT,
        implications TEXT,
        impliedLowerBoundPower TEXT,
        reductionReferences TEXT,
        link TEXT,
        year TEXT,
        preserves TEXT,
        notes TEXT,
        reductionId TEXT,
        description TEXT,
        FOREIGN KEY (fromProblemId) REFERENCES problems(id),
        FOREIGN KEY (toProblemId) REFERENCES problems(id)
    )
`).run();
    // hypothesis table
    db.prepare(`
    CREATE TABLE IF NOT EXISTS hypothesis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        targetProblemId INTEGER NOT NULL,
        name TEXT,
        alias TEXT,
        hypothesisId TEXT,
        description TEXT,
        time TEXT,
        space TEXT,
        computationModel TEXT,
        constants TEXT,
        implies TEXT,
        impliedBy TEXT,
        proven TEXT,
        impliesReferences TEXT,
        impliedByReferences TEXT,
        reference TEXT,
        year TEXT,
        notes TEXT
    )
`).run();
    // glossary table
    db.prepare(`
    CREATE TABLE IF NOT EXISTS glossary (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        term TEXT,
        definition TEXT,
        category TEXT
    )
`).run();
}


    function slugfy(text) {
        if (!text) return ''
        // slugify a string to be used as an id, string can contain special caracteres and spaces. only allow a-z, 0-9 and - and ' 
        return text.toLowerCase().replace(/[^a-z0-9-']/g, '-').replace(/-+/g, '-')

    }



    async function populateProblems() {
        const problems = JSON.parse(JSON.stringify(problemsSheet));
        const families = JSON.parse(JSON.stringify(problemFamilies));
        const domains = JSON.parse(JSON.stringify(domainSheet));

        for (const problem of problems) {
            problem.family = problem.familyName;

            if (!problem.family) continue;

            problem.description = problem.problemDescription;
            problem.shortDescription = problem.abridgedProblemDescription;
            problem.domainSlug = slugfy(problem.domain);
            problem.familySlug = slugfy(problem.family);
            problem.variationSlug = slugfy(problem.variation);

            const domain = domains.find(d => problem.domainSlug === slugfy(d.domainName));
            if (domain) {
                problem.domainDescription = domain.domainDescription;
            } else {
                problem.domainDescription = '';
            }

            const family = families.find(f => problem.familySlug === slugfy(f.familyName));
            if (family) {
                problem.familyProperties = family.familyProperties;
                problem.familyDescription = family.familyDescription;
            } else {
                problem.familyProperties = '';
                problem.familyDescription = '';
            }

            problem.aliasSlug = problem.alias.split(';').map(alias =>
                slugfy(alias.trim())
            ).join(';');


            db.prepare(`
            INSERT INTO problems (
                domain,
                family,
                variation,
                domainSlug,
                familySlug,
                variationSlug,
                description,
                alias,
                aliasSlug,
                descriptionReference,
                parameters,
                parameterForGraphs,
                inputSize,
                outputSize,
                bestKnownUpperBound,
                upperBoundReference,
                bestKnownLowerBound,
                lowerBoundReference,
                problemProperties,
                shortDescription,
                familyProperties,
                familyDescription,
                domainDescription
            ) VALUES (
                $domain,
                $family,
                $variation,
                $domainSlug,
                $familySlug,
                $variationSlug,
                $description,
                $alias,
                $aliasSlug,
                $descriptionReference,
                $parameters,
                $parameterForGraphs,
                $inputSize,
                $outputSize,
                $bestKnownUpperBound,
                $upperBoundReference,
                $bestKnownLowerBound,
                $lowerBoundReference,
                $problemProperties,
                $shortDescription,
                $familyProperties,
                $familyDescription,
                $domainDescription
            )
        `).run(problem);
        }

    }

    function fillEmptyDomains() {
        // get all problems with empty domain
        const problems = db.prepare(`SELECT * FROM problems WHERE domain = '' OR domain is NULL`).all();
        // try to find the domain from other problem with the same family
        for (const problem of problems) {
            const domain = db.prepare(`SELECT domain, domainDescription FROM problems WHERE family = $family AND domain != '' AND domain IS NOT NULL LIMIT 1`).get(problem);
            if (domain && domain.domain) {
                db.prepare(`UPDATE problems SET domain = $domain, domainSlug = $domainSlug, domainDescription = $domainDescription WHERE id = $id`
                ).run({ ...problem, domain: domain.domain, domainSlug: slugfy(domain.domain), domainDescription: domain.domainDescription });
            } else {
                db.prepare(`UPDATE problems SET domain = $domain, domainSlug = $domainSlug WHERE id = $id`).run({ ...problem, domain: 'Others', domainSlug: slugfy('Others') });
            }
        }


    }

    function fillParentProblem() {
        const problems = JSON.parse(JSON.stringify(problemsSheet));
        for (const problem of problems) {
            problem.family = problem.familyName;
            if (!problem.parents) continue;
            problem.parents = slugfy(problem.parents);
            const parent = db.prepare(`SELECT id FROM problems WHERE variationSlug = $parent OR 
            (
                aliasSlug LIKE $parent1 
                OR aliasSlug LIKE $parent2 
                OR aliasSlug LIKE $parent3 
                OR aliasSlug LIKE $parent
            ) LIMIT 1`).get({
                parent: problem.parents,
                parent1: `${problem.parents};%`,
                parent2: `%;${problem.parents}%`,
                parent3: `%;${problem.parents}`,

            });
            if (parent) {
                db.prepare(`UPDATE problems SET parentId = $parentId WHERE id = (
                SELECT id FROM problems WHERE family = $family AND variation = $variation
            )`).run({ ...problem, parentId: parent.id });
            }
        }

    }

    function populateAlgorithms() {
        // delete reportAlgorithmsNotFound.csv if exists
        if (fs.existsSync('reportAlgorithmsNotFound.csv')) {
            fs.unlinkSync('reportAlgorithmsNotFound.csv');
        }


        const notFound = []
        const algorithms = JSON.parse(JSON.stringify(sheet1))
            .concat(JSON.parse(JSON.stringify(newEntriesToSheet1)))
            .concat(JSON.parse(JSON.stringify(parallelAlgos)).map(a => {
                a.parallel = '1';
                return a;
            }))
        for (const algorithm of algorithms.filter(a => a.familyName)) {
            algorithm.oldVariation = algorithm.variation;
            if (!algorithm.variation) algorithm.variation = algorithm.familyName;
            const variations = algorithm.variation.split(';').map(v => slugfy(v.trim()));

            for (const algorithmVariation of variations) {
                algorithm.problemId = db.prepare(`SELECT id FROM problems WHERE familySlug = $family AND (
                    variationSlug = $variation
                    OR aliasSlug LIKE $variation1
                    OR aliasSlug LIKE $variation2
                    OR aliasSlug LIKE $variation3
                    OR aliasSlug LIKE $variation
                    ) LIMIT 1`).get({
                    family: slugfy(algorithm.familyName),
                    variation: slugfy(algorithmVariation),
                    variation1: `${slugfy(algorithmVariation)};%`,
                    variation2: `%;${slugfy(algorithmVariation)};%`,
                    variation3: `%;${slugfy(algorithmVariation)}`,
                })?.id;

                if (!algorithm.problemId) {
                    notFound.push({ family: algorithm.familyName, variation: algorithm.oldVariation, algorithm: algorithm.name });
                    continue
                };
                const template = {
                    name: '',
                    problemId: '',
                    algorithmDescription: '',
                    finalCall: '',
                    exactProblemStatement: '',
                    exactAlgorithm: '',
                    timeComplexityAverage: '',
                    averageCaseDistribution: '',
                    reference: '',
                    year: '',
                    paperReferenceLink: '',
                    constants: '',
                    derived: '',
                    paperReferenceForConstants: '',
                    timeComplexityImprovement: '',
                    transitionClass: '',
                    timeComplexityClass: '',
                    paramTimeClass: '',
                    timeComplexityWorstOnly: '',
                    parallelAlgorithmSpanDepth: '',
                    spanEncoding: '',
                    parallelAlgorithmSpanReferences: '',
                    parallelAlgorithmWork: '',
                    workEncoding: '',
                    parallelAlgorithmWorkReferences: '',
                    workEfficiencyReference: '',
                    parameterDefinitions: '',
                    preferredParameter: '',
                    timeComplexityReference: '',
                    derivedTimeComplexity: '',
                    computationalModel: '',
                    modelEncoding: '',
                    unitOfSpace: '',
                    spaceComplexityClass: '',
                    paramSpaceClass: '',
                    spaceComplexityAuxiliary: '',
                    spaceComplexityReference: '',
                    derivedSpaceComplexity: '',
                    spaceComplexityInOriginalPaper: '',
                    interestingSpaceComplexity: '',
                    randomized: '',
                    typeOfRandomizedAlgorithm: '',
                    approximate: '',
                    approximationFactor: '',
                    heuristicBased: '',
                    parallel: '',
                    numberOfProcessors: '',
                    numberOfProcessorsEncoding: '',
                    quantum: '',
                    gpuBased: '',
                    otherReferences: '',
                    problemStatement: '',
                    title: '',
                    authors: '',
                    notes: '',
                    reviewed: ''
                }

                const algorithmData = {
                    ...template,
                    // convert everything to string
                    ...Object.fromEntries(Object.entries(algorithm).map(([key, value]) => [key, value?.toString()]))
                };


                db.prepare(`
                INSERT INTO algorithms (
                    name,
                    problemId,
                    algorithmDescription,
                    finalCall,
                    exactProblemStatement,
                    exactAlgorithm,
                    timeComplexityAverage,
                    averageCaseDistribution,
                    reference,
                    year,
                    paperReferenceLink,
                    constants,
                    derived,
                    paperReferenceForConstants,
                    timeComplexityImprovement,
                    transitionClass,
                    timeComplexityClass,
                    paramTimeClass,
                    timeComplexityWorstOnly,
                    parallelAlgorithmSpanDepth,
                    spanEncoding,
                    parallelAlgorithmSpanReferences,
                    parallelAlgorithmWork,
                    workEncoding,
                    parallelAlgorithmWorkReferences,
                    workEfficiencyReference,
                    parameterDefinitions,
                    preferredParameter,
                    timeComplexityReference,
                    derivedTimeComplexity,
                    computationalModel,
                    modelEncoding,
                    unitOfSpace,
                    spaceComplexityClass,
                    paramSpaceClass,
                    spaceComplexityAuxiliary,
                    spaceComplexityReference,
                    derivedSpaceComplexity,
                    spaceComplexityInOriginalPaper,
                    interestingSpaceComplexity,
                    randomized,
                    typeOfRandomizedAlgorithm,
                    approximate,
                    approximationFactor,
                    heuristicBased,
                    parallel,
                    numberOfProcessors,
                    numberOfProcessorsEncoding,
                    quantum,
                    gpuBased,
                    otherReferences,
                    problemStatement,
                    title,
                    authors,
                    notes,
                    reviewed
                ) VALUES (
                    $name,
                    $problemId,
                    $algorithmDescription,
                    $finalCall,
                    $exactProblemStatement,
                    $exactAlgorithm,
                    $timeComplexityAverage,
                    $averageCaseDistribution,
                    $reference,
                    $year,
                    $paperReferenceLink,
                    $constants,
                    $derived,
                    $paperReferenceForConstants,
                    $timeComplexityImprovement,
                    $transitionClass,
                    $timeComplexityClass,
                    $paramTimeClass,
                    $timeComplexityWorstOnly,
                    $parallelAlgorithmSpanDepth,
                    $spanEncoding,
                    $parallelAlgorithmSpanReferences,
                    $parallelAlgorithmWork,
                    $workEncoding,
                    $parallelAlgorithmWorkReferences,
                    $workEfficiencyReference,
                    $parameterDefinitions,
                    $preferredParameter,
                    $timeComplexityReference,
                    $derivedTimeComplexity,
                    $computationalModel,
                    $modelEncoding,
                    $unitOfSpace,
                    $spaceComplexityClass,
                    $paramSpaceClass,
                    $spaceComplexityAuxiliary,
                    $spaceComplexityReference,
                    $derivedSpaceComplexity,
                    $spaceComplexityInOriginalPaper,
                    $interestingSpaceComplexity,
                    $randomized,
                    $typeOfRandomizedAlgorithm,
                    $approximate,
                    $approximationFactor,
                    $heuristicBased,
                    $parallel,
                    $numberOfProcessors,
                    $numberOfProcessorsEncoding,
                    $quantum,
                    $gpuBased,
                    $otherReferences,
                    $problemStatement,
                    $title,
                    $authors,
                    $notes,
                    $reviewed
                )
            `).run(algorithmData);
            }
        }
        if (notFound.length > 0) {
            const header = 'family;variation;algorithm\n';
            fs.writeFileSync('reportAlgorithmsNotFound.csv', header + notFound.map(a => `${a.family};${a.variation};${a.algorithm}`).join('\n'));
        }
    }

    function populateCountings() {
        // for each variation, count the number of algorithms
        const problems = db.prepare(`SELECT id, variation FROM problems`).all();
        for (const problem of problems) {

            const algorithms = db.prepare(`SELECT COUNT(*) FROM algorithms WHERE problemId = $problemId`).get({ problemId: problem.id }).count;
            db.prepare(`UPDATE problems SET numberOfAlgorithms = $algorithms WHERE id = $id`).run({ id: problem.id, algorithms: algorithms });
        }
        // for each family, count the number of variations and the number of algorithms
        const families = db.prepare(`SELECT DISTINCT family FROM problems`).all();
        for (const family of families) {
            const variations = db.prepare(`SELECT COUNT(*) FROM problems WHERE family = $family`).get(family).count;
            const algorithms = db.prepare(`SELECT COUNT(*) FROM problems JOIN algorithms ON problems.id = algorithms.problemId WHERE family = $family`).get(family).count;
            db.prepare(`UPDATE problems SET numberOfVariations = $variations, numberOfAlgorithms = $algorithms WHERE family = $family`).run({ family: family.family, variations: variations, algorithms: algorithms });
        }
        // for each domain, count the number of families, the number of variations and the number of algorithms
        const domains = db.prepare(`SELECT DISTINCT domain FROM problems`).all();
        for (const domain of domains) {
            const families = db.prepare(`SELECT COUNT(DISTINCT family) FROM problems WHERE domain = $domain`).get(domain).count;
            const variations = db.prepare(`SELECT COUNT(*) FROM problems WHERE domain = $domain`).get(domain).count;
            const algorithms = db.prepare(`SELECT COUNT(*) FROM problems JOIN algorithms ON problems.id = algorithms.problemId WHERE domain = $domain`).get(domain).count;
            db.prepare(`UPDATE problems SET numberOfFamilies = $families, numberOfVariations = $variations, numberOfAlgorithms = $algorithms WHERE domain = $domain`).run({ domain: domain.domain, families: families, variations: variations, algorithms: algorithms });
        }
    }

    function populateReductions() {
        // delete reportReductionsNotFound.csv if exists
        if (fs.existsSync('reportReductionsNotFound.csv')) {
            fs.unlinkSync('reportReductionsNotFound.csv');
        }
        const notFound = []

        const reductions = JSON.parse(JSON.stringify(reductionsSheet));
        for (const reduction of reductions) {
            reduction.fromProblemId = db.prepare(`SELECT id FROM problems WHERE variationSlug = $fromVariation OR 
            (
                aliasSlug LIKE $fromVariation1 
                OR aliasSlug LIKE $fromVariation2 
                OR aliasSlug LIKE $fromVariation3 
                OR aliasSlug LIKE $fromVariation
            ) LIMIT 1`).get({
                fromVariation: slugfy(reduction.fromVariation),
                fromVariation1: `${slugfy(reduction.fromVariation)};%`,
                fromVariation2: `%;${slugfy(reduction.fromVariation)};%`,
                fromVariation3: `%;${slugfy(reduction.fromVariation)}`,
            })?.id;


            // if not found create a new problem with the family and variation
            if (!reduction.fromProblemId) {
                reduction.fromProblemId = db.prepare(`
                INSERT INTO problems (family, variation, familySlug, variationSlug) VALUES ($family, $variation, $familySlug, $variationSlug)
            `).run({
                    family: reduction.fromProblem,
                    variation: reduction.fromVariation,
                    familySlug: slugfy(reduction.fromProblem),
                    variationSlug: slugfy(reduction.fromVariation)
                }).lastInsertRowid;
            }

            reduction.toProblemId = db.prepare(`SELECT id FROM problems WHERE variationSlug = $toVariation OR 
            (
                aliasSlug LIKE $toVariation1 
                OR aliasSlug LIKE $toVariation2 
                OR aliasSlug LIKE $toVariation3 
                OR aliasSlug LIKE $toVariation
            ) LIMIT 1`).get({
                toVariation: slugfy(reduction.toVariation),
                toVariation1: `${slugfy(reduction.toVariation)};%`,
                toVariation2: `%;${slugfy(reduction.toVariation)};%`,
                toVariation3: `%;${slugfy(reduction.toVariation)}`,
            })?.id;
            if (!reduction.toProblemId) {
                reduction.toProblemId = db.prepare(`
                INSERT INTO problems (family, variation, familySlug, variationSlug) VALUES ($family, $variation, $familySlug, $variationSlug)
            `).run({
                    family: reduction.toProblem,
                    variation: reduction.toVariation,
                    familySlug: slugfy(reduction.toProblem),
                    variationSlug: slugfy(reduction.toVariation)
                }).lastInsertRowid;
            }




            if (reduction.fromProblemId && reduction.toProblemId) {
                reduction.reductionReferences = reduction.references
                db.prepare(`
                INSERT INTO reductions (
                    fromProblemId,
                    toProblemId,
                    type,
                    randomized,
                    calls,
                    timeComplexity,
                    spaceComplexity,
                    model,
                    assumptionHypothesis,
                    implications,
                    impliedLowerBoundPower,
                    reductionReferences,
                    link,
                    year,
                    preserves,
                    notes,
                    reductionId,
                    description
                ) VALUES (
                    $fromProblemId,
                    $toProblemId,
                    $type,
                    $randomized,
                    $calls,
                    $timeComplexity,
                    $spaceComplexity,
                    $model,
                    $assumptionHypothesis,
                    $implications,
                    $impliedLowerBoundPower,
                    $reductionReferences,
                    $link,
                    $year,
                    $preserves,
                    $notes,
                    $reductionId,
                    $description
                )
            `).run(reduction);
            }
        }
        if (notFound.length > 0) {
            const header = 'from;top;missing\n';
            fs.writeFileSync('reportReductionsNotFound.csv', header + notFound.map(a => `${a.from};${a.to};${a.missing}`).join('\n'));
        }


    }

    function populateHypotheses() {
        const hypotheses = JSON.parse(JSON.stringify(assumptionsHypotheses));
        for (const hypothesis of hypotheses) {
            hypothesis.targetProblemId = db.prepare(`SELECT id FROM problems WHERE variationSlug = $variation OR 
            (
                aliasSlug LIKE $variation1
                OR aliasSlug LIKE $variation2
                OR aliasSlug LIKE $variation3
                OR aliasSlug LIKE $variation
            ) LIMIT 1`).get({
                variation: slugfy(hypothesis.target),
                variation1: `${slugfy(hypothesis.target)};%`,
                variation2: `%;${slugfy(hypothesis.target)};%`,
                variation3: `%;${slugfy(hypothesis.target)}`,
            })?.id;

            if (!hypothesis.targetProblemId) {
                continue;
            }

            db.prepare(`
            INSERT INTO hypothesis (
                targetProblemId,
                name,
                alias,
                hypothesisId,
                description,
                time,
                space,
                computationModel,
                constants,
                implies,
                impliedBy,
                proven,
                impliesReferences,
                impliedByReferences,
                reference,
                year,
                notes
            ) VALUES (
                $targetProblemId,
                $name,
                $alias,
                $hypothesisId,
                $description,
                $time,
                $space,
                $computationModel,
                $constants,
                $implies,
                $impliedBy,
                $proven,
                $impliesReferences,
                $impliedByReferences,
                $reference,
                $year,
                $notes
            )
        `).run(hypothesis);
        }
    }

    function populateGlossary() {
        const glossaryData = JSON.parse(JSON.stringify(glossary));
        for (const glossary of glossaryData) {
            db.prepare(`
            INSERT INTO glossary (
                term,
                definition,
                category
            ) VALUES (
                $term,
                $definition,
                $category
            )
        `).run(glossary);
        }
    }

    function createFTSVirtualTableForSearch() {
        // drop it if exists
        db.prepare(`DROP TABLE IF EXISTS search_fts`).run();

        db.prepare(`
        CREATE VIRTUAL TABLE search_fts USING fts5(
             domain,
            family,
            variation,
            algorithm,
            domainSlug UNINDEXED,
            familySlug UNINDEXED,
            variationSlug UNINDEXED,
            numberOfAlgorithms UNINDEXED,
            numberOfVariations UNINDEXED,
            numberOfFamilies UNINDEXED
            

        );
        `).run();

        // insert domains
        db.prepare(`INSERT INTO search_fts (domain, domainSlug) SELECT  domain, domainSlug FROM problems GROUP BY domainSlug`).run();
        // insert families
        db.prepare(`INSERT INTO search_fts (domain, family, domainSlug, familySlug) SELECT domain, family, domainSlug, familySlug FROM problems GROUP BY domainSlug, familySlug`).run();
        // insert variations
        db.prepare(`INSERT INTO search_fts (domain, family, variation, domainSlug, familySlug, variationSlug) SELECT domain, family, variation, domainSlug, familySlug, variationSlug FROM problems GROUP BY domainSlug, familySlug, variationSlug `).run();
        // insert algorithms
        db.prepare(`INSERT INTO search_fts (
        domain,
        family,
        variation,
        algorithm,
        domainSlug,
        familySlug,
        variationSlug
        
    ) SELECT 
        problems.domain,
        problems.family,
        problems.variation,
        algorithms.name,
        problems.domainSlug,
        problems.familySlug,
        problems.variationSlug
    FROM algorithms
    JOIN problems ON problems.id = algorithms.problemId`).run();
    }


    function createMetaInformation() {
        db.prepare(`
        CREATE TABLE IF NOT EXISTS metaInformation (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            datetime TEXT
        )
    `).run();
        db.prepare(`INSERT INTO metaInformation (datetime) VALUES (datetime('now'))`).run();
        console.log(`Database created at ${db.prepare(`SELECT datetime FROM metaInformation`).get().datetime}`)
    }


    function dropAllTables(){


        db.prepare(`DROP TABLE IF EXISTS algorithms`).run();
        db.prepare(`DROP TABLE IF EXISTS reductions`).run();
        db.prepare(`DROP TABLE IF EXISTS hypothesis`).run();
        db.prepare(`DROP TABLE IF EXISTS glossary`).run();
        db.prepare(`DROP TABLE IF EXISTS metaInformation`).run();
        db.prepare(`DROP TABLE IF EXISTS search_fts`).run();
        db.prepare(`DROP TABLE IF EXISTS search_fts_data`).run();
        db.prepare(`DROP TABLE IF EXISTS search_fts_idx`).run();
        db.prepare(`DROP TABLE IF EXISTS search_fts_config`).run();
        db.prepare(`DROP TABLE IF EXISTS search_fts_docsize`).run();
        db.prepare(`DROP TABLE IF EXISTS search_fts_content`).run();
        db.prepare(`DROP TABLE IF EXISTS problems`).run();
        db.prepare(`DELETE FROM sqlite_sequence`).run();


    }
    db.transaction(() => {
        dropAllTables()
        createTables()
        populateProblems()
        populateReductions()
        fillEmptyDomains()
        fillParentProblem()
        populateAlgorithms()
        populateHypotheses()
        populateCountings()
        populateGlossary()
        createMetaInformation()
        createFTSVirtualTableForSearch()
    })();


    // // rename the temp database to the final name
    // fs.renameSync('algowiki-temp.db', 'algowiki.db');
    // if (fs.existsSync(`algowiki-temp.db-shm`)) fs.renameSync('algowiki-temp.db-shm', 'algowiki.db-shm');
    // if (fs.existsSync(`algowiki-temp.db-wal`)) fs.renameSync('algowiki-temp.db-wal', 'algowiki.db-wal');
    // db.close();


}