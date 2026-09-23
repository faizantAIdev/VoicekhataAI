const supabase = require('../../config/supabase');

// ==========================================
// NORMALIZE CUSTOMER NAME
// ==========================================

const normalizeName = (name) => {
  return String(name ?? '')
    .toLowerCase()
    .trim()
    .replace(/\b(ji|bhai|sir|madam|mr|mrs|ms|customer|grahak)\b/g, ' ')
    .replace(/[.,/\\()[\]{}'"`_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

// ==========================================
// FIND CUSTOMER BY NAME
// ==========================================

const findCustomerByName = async (userId, personName) => {
  if (!userId || !personName) {
    return {
      status: 'not_found',
      customer: null,
    };
  }

  const searchName = normalizeName(personName);

  if (!searchName) {
    return {
      status: 'not_found',
      customer: null,
    };
  }

  // ==========================================
  // GET ALL CUSTOMERS FOR THIS USER
  // ==========================================

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

  const exactMatches = customers.filter((customer) => {
    return normalizeName(customer.name) === searchName;
  });

  if (exactMatches.length === 1) {
    return {
      status: 'matched',
      customer: exactMatches[0],
      confidence: 1,
    };
  }

  if (exactMatches.length > 1) {
    return {
      status: 'multiple_matches',
      customers: exactMatches,
      confidence: 1,
    };
  }

  // ==========================================
  // 2. CONTROLLED TOKEN MATCH
  // ==========================================
  // Example:
  //
  // Search: "Rahul Sharma"
  // DB:     "Rahul Sharma Traders"
  //
  // All search tokens must exist in DB name.
  //
  // This is safer than generic partial matching.
  // ==========================================

  const searchTokens = searchName
    .split(' ')
    .filter(Boolean);

  const controlledMatches = customers.filter((customer) => {
    const dbName = normalizeName(customer.name);

    const dbTokens = dbName
      .split(' ')
      .filter(Boolean);

    return searchTokens.every((token) =>
      dbTokens.includes(token)
    );
  });

  if (controlledMatches.length === 1) {
    return {
      status: 'matched',
      customer: controlledMatches[0],
      confidence: 0.95,
    };
  }

  if (controlledMatches.length > 1) {
    return {
      status: 'multiple_matches',
      customers: controlledMatches,
      confidence: 0.9,
    };
  }

  // ==========================================
  // 3. FUZZY MATCH
  // ==========================================
  //
  // IMPORTANT:
  // DO NOT automatically select a customer
  // using fuzzy similarity.
  //
  // A similar name can belong to another person.
  //
  // If you want fuzzy suggestions, return
  // possible_match and let the clarification
  // flow ask the user.
  // ==========================================

  return {
    status: 'not_found',
    customer: null,
  };
};

module.exports = {
  findCustomerByName,
};