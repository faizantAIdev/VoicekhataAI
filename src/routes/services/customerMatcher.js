const supabase = require('../../config/supabase');
const stringSimilarity = require('string-similarity');

// Remove common speech words and normalize spacing/case
const normalizeName = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/\b(ji|bhai|sir|madam|mr|mrs|ms)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const findCustomerByName = async (userId, personName) => {
  if (!userId || !personName) {
    return {
      status: 'not_found',
      customer: null,
    };
  }

  const searchName = normalizeName(personName);

  // Get all customers belonging to this user
  const { data: customers, error } = await supabase
    .from('customers')
    .select('id, name, mobile')
    .eq('user_id', userId);

  if (error) {
    console.error('Customer Match Error:', error);
    throw error;
  }

  if (!customers || customers.length === 0) {
    return {
      status: 'not_found',
      customer: null,
    };
  }

  // ==========================================
  // 1. EXACT NORMALIZED MATCH
  // ==========================================

  const exactMatch = customers.find((customer) => {
    return normalizeName(customer.name) === searchName;
  });

  if (exactMatch) {
    return {
      status: 'matched',
      customer: exactMatch,
      confidence: 1,
    };
  }

  // ==========================================
  // 2. PARTIAL MATCH
  // ==========================================

  const partialMatches = customers.filter((customer) => {
    const dbName = normalizeName(customer.name);

    return (
      dbName.includes(searchName) ||
      searchName.includes(dbName)
    );
  });

  if (partialMatches.length === 1) {
    return {
      status: 'matched',
      customer: partialMatches[0],
      confidence: 0.9,
    };
  }

  if (partialMatches.length > 1) {
    return {
      status: 'multiple_matches',
      customers: partialMatches,
    };
  }

  // ==========================================
  // 3. FUZZY MATCH
  // ==========================================

  const matches = customers
    .map((customer) => {
      const dbName = normalizeName(customer.name);

      return {
        customer,
        score: stringSimilarity.compareTwoStrings(
          searchName,
          dbName
        ),
      };
    })
    .sort((a, b) => b.score - a.score);

  const bestMatch = matches[0];

  // Strong match
  if (bestMatch && bestMatch.score >= 0.75) {
    return {
      status: 'matched',
      customer: bestMatch.customer,
      confidence: bestMatch.score,
    };
  }

  // Possible match — ask user
  if (bestMatch && bestMatch.score >= 0.55) {
    return {
      status: 'possible_match',
      customer: bestMatch.customer,
      confidence: bestMatch.score,
    };
  }

  // No useful match
  return {
    status: 'not_found',
    customer: null,
  };
};

module.exports = {
  findCustomerByName,
};