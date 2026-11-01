/**
 * Grievance & Safety Incident Reporting Service
 * Multi-channel safety reporting (Text / Voice STT), photo attachment,
 * and 4-stage transparent status tracking (Submitted -> Acknowledged -> In Progress -> Resolved).
 */

const { getRepository } = require('../repos');
const { getIndustryConfig } = require('../config/industries');

const VALID_STATUSES = ['Submitted', 'Acknowledged', 'In Progress', 'Resolved'];
const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical'];

class GrievanceService {
  constructor() {
    this.repo = getRepository();
  }

  /**
   * Submit a new grievance or hazard report
   * @param {object} params
   * @param {string} params.workerId
   * @param {string} params.title
   * @param {string} params.description
   * @param {string} params.category
   * @param {string} [params.severity]
   * @param {string} [params.photoUrl] - Optional base64/SVG data URI
   * @param {boolean} [params.voiceInputUsed]
   * @returns {Promise<object>} Created grievance record
   */
  async submitGrievance({
    workerId,
    title,
    description,
    category,
    severity = 'medium',
    photoUrl = null,
    voiceInputUsed = false,
  }) {
    if (!title || !description || !category) {
      throw new Error('Title, description, and category are required.');
    }

    const user = await this.repo.findUserById(workerId);
    if (!user) throw new Error('Worker not found');

    const industryConfig = getIndustryConfig(user.industry);
    const categoryDef = industryConfig.hazardCategories.find((c) => c.id === category);

    const safeSeverity = VALID_SEVERITIES.includes(severity)
      ? severity
      : categoryDef
      ? categoryDef.severityDefault
      : 'medium';

    // Validate photoUrl size to avoid unbounded memory usage (max 1.5MB data URI)
    if (photoUrl && photoUrl.length > 2 * 1024 * 1024) {
      throw new Error('Photo attachment exceeds maximum allowable size (1.5MB).');
    }

    const grievance = await this.repo.createGrievance({
      industry: user.industry,
      department: user.department,
      workerId: user.id,
      workerName: 'Anonymous Worker',
      category,
      categoryLabel: categoryDef ? categoryDef.label : category,
      severity: safeSeverity,
      title: title.trim(),
      description: description.trim(),
      photoUrl,
      voiceInputUsed: Boolean(voiceInputUsed),
    });

    return grievance;
  }

  /**
   * List grievances for worker or admin (strictly anonymizing worker identity)
   * @param {object} user - Requesting user
   * @param {object} [filters]
   * @returns {Promise<Array<object>>}
   */
  async listGrievances(user, filters = {}) {
    const query = { industry: user.industry, ...filters };
    if (user.role === 'worker') {
      // Workers only see their own grievances for privacy
      query.workerId = user.id;
    }
    const items = await this.repo.listGrievances(query);
    return items.map((g) => {
      const copy = { ...g, workerName: 'Anonymous Worker' };
      if (user.role === 'admin') {
        delete copy.workerId;
      }
      return copy;
    });
  }

  /**
   * Get single grievance details
   * @param {string} id
   * @param {object} user
   * @returns {Promise<object>}
   */
  async getGrievanceById(id, user) {
    const grv = await this.repo.findGrievanceById(id);
    if (!grv) throw new Error('Grievance not found');

    // Access control: worker can only inspect their own
    if (user.role === 'worker' && grv.workerId !== user.id) {
      throw new Error('Unauthorized access to grievance record.');
    }

    return grv;
  }

  /**
   * Update grievance status and append official administrative reply
   * @param {string} id
   * @param {string} status
   * @param {object} adminUser
   * @param {string} [replyMessage]
   * @returns {Promise<object>}
   */
  async updateStatus(id, status, adminUser, replyMessage = null) {
    if (adminUser.role !== 'admin') {
      throw new Error('Forbidden: Only administrators can update grievance status.');
    }

    if (!VALID_STATUSES.includes(status)) {
      throw new Error(`Invalid status '${status}'. Must be one of: ${VALID_STATUSES.join(', ')}`);
    }

    const replyMeta = replyMessage
      ? {
          author: adminUser.name,
          authorRole: adminUser.roleTitle || 'Supervisor',
          message: replyMessage.trim(),
        }
      : null;

    const updated = await this.repo.updateGrievanceStatus(id, status, replyMeta);
    if (!updated) throw new Error('Grievance not found');

    return updated;
  }
}

module.exports = {
  GrievanceService,
  VALID_STATUSES,
  VALID_SEVERITIES,
};

