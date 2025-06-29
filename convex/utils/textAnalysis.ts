/**
 * Advanced Text Analysis Utilities for Enhanced Content Analysis
 *
 * This module provides sophisticated text processing capabilities including:
 * - TF-IDF scoring for term importance weighting
 * - Stemming and lemmatization for word variation handling
 * - Stop word filtering for noise reduction
 * - Keyword extraction for concept identification
 * - Semantic similarity analysis
 * - Domain-specific terminology recognition
 */

// Common stop words in multiple languages
const STOP_WORDS = {
	de: new Set([
		"der",
		"die",
		"und",
		"in",
		"den",
		"von",
		"zu",
		"das",
		"mit",
		"sich",
		"des",
		"auf",
		"für",
		"ist",
		"im",
		"dem",
		"nicht",
		"ein",
		"eine",
		"als",
		"auch",
		"es",
		"an",
		"werden",
		"aus",
		"er",
		"hat",
		"dass",
		"sie",
		"nach",
		"wird",
		"bei",
		"einer",
		"um",
		"am",
		"sind",
		"noch",
		"wie",
		"einem",
		"über",
		"einen",
		"so",
		"zum",
		"war",
		"haben",
		"nur",
		"oder",
		"aber",
		"vor",
		"zur",
		"bis",
		"mehr",
		"durch",
		"man",
		"sein",
		"wurde",
		"sei",
		"in",
	]),
	en: new Set([
		"a",
		"an",
		"and",
		"are",
		"as",
		"at",
		"be",
		"by",
		"for",
		"from",
		"has",
		"he",
		"in",
		"is",
		"it",
		"its",
		"of",
		"on",
		"that",
		"the",
		"to",
		"was",
		"will",
		"with",
		"the",
		"this",
		"but",
		"they",
		"have",
		"had",
		"what",
		"said",
		"each",
		"which",
		"she",
		"do",
		"how",
		"their",
		"if",
		"up",
		"out",
		"many",
		"then",
		"them",
		"these",
		"so",
		"some",
		"her",
		"would",
		"make",
		"like",
		"into",
		"him",
		"time",
		"two",
		"more",
		"go",
		"no",
		"way",
		"could",
		"my",
		"than",
		"first",
		"been",
		"call",
		"who",
		"oil",
		"sit",
		"now",
		"find",
		"down",
		"day",
		"did",
		"get",
		"come",
		"made",
		"may",
		"part",
	]),
};

// Common word endings for basic stemming
const STEMMING_RULES = {
	de: [
		{ replacement: "", suffix: "en" },
		{ replacement: "", suffix: "er" },
		{ replacement: "", suffix: "est" },
		{ replacement: "", suffix: "em" },
		{ replacement: "", suffix: "es" },
	],
	en: [
		{ replacement: "y", suffix: "ies" },
		{ replacement: "y", suffix: "ied" },
		{ replacement: "y", suffix: "ying" },
		{ replacement: "", suffix: "ing" },
		{ replacement: "", suffix: "ly" },
		{ replacement: "", suffix: "ed" },
		{ replacement: "y", suffix: "ies" },
		{ replacement: "y", suffix: "ied" },
		{ replacement: "y", suffix: "ies" },
		{ replacement: "y", suffix: "ies" },
		{ replacement: "", suffix: "s" },
	],
};

// Domain-specific terminology patterns
const DOMAIN_PATTERNS = {
	// Historical terms
	history:
		/\b(century|dynasty|empire|revolution|war|treaty|constitution|democracy|monarchy|republic|feudalism|renaissance|enlightenment|industrial|colonial|independence|civilization)\b/gi,

	// Language learning terms
	language:
		/\b(grammar|syntax|vocabulary|pronunciation|conjugation|declension|tense|aspect|mood|voice|case|gender|number|person|article|preposition|conjunction|adjective|adverb|noun|verb)\b/gi,
	// Mathematical terms
	math: /\b(equation|formula|theorem|proof|derivative|integral|matrix|vector|function|variable|constant|coefficient|polynomial|logarithm|exponential|trigonometric|calculus|algebra|geometry|statistics|probability)\b/gi,

	// Scientific terms
	science:
		/\b(hypothesis|theory|experiment|observation|analysis|molecule|atom|element|compound|reaction|catalyst|enzyme|protein|DNA|RNA|cell|organism|species|evolution|photosynthesis|respiration)\b/gi,

	// Technical terms
	tech: /\b(algorithm|function|variable|parameter|method|class|object|interface|database|server|client|API|framework|library|protocol|encryption|authentication|optimization|debugging)\b/gi,
};

export interface ProcessedText {
	originalText: string;
	cleanedText: string;
	tokens: string[];
	stemmedTokens: string[];
	keywords: string[];
	domainTerms: { [domain: string]: string[] };
	tfIdfScores: { [term: string]: number };
	conceptualTerms: string[];
}

export interface SimilarityResult {
	score: number;
	sharedTerms: string[];
	sharedKeywords: string[];
	sharedDomainTerms: string[];
	contextualSimilarity: number;
	semanticSimilarity: number;
}

/**
 * Process text with advanced analysis techniques
 */
export function processText(
	text: string,
	language: "en" | "de" = "en",
): ProcessedText {
	const originalText = text;

	// Clean and normalize text
	const cleanedText = text
		.toLowerCase()
		.replace(/[^\w\s]/g, " ") // Remove punctuation
		.replace(/\s+/g, " ") // Normalize whitespace
		.trim();

	// Tokenize
	const tokens = cleanedText
		.split(/\s+/)
		.filter((token) => token.length > 2) // Remove very short tokens
		.filter((token) => !STOP_WORDS[language].has(token)); // Remove stop words

	// Apply stemming
	const stemmedTokens = tokens.map((token) => stemWord(token, language));

	// Extract keywords (terms that appear frequently and are not common words)
	const keywords = extractKeywords(tokens, language);

	// Identify domain-specific terms
	const domainTerms = extractDomainTerms(originalText);

	// Calculate TF-IDF scores (simplified version for single document)
	const tfIdfScores = calculateTfIdf(tokens);

	// Identify conceptual terms (longer phrases, technical terms, etc.)
	const conceptualTerms = extractConceptualTerms(originalText);

	return {
		cleanedText,
		conceptualTerms,
		domainTerms,
		keywords,
		originalText,
		stemmedTokens,
		tfIdfScores,
		tokens,
	};
}

/**
 * Basic stemming implementation
 */
function stemWord(word: string, language: "en" | "de"): string {
	const rules = STEMMING_RULES[language];

	for (const rule of rules) {
		if (word.endsWith(rule.suffix) && word.length > rule.suffix.length + 2) {
			return word.slice(0, -rule.suffix.length) + rule.replacement;
		}
	}

	return word;
}

/**
 * Extract keywords based on frequency and importance
 */
function extractKeywords(tokens: string[], _language: "en" | "de"): string[] {
	const frequency: { [word: string]: number } = {};

	// Count frequencies
	for (const token of tokens) {
		frequency[token] = (frequency[token] || 0) + 1;
	}

	// Sort by frequency and filter for meaningful terms
	return Object.entries(frequency)
		.filter(([word, freq]) => freq >= 1 && word.length > 3) // Changed from > 1 to >= 1
		.sort(([, a], [, b]) => b - a)
		.slice(0, 10) // Top 10 keywords
		.map(([word]) => word);
}

/**
 * Extract domain-specific terminology
 */
function extractDomainTerms(text: string): { [domain: string]: string[] } {
	const domainTerms: { [domain: string]: string[] } = {};

	for (const [domain, pattern] of Object.entries(DOMAIN_PATTERNS)) {
		// Use case-insensitive matching since our text is processed in lowercase
		const matches = text.toLowerCase().match(pattern);
		if (matches) {
			domainTerms[domain] = [
				...new Set(matches.map((match) => match.toLowerCase())),
			];
		}
	}

	return domainTerms;
}

/**
 * Calculate TF-IDF scores for terms
 */
function calculateTfIdf(tokens: string[]): { [term: string]: number } {
	const termFreq: { [term: string]: number } = {};
	const totalTerms = tokens.length;

	// Calculate term frequency
	for (const token of tokens) {
		termFreq[token] = (termFreq[token] || 0) + 1;
	}

	// Calculate TF-IDF (simplified - using log normalization)
	const tfIdf: { [term: string]: number } = {};
	for (const [term, freq] of Object.entries(termFreq)) {
		const tf = freq / totalTerms;
		// Simplified IDF calculation (would normally require document corpus)
		const idf = Math.log(1 + 1 / freq); // Higher score for less frequent terms
		tfIdf[term] = tf * idf;
	}

	return tfIdf;
}

/**
 * Extract conceptual terms (multi-word phrases, technical terms)
 */
function extractConceptualTerms(text: string): string[] {
	const conceptualTerms: string[] = [];

	// Extract quoted terms
	const quotedTerms = text.match(/"([^"]+)"/g);
	if (quotedTerms) {
		conceptualTerms.push(
			...quotedTerms.map((term) => term.replace(/"/g, "").toLowerCase()),
		);
	}

	// Extract capitalized terms (proper nouns, technical terms)
	const capitalizedTerms = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
	if (capitalizedTerms) {
		conceptualTerms.push(...capitalizedTerms.map((term) => term.toLowerCase()));
	}

	// Extract terms with special formatting (e.g., hyphenated terms)
	const hyphenatedTerms = text.match(/\b\w+-\w+\b/g);
	if (hyphenatedTerms) {
		conceptualTerms.push(...hyphenatedTerms.map((term) => term.toLowerCase()));
	}

	return [...new Set(conceptualTerms)];
}

/**
 * Calculate advanced similarity between two processed texts
 */
export function calculateAdvancedSimilarity(
	text1: ProcessedText,
	text2: ProcessedText,
): SimilarityResult {
	// Token-based similarity (Jaccard similarity with stemming)
	const stemmedSet1 = new Set(text1.stemmedTokens);
	const stemmedSet2 = new Set(text2.stemmedTokens);
	const intersection = new Set(
		[...stemmedSet1].filter((x) => stemmedSet2.has(x)),
	);
	const union = new Set([...stemmedSet1, ...stemmedSet2]);
	const tokenSimilarity = intersection.size / union.size;

	// Keyword similarity (weighted by importance)
	const keywordSet1 = new Set(text1.keywords);
	const keywordSet2 = new Set(text2.keywords);
	const sharedKeywords = [...keywordSet1].filter((x) => keywordSet2.has(x));
	const keywordSimilarity =
		sharedKeywords.length /
		Math.max(text1.keywords.length, text2.keywords.length, 1);

	// Domain term similarity
	const sharedDomainTerms: string[] = [];
	let domainSimilarity = 0;
	const allDomains = new Set([
		...Object.keys(text1.domainTerms),
		...Object.keys(text2.domainTerms),
	]);

	for (const domain of allDomains) {
		const terms1 = new Set(text1.domainTerms[domain] || []);
		const terms2 = new Set(text2.domainTerms[domain] || []);
		const sharedInDomain = [...terms1].filter((x) => terms2.has(x));
		sharedDomainTerms.push(...sharedInDomain);

		if (terms1.size > 0 || terms2.size > 0) {
			domainSimilarity +=
				sharedInDomain.length / Math.max(terms1.size, terms2.size);
		}
	}
	domainSimilarity /= Math.max(allDomains.size, 1);

	// TF-IDF weighted similarity
	const tfIdfSimilarity = calculateTfIdfSimilarity(
		text1.tfIdfScores,
		text2.tfIdfScores,
	);

	// Conceptual term similarity
	const conceptSet1 = new Set(text1.conceptualTerms);
	const conceptSet2 = new Set(text2.conceptualTerms);
	const sharedConcepts = [...conceptSet1].filter((x) => conceptSet2.has(x));
	const conceptualSimilarity =
		sharedConcepts.length /
		Math.max(text1.conceptualTerms.length, text2.conceptualTerms.length, 1);

	// Calculate weighted overall similarity
	const contextualSimilarity =
		tokenSimilarity * 0.3 +
		keywordSimilarity * 0.25 +
		domainSimilarity * 0.25 +
		conceptualSimilarity * 0.2;

	const semanticSimilarity =
		tfIdfSimilarity * 0.4 +
		domainSimilarity * 0.35 +
		conceptualSimilarity * 0.25;

	const overallScore = contextualSimilarity * 0.6 + semanticSimilarity * 0.4;

	return {
		contextualSimilarity,
		score: overallScore,
		semanticSimilarity,
		sharedDomainTerms,
		sharedKeywords,
		sharedTerms: [...intersection],
	};
}

/**
 * Calculate TF-IDF based similarity using cosine similarity
 */
function calculateTfIdfSimilarity(
	scores1: { [term: string]: number },
	scores2: { [term: string]: number },
): number {
	const allTerms = new Set([...Object.keys(scores1), ...Object.keys(scores2)]);

	let dotProduct = 0;
	let norm1 = 0;
	let norm2 = 0;

	for (const term of allTerms) {
		const score1 = scores1[term] || 0;
		const score2 = scores2[term] || 0;

		dotProduct += score1 * score2;
		norm1 += score1 * score1;
		norm2 += score2 * score2;
	}

	if (norm1 === 0 || norm2 === 0) return 0;

	return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}
