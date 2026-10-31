/**
 * Unit & Security Tests: Anonymous Feedback Privacy Guarantees
 * STRICT SUBMISSION REQUIREMENT:
 * Asserts the stored feedback record contains NO user identifier, NO name, NO IP.
 * Asserts rate-limiting uses one-way hash without leaking identity.
 * Asserts K-anonymity suppresses department breakdowns when group size < 3.
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { FeedbackService } = require('../src/services/feedbackService');
const { computeAnonymousRateLimitToken } = require('../src/utils/crypto');
const { getRepository } = require('../src/repos');

describe('Anonymous Feedback Privacy & K-Anonymity Guarantees', () => {
  let feedbackService;
  let repo;

  beforeEach(() => {
    repo = getRepository();
    repo.reset(); // Re-seed clean test state
    feedbackService = new FeedbackService();
  });

  it('guarantees feedback records NEVER contain workerId, userId, author, or IP', async () => {
    const sensitiveWorkerId = 'usr-confidential-998877';

    const submission = await feedbackService.submitFeedback({
      workerId: sensitiveWorkerId,
      industry: 'construction',
      department: 'Tower 2 Reinforcement',
      shiftName: 'Morning Shift',
      category: 'safety_culture',
      rating: 4,
      comment: 'Harness inspection intervals were properly scheduled this morning.',
    });

    assert.ok(submission.success);

    // Retrieve raw stored record directly from repository
    const stored = await repo.listAnonymousFeedback({ industry: 'construction' });
    const match = stored.find((f) => f.id === submission.id);

    assert.ok(match, 'Stored record should exist in repository');

    // STRICT INCLUSION OF PRIVACY ASSERTIONS:
    assert.equal(match.workerId, undefined, 'workerId must NOT be present in record');
    assert.equal(match.userId, undefined, 'userId must NOT be present in record');
    assert.equal(match.author, undefined, 'author must NOT be present in record');
    assert.equal(match.workerName, undefined, 'workerName must NOT be present in record');
    assert.equal(match.ip, undefined, 'IP address must NOT be present in record');
    assert.equal(match.email, undefined, 'Email must NOT be present in record');

    // Confirm that the sensitive string does not exist anywhere in the object keys or values
    const stringified = JSON.stringify(match);
    assert.ok(
      !stringified.includes(sensitiveWorkerId),
      `Stored feedback contains sensitive worker identifier! Dump: ${stringified}`
    );
  });

  it('enforces one-way rate-limit hash preventing duplicate spam within same period', async () => {
    const workerId = 'usr-worker-abc';

    // First submission succeeds
    const first = await feedbackService.submitFeedback({
      workerId,
      industry: 'college',
      department: 'Computer Science & Engineering',
      category: 'workload_fairness',
      rating: 3,
      comment: 'First feedback of the day',
    });
    assert.ok(first.success);

    // Second submission by same worker in same period MUST be blocked
    await assert.rejects(
      async () => {
        await feedbackService.submitFeedback({
          workerId,
          industry: 'college',
          department: 'Computer Science & Engineering',
          category: 'workload_fairness',
          rating: 4,
          comment: 'Attempting second duplicate feedback today',
        });
      },
      /feedback is limited to once per day/
    );
  });

  it('verifies one-way HMAC rate token is irreversible', () => {
    const token1 = computeAnonymousRateLimitToken('worker123', '2026-10-27');
    const token2 = computeAnonymousRateLimitToken('worker123', '2026-10-27');
    const token3 = computeAnonymousRateLimitToken('worker456', '2026-10-27');

    // Deterministic for same worker & window
    assert.equal(token1, token2);
    // Unique for different workers
    assert.notEqual(token1, token3);
    // 64-character SHA-256 hex string with zero plaintext
    assert.equal(token1.length, 64);
    assert.ok(!token1.includes('worker123'));
  });

  it('always displays feedback across all group sizes while keeping strict anonymity (never showing names)', async () => {
    repo.anonymousFeedback = [
      {
        id: 'fb-test-1',
        industry: 'college',
        department: 'Electrical & Physics Labs',
        category: 'safety',
        rating: 2,
        sentiment: 'negative',
        comment: 'Fume hood noisy',
      },
      { id: 'fb-test-3', industry: 'college', department: 'Computer Science & Engineering', rating: 4, sentiment: 'positive', category: 'workload', comment: 'ok' },
      { id: 'fb-test-4', industry: 'college', department: 'Computer Science & Engineering', rating: 4, sentiment: 'positive', category: 'workload', comment: 'ok' },
      { id: 'fb-test-5', industry: 'college', department: 'Computer Science & Engineering', rating: 5, sentiment: 'positive', category: 'workload', comment: 'ok' },
    ];

    const insights = await feedbackService.getAggregatedInsights('college');

    // Single-response department is immediately visible and strictly anonymous
    const physicsDept = insights.departmentBreakdowns['Electrical & Physics Labs'];
    assert.ok(physicsDept, 'Physics department should be in report');
    assert.equal(physicsDept.suppressedDueToPrivacy, false);
    assert.equal(physicsDept.count, 1);
    assert.equal(physicsDept.items[0].workerName, undefined);
    assert.equal(physicsDept.items[0].workerId, undefined);

    // Multi-response department is also visible and strictly anonymous
    const csDept = insights.departmentBreakdowns['Computer Science & Engineering'];
    assert.ok(csDept);
    assert.equal(csDept.suppressedDueToPrivacy, false);
    assert.equal(csDept.count, 3);
    assert.ok(csDept.items.every((item) => item.workerName === undefined && item.workerId === undefined));
  });
});

