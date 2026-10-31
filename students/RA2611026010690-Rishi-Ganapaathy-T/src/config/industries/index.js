/**
 * FairShift Industry Configuration Loader
 * Dynamically loads and switches industry profiles without hardcoding.
 */

const construction = require('./construction.json');
const college = require('./college.json');

const industries = {
  construction,
  college,
};

function getIndustryConfig(industryId) {
  const selected = (industryId || process.env.ACTIVE_INDUSTRY || 'construction').toLowerCase();
  return industries[selected] || industries.construction;
}

function listIndustries() {
  return Object.values(industries).map((ind) => ({
    id: ind.id,
    name: ind.name,
    icon: ind.icon,
    siteCode: ind.siteCode,
    terminology: ind.terminology,
    rolesCount: ind.roles.length,
    shiftsCount: ind.shifts.length,
    hazardsCount: ind.hazardCategories.length,
  }));
}

module.exports = {
  industries,
  getIndustryConfig,
  listIndustries,
};
